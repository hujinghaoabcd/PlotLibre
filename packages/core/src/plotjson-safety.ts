import { PlotJsonError } from "./plotjson-error.js";
import type { JsonValue } from "./types.js";

export interface PlotJsonLimits {
  readonly inputBytes: number;
  readonly depth: number;
  readonly totalNodes: number;
  readonly objectKeys: number;
  readonly stringLength: number;
  readonly features: number;
  readonly controlPointsPerFeature: number;
  readonly totalControlPoints: number;
}

export type PlotJsonLimitName = keyof PlotJsonLimits;

/**
 * Finite guardrails for untrusted PlotJSON input.
 *
 * They are safety defaults rather than product-size or latency guarantees.
 * Applications may provide smaller or larger finite positive safe integers.
 */
export const DEFAULT_PLOTJSON_LIMITS: Readonly<PlotJsonLimits> = Object.freeze({
  inputBytes: 16 * 1024 * 1024,
  depth: 128,
  totalNodes: 1_000_000,
  objectKeys: 250_000,
  stringLength: 1_000_000,
  features: 100_000,
  controlPointsPerFeature: 10_000,
  totalControlPoints: 1_000_000,
});

export interface PlotJsonScanStatistics {
  readonly totalNodes: number;
  readonly objectKeys: number;
  readonly maximumDepth: number;
  readonly maximumStringLength: number;
  readonly features: number;
  readonly maximumControlPointsPerFeature: number;
  readonly totalControlPoints: number;
}

export interface ClonePlotJsonValueOptions {
  readonly limits?: Partial<PlotJsonLimits>;
  readonly path?: string;
}

export interface ClonedPlotJsonValue {
  readonly value: JsonValue;
  readonly statistics: PlotJsonScanStatistics;
  readonly limits: Readonly<PlotJsonLimits>;
}

type MutableJsonObject = Record<string, JsonValue>;
type MutableJsonArray = JsonValue[];
type ContainerRole =
  | "root"
  | "features-array"
  | "feature-entry"
  | "control-points-array"
  | "other";

type Assignment =
  | { readonly kind: "root"; readonly target: { value?: JsonValue } }
  | {
      readonly kind: "array";
      readonly target: MutableJsonArray;
      readonly index: number;
    }
  | {
      readonly kind: "object";
      readonly target: MutableJsonObject;
      readonly key: string;
    };

interface VisitFrame {
  readonly kind: "visit";
  readonly source: unknown;
  readonly assignment: Assignment;
  readonly path: string;
  readonly depth: number;
  readonly role: ContainerRole;
}

interface ExitFrame {
  readonly kind: "exit";
  readonly source: object;
}

type Frame = VisitFrame | ExitFrame;

interface MutableStatistics {
  totalNodes: number;
  objectKeys: number;
  maximumDepth: number;
  maximumStringLength: number;
  features: number;
  maximumControlPointsPerFeature: number;
  totalControlPoints: number;
}

const LIMIT_NAMES = Object.freeze([
  "inputBytes",
  "depth",
  "totalNodes",
  "objectKeys",
  "stringLength",
  "features",
  "controlPointsPerFeature",
  "totalControlPoints",
] as const satisfies readonly PlotJsonLimitName[]);

/** Validates and freezes a complete limit set. */
export function resolvePlotJsonLimits(
  overrides: Partial<PlotJsonLimits> = {},
): Readonly<PlotJsonLimits> {
  const resolved = {} as Record<PlotJsonLimitName, number>;
  for (const name of LIMIT_NAMES) {
    const value = overrides[name] ?? DEFAULT_PLOTJSON_LIMITS[name];
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new PlotJsonError(
        "PLOTJSON_RESOURCE_LIMIT_EXCEEDED",
        `PlotJSON limit "${name}" must be a finite positive safe integer.`,
        { limitName: name, actual: value },
      );
    }
    resolved[name] = value;
  }
  return Object.freeze(resolved as unknown as PlotJsonLimits);
}

/** Returns UTF-8 byte size and rejects a string beyond the configured limit. */
export function assertPlotJsonInputSize(
  input: string,
  limits: Partial<PlotJsonLimits> = {},
): number {
  const resolved = resolvePlotJsonLimits(limits);
  const bytes = new TextEncoder().encode(input).byteLength;
  if (bytes > resolved.inputBytes) {
    throw limitExceeded("inputBytes", resolved.inputBytes, bytes, "$" );
  }
  return bytes;
}

/**
 * Validates and deep-clones untrusted JSON-like data without invoking accessors.
 *
 * Traversal is iterative, object keys are visited lexicographically, cycles are
 * rejected, and repeated non-cyclic references are cloned independently.
 */
export function clonePlotJsonValue(
  input: unknown,
  options: ClonePlotJsonValueOptions = {},
): ClonedPlotJsonValue {
  const limits = resolvePlotJsonLimits(options.limits);
  const rootPath = options.path ?? "$";
  if (rootPath.length === 0) {
    throw new PlotJsonError(
      "PLOTJSON_CURRENT_SCHEMA_INVALID",
      "PlotJSON root path must not be empty.",
    );
  }

  const root: { value?: JsonValue } = {};
  const statistics: MutableStatistics = {
    totalNodes: 0,
    objectKeys: 0,
    maximumDepth: 0,
    maximumStringLength: 0,
    features: 0,
    maximumControlPointsPerFeature: 0,
    totalControlPoints: 0,
  };
  const activeAncestors = new Set<object>();
  const stack: Frame[] = [{
    kind: "visit",
    source: input,
    assignment: { kind: "root", target: root },
    path: rootPath,
    depth: 0,
    role: "root",
  }];

  while (stack.length > 0) {
    const frame = stack.pop()!;
    if (frame.kind === "exit") {
      activeAncestors.delete(frame.source);
      continue;
    }

    registerNode(statistics, limits, frame.path, frame.depth);
    const source = frame.source;

    if (source === null) {
      assign(frame.assignment, null);
      continue;
    }
    switch (typeof source) {
      case "string":
        registerString(statistics, limits, source, frame.path);
        assign(frame.assignment, source);
        continue;
      case "boolean":
        assign(frame.assignment, source);
        continue;
      case "number":
        if (!Number.isFinite(source)) {
          throw nonJson(frame.path, "numbers must be finite");
        }
        assign(frame.assignment, source);
        continue;
      case "undefined":
      case "bigint":
      case "symbol":
      case "function":
        throw nonJson(frame.path, `${typeof source} values are not JSON`);
      case "object":
        break;
      default:
        throw nonJson(frame.path, "value is not JSON");
    }

    const object = source as object;
    if (activeAncestors.has(object)) {
      throw nonJson(frame.path, "cyclic references are not JSON");
    }
    activeAncestors.add(object);

    if (Array.isArray(object)) {
      const length = object.length;
      ensureArrayCapacity(statistics, limits, length, frame.path);
      registerSemanticArray(statistics, limits, frame.role, length, frame.path);

      const target: MutableJsonArray = new Array<JsonValue>(length);
      assign(frame.assignment, target);
      stack.push({ kind: "exit", source: object });

      const descriptors = inspectArray(object, frame.path);
      for (let index = length - 1; index >= 0; index -= 1) {
        const descriptor = descriptors[index]!;
        stack.push({
          kind: "visit",
          source: descriptor.value,
          assignment: { kind: "array", target, index },
          path: appendIndex(frame.path, index),
          depth: frame.depth + 1,
          role: frame.role === "features-array" ? "feature-entry" : "other",
        });
      }
      continue;
    }

    ensurePlainObject(object, frame.path);
    const entries = inspectObject(object, frame.path);
    statistics.objectKeys += entries.length;
    if (statistics.objectKeys > limits.objectKeys) {
      throw limitExceeded(
        "objectKeys",
        limits.objectKeys,
        statistics.objectKeys,
        frame.path,
      );
    }

    const target: MutableJsonObject = {};
    assign(frame.assignment, target);
    stack.push({ kind: "exit", source: object });

    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const [key, descriptor] = entries[index]!;
      const childRole = roleForObjectChild(frame.role, key);
      stack.push({
        kind: "visit",
        source: descriptor.value,
        assignment: { kind: "object", target, key },
        path: appendKey(frame.path, key),
        depth: frame.depth + 1,
        role: childRole,
      });
    }
  }

  if (!("value" in root)) {
    throw new PlotJsonError(
      "PLOTJSON_VALUE_NOT_JSON",
      "PlotJSON clone did not produce a root value.",
      { path: rootPath },
    );
  }

  return Object.freeze({
    value: root.value!,
    statistics: freezeStatistics(statistics),
    limits,
  });
}

export function scanPlotJsonValue(
  input: unknown,
  options: ClonePlotJsonValueOptions = {},
): PlotJsonScanStatistics {
  return clonePlotJsonValue(input, options).statistics;
}

function registerNode(
  statistics: MutableStatistics,
  limits: Readonly<PlotJsonLimits>,
  path: string,
  depth: number,
): void {
  if (depth > limits.depth) {
    throw limitExceeded("depth", limits.depth, depth, path);
  }
  statistics.maximumDepth = Math.max(statistics.maximumDepth, depth);
  statistics.totalNodes += 1;
  if (statistics.totalNodes > limits.totalNodes) {
    throw limitExceeded(
      "totalNodes",
      limits.totalNodes,
      statistics.totalNodes,
      path,
    );
  }
}

function registerString(
  statistics: MutableStatistics,
  limits: Readonly<PlotJsonLimits>,
  value: string,
  path: string,
): void {
  statistics.maximumStringLength = Math.max(
    statistics.maximumStringLength,
    value.length,
  );
  if (value.length > limits.stringLength) {
    throw limitExceeded(
      "stringLength",
      limits.stringLength,
      value.length,
      path,
    );
  }
}

function ensureArrayCapacity(
  statistics: MutableStatistics,
  limits: Readonly<PlotJsonLimits>,
  length: number,
  path: string,
): void {
  const remaining = limits.totalNodes - statistics.totalNodes;
  if (length > remaining) {
    throw limitExceeded(
      "totalNodes",
      limits.totalNodes,
      statistics.totalNodes + length,
      path,
    );
  }
}

function registerSemanticArray(
  statistics: MutableStatistics,
  limits: Readonly<PlotJsonLimits>,
  role: ContainerRole,
  length: number,
  path: string,
): void {
  if (role === "features-array") {
    statistics.features = length;
    if (length > limits.features) {
      throw limitExceeded("features", limits.features, length, path);
    }
  }
  if (role === "control-points-array") {
    statistics.maximumControlPointsPerFeature = Math.max(
      statistics.maximumControlPointsPerFeature,
      length,
    );
    if (length > limits.controlPointsPerFeature) {
      throw limitExceeded(
        "controlPointsPerFeature",
        limits.controlPointsPerFeature,
        length,
        path,
      );
    }
    statistics.totalControlPoints += length;
    if (statistics.totalControlPoints > limits.totalControlPoints) {
      throw limitExceeded(
        "totalControlPoints",
        limits.totalControlPoints,
        statistics.totalControlPoints,
        path,
      );
    }
  }
}

function inspectArray(
  value: readonly unknown[],
  path: string,
): readonly PropertyDescriptor[] {
  let keys: readonly (string | symbol)[];
  try {
    keys = Reflect.ownKeys(value);
  } catch (cause) {
    throw nonJson(path, "array keys could not be inspected", cause);
  }

  for (const key of keys) {
    if (typeof key === "symbol") {
      throw nonJson(path, "symbol array keys are not JSON");
    }
    if (key === "length") continue;
    const index = canonicalArrayIndex(key);
    if (index === undefined || index >= value.length) {
      throw nonJson(appendKey(path, key), "custom array properties are not JSON");
    }
  }

  const descriptors: PropertyDescriptor[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const key = String(index);
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, key);
    } catch (cause) {
      throw nonJson(appendIndex(path, index), "array item could not be inspected", cause);
    }
    if (!descriptor) {
      throw nonJson(appendIndex(path, index), "sparse arrays are not JSON");
    }
    validateDataDescriptor(descriptor, appendIndex(path, index));
    descriptors.push(descriptor);
  }
  return descriptors;
}

function ensurePlainObject(value: object, path: string): void {
  let prototype: object | null;
  try {
    prototype = Object.getPrototypeOf(value);
  } catch (cause) {
    throw nonJson(path, "object prototype could not be inspected", cause);
  }
  if (prototype !== Object.prototype && prototype !== null) {
    throw nonJson(path, "only plain objects are valid JSON objects");
  }
}

function inspectObject(
  value: object,
  path: string,
): readonly (readonly [string, PropertyDescriptor])[] {
  let keys: readonly (string | symbol)[];
  try {
    keys = Reflect.ownKeys(value);
  } catch (cause) {
    throw nonJson(path, "object keys could not be inspected", cause);
  }
  for (const key of keys) {
    if (typeof key === "symbol") {
      throw nonJson(path, "symbol object keys are not JSON");
    }
  }

  const names = (keys as readonly string[]).slice().sort(compareStrings);
  return names.map((key) => {
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, key);
    } catch (cause) {
      throw nonJson(appendKey(path, key), "object property could not be inspected", cause);
    }
    if (!descriptor) {
      throw nonJson(appendKey(path, key), "object property disappeared during inspection");
    }
    validateDataDescriptor(descriptor, appendKey(path, key));
    return Object.freeze([key, descriptor] as const);
  });
}

function validateDataDescriptor(
  descriptor: PropertyDescriptor,
  path: string,
): asserts descriptor is PropertyDescriptor & { readonly value: unknown } {
  if (!("value" in descriptor)) {
    throw nonJson(path, "accessor properties are not JSON");
  }
  if (!descriptor.enumerable) {
    throw nonJson(path, "non-enumerable properties are not JSON");
  }
}

function roleForObjectChild(
  parentRole: ContainerRole,
  key: string,
): ContainerRole {
  if (parentRole === "root" && key === "features") return "features-array";
  if (parentRole === "feature-entry" && key === "controlPoints") {
    return "control-points-array";
  }
  return "other";
}

function assign(assignment: Assignment, value: JsonValue): void {
  if (assignment.kind === "root") {
    assignment.target.value = value;
    return;
  }
  if (assignment.kind === "array") {
    assignment.target[assignment.index] = value;
    return;
  }
  Object.defineProperty(assignment.target, assignment.key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true,
  });
}

function canonicalArrayIndex(key: string): number | undefined {
  if (!/^(0|[1-9]\d*)$/.test(key)) return undefined;
  const index = Number(key);
  return Number.isSafeInteger(index) && String(index) === key ? index : undefined;
}

function appendIndex(path: string, index: number): string {
  return `${path}[${index}]`;
}

function appendKey(path: string, key: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)
    ? `${path}.${key}`
    : `${path}[${JSON.stringify(key)}]`;
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function nonJson(path: string, reason: string, cause?: unknown): PlotJsonError {
  return new PlotJsonError(
    "PLOTJSON_VALUE_NOT_JSON",
    `PlotJSON value at ${path} is invalid: ${reason}.`,
    cause === undefined ? { path } : { path, cause },
  );
}

function limitExceeded(
  name: PlotJsonLimitName,
  limit: number,
  actual: number,
  path: string,
): PlotJsonError {
  return new PlotJsonError(
    "PLOTJSON_RESOURCE_LIMIT_EXCEEDED",
    `PlotJSON limit "${name}" was exceeded at ${path}: ${actual} > ${limit}.`,
    { path, limitName: name, limit, actual },
  );
}

function freezeStatistics(
  statistics: MutableStatistics,
): PlotJsonScanStatistics {
  return Object.freeze({
    totalNodes: statistics.totalNodes,
    objectKeys: statistics.objectKeys,
    maximumDepth: statistics.maximumDepth,
    maximumStringLength: statistics.maximumStringLength,
    features: statistics.features,
    maximumControlPointsPerFeature:
      statistics.maximumControlPointsPerFeature,
    totalControlPoints: statistics.totalControlPoints,
  });
}

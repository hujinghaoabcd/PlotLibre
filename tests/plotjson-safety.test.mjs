import assert from "node:assert/strict";
import test from "node:test";
import {
  assertPlotJsonInputSize,
  clonePlotJsonValue,
  DEFAULT_PLOTJSON_LIMITS,
  PlotJsonError,
  resolvePlotJsonLimits,
  scanPlotJsonValue,
} from "@plotlibre/core";

function expectJsonFailure(operation, code, path) {
  assert.throws(operation, (error) => {
    assert.ok(error instanceof PlotJsonError);
    assert.equal(error.code, code);
    if (path !== undefined) assert.equal(error.path, path);
    return true;
  });
}

test("JSON-safe values are deeply cloned with immutable statistics", () => {
  const shared = { value: 4 };
  const input = {
    z: [null, true, false, 3.5, "text"],
    a: { right: shared, left: shared },
  };
  const before = structuredClone(input);

  const result = clonePlotJsonValue(input);
  assert.deepEqual(result.value, input);
  assert.deepEqual(input, before);
  assert.notEqual(result.value, input);
  assert.notEqual(result.value.a, input.a);
  assert.notEqual(result.value.z, input.z);
  assert.notEqual(result.value.a.left, result.value.a.right);
  assert.equal(Object.keys(result.value)[0], "a");
  assert.equal(Object.keys(result.value.a)[0], "left");
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.statistics), true);
  assert.equal(Object.isFrozen(result.limits), true);
  assert.equal(result.statistics.maximumDepth, 3);
  assert.equal(result.statistics.maximumStringLength, 5);
});

test("null-prototype objects clone into safe ordinary JSON objects", () => {
  const input = Object.create(null);
  input.name = "safe";
  input.nested = Object.create(null);
  input.nested.value = 2;

  const result = clonePlotJsonValue(input).value;
  assert.deepEqual(result, { name: "safe", nested: { value: 2 } });
  assert.equal(Object.getPrototypeOf(result), Object.prototype);
  assert.equal(Object.getPrototypeOf(result.nested), Object.prototype);
});

test("prototype-sensitive keys remain own data without polluting prototypes", () => {
  const input = {};
  Object.defineProperty(input, "__proto__", {
    value: { polluted: true },
    enumerable: true,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(input, "constructor", {
    value: { safe: true },
    enumerable: true,
    configurable: true,
    writable: true,
  });

  const clone = clonePlotJsonValue(input).value;
  assert.equal(Object.hasOwn(clone, "__proto__"), true);
  assert.equal(Object.hasOwn(clone, "constructor"), true);
  assert.deepEqual(clone.__proto__, { polluted: true });
  assert.deepEqual(clone.constructor, { safe: true });
  assert.equal({}.polluted, undefined);
  assert.equal(Object.getPrototypeOf(clone), Object.prototype);
});

test("non-JSON primitives fail at their deterministic paths", () => {
  const invalid = [
    [undefined, "$"],
    [NaN, "$"],
    [Infinity, "$"],
    [-Infinity, "$"],
    [1n, "$"],
    [Symbol("value"), "$"],
    [() => 1, "$"],
    [{ value: undefined }, "$.value"],
    [[0, NaN], "$[1]"],
  ];

  for (const [value, path] of invalid) {
    expectJsonFailure(
      () => clonePlotJsonValue(value),
      "PLOTJSON_VALUE_NOT_JSON",
      path,
    );
  }
});

test("non-plain object families fail closed", () => {
  class Example {
    value = 1;
  }

  const invalid = [
    new Date(),
    new Map(),
    new Set(),
    new Uint8Array([1, 2]),
    /pattern/,
    new Example(),
    Object.create({ inherited: true }),
  ];
  for (const value of invalid) {
    expectJsonFailure(
      () => clonePlotJsonValue(value),
      "PLOTJSON_VALUE_NOT_JSON",
      "$",
    );
  }
});

test("accessors, symbols and hidden properties are rejected without invocation", () => {
  let getterCalls = 0;
  const accessor = {};
  Object.defineProperty(accessor, "secret", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return 4;
    },
  });
  expectJsonFailure(
    () => clonePlotJsonValue(accessor),
    "PLOTJSON_VALUE_NOT_JSON",
    "$.secret",
  );
  assert.equal(getterCalls, 0);

  const symbolKey = { visible: true };
  symbolKey[Symbol("hidden")] = 4;
  expectJsonFailure(
    () => clonePlotJsonValue(symbolKey),
    "PLOTJSON_VALUE_NOT_JSON",
    "$",
  );

  const hidden = {};
  Object.defineProperty(hidden, "value", { value: 1, enumerable: false });
  expectJsonFailure(
    () => clonePlotJsonValue(hidden),
    "PLOTJSON_VALUE_NOT_JSON",
    "$.value",
  );
});

test("sparse arrays and custom array properties are rejected", () => {
  const sparse = new Array(2);
  sparse[1] = 4;
  expectJsonFailure(
    () => clonePlotJsonValue(sparse),
    "PLOTJSON_VALUE_NOT_JSON",
    "$[0]",
  );

  const custom = [1, 2];
  custom.extra = 3;
  expectJsonFailure(
    () => clonePlotJsonValue(custom),
    "PLOTJSON_VALUE_NOT_JSON",
    "$.extra",
  );
});

test("direct and indirect cycles reject while repeated siblings remain valid", () => {
  const direct = {};
  direct.self = direct;
  expectJsonFailure(
    () => clonePlotJsonValue(direct),
    "PLOTJSON_VALUE_NOT_JSON",
    "$.self",
  );

  const left = {};
  const right = { left };
  left.right = right;
  expectJsonFailure(
    () => clonePlotJsonValue(left),
    "PLOTJSON_VALUE_NOT_JSON",
    "$.right.left",
  );

  const shared = { value: 1 };
  const clone = clonePlotJsonValue({ first: shared, second: shared }).value;
  assert.deepEqual(clone.first, clone.second);
  assert.notEqual(clone.first, clone.second);
});

test("semantic document statistics count features and authored controls", () => {
  const document = {
    type: "PlotLibreDocument",
    schemaVersion: "1.0.0",
    features: [
      { id: "a", controlPoints: [[1, 2], [3, 4]] },
      { id: "b", controlPoints: [[5, 6]] },
    ],
  };
  const statistics = scanPlotJsonValue(document);
  assert.equal(statistics.features, 2);
  assert.equal(statistics.totalControlPoints, 3);
  assert.equal(statistics.maximumControlPointsPerFeature, 2);
  assert.equal(statistics.maximumDepth, 5);
  assert.equal(statistics.maximumStringLength, "PlotLibreDocument".length);
});

test("depth, node, key and string limits accept boundary and reject one over", () => {
  const nested = { a: { b: 0 } };
  assert.doesNotThrow(() => clonePlotJsonValue(nested, { limits: { depth: 2 } }));
  expectJsonFailure(
    () => clonePlotJsonValue(nested, { limits: { depth: 1 } }),
    "PLOTJSON_RESOURCE_LIMIT_EXCEEDED",
    "$.a.b",
  );

  assert.doesNotThrow(() =>
    clonePlotJsonValue([1, 2], { limits: { totalNodes: 3 } }),
  );
  expectJsonFailure(
    () => clonePlotJsonValue([1, 2], { limits: { totalNodes: 2 } }),
    "PLOTJSON_RESOURCE_LIMIT_EXCEEDED",
    "$",
  );

  assert.doesNotThrow(() =>
    clonePlotJsonValue({ a: 1, b: 2 }, { limits: { objectKeys: 2 } }),
  );
  expectJsonFailure(
    () =>
      clonePlotJsonValue({ a: 1, b: 2 }, { limits: { objectKeys: 1 } }),
    "PLOTJSON_RESOURCE_LIMIT_EXCEEDED",
    "$",
  );

  assert.doesNotThrow(() =>
    clonePlotJsonValue("abcd", { limits: { stringLength: 4 } }),
  );
  expectJsonFailure(
    () => clonePlotJsonValue("abcd", { limits: { stringLength: 3 } }),
    "PLOTJSON_RESOURCE_LIMIT_EXCEEDED",
    "$",
  );
});

test("feature and control limits report exact document paths", () => {
  const document = {
    features: [
      { controlPoints: [[0, 0], [1, 1]] },
      { controlPoints: [[2, 2]] },
    ],
  };

  assert.doesNotThrow(() =>
    clonePlotJsonValue(document, {
      limits: {
        features: 2,
        controlPointsPerFeature: 2,
        totalControlPoints: 3,
      },
    }),
  );
  expectJsonFailure(
    () => clonePlotJsonValue(document, { limits: { features: 1 } }),
    "PLOTJSON_RESOURCE_LIMIT_EXCEEDED",
    "$.features",
  );
  expectJsonFailure(
    () =>
      clonePlotJsonValue(document, {
        limits: { controlPointsPerFeature: 1 },
      }),
    "PLOTJSON_RESOURCE_LIMIT_EXCEEDED",
    "$.features[0].controlPoints",
  );
  expectJsonFailure(
    () => clonePlotJsonValue(document, { limits: { totalControlPoints: 2 } }),
    "PLOTJSON_RESOURCE_LIMIT_EXCEEDED",
    "$.features[1].controlPoints",
  );
});

test("UTF-8 input size uses bytes rather than JavaScript code units", () => {
  assert.equal(assertPlotJsonInputSize("é", { inputBytes: 2 }), 2);
  expectJsonFailure(
    () => assertPlotJsonInputSize("é", { inputBytes: 1 }),
    "PLOTJSON_RESOURCE_LIMIT_EXCEEDED",
    "$",
  );
});

test("limit resolution is complete, immutable and rejects invalid overrides", () => {
  const limits = resolvePlotJsonLimits({ depth: 12, features: 50 });
  assert.equal(limits.depth, 12);
  assert.equal(limits.features, 50);
  assert.equal(limits.inputBytes, DEFAULT_PLOTJSON_LIMITS.inputBytes);
  assert.equal(Object.isFrozen(limits), true);
  assert.equal(Object.isFrozen(DEFAULT_PLOTJSON_LIMITS), true);

  for (const value of [0, -1, 1.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(
      () => resolvePlotJsonLimits({ depth: value }),
      (error) => {
        assert.equal(error.code, "PLOTJSON_RESOURCE_LIMIT_EXCEEDED");
        assert.equal(error.limitName, "depth");
        assert.equal(error.actual, value);
        return true;
      },
    );
  }
});

test("custom root paths propagate into deterministic diagnostics", () => {
  expectJsonFailure(
    () => clonePlotJsonValue({ bad: undefined }, { path: "$.payload" }),
    "PLOTJSON_VALUE_NOT_JSON",
    "$.payload.bad",
  );
  assert.throws(
    () => clonePlotJsonValue({}, { path: "" }),
    (error) => {
      assert.equal(error.code, "PLOTJSON_CURRENT_SCHEMA_INVALID");
      return true;
    },
  );
});

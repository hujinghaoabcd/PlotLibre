import { PlotLibreError } from "./errors.js";
import { PlotJsonError } from "./plotjson-error.js";
import type {
  PlotJsonDefinitionMigration,
  PlotJsonDefinitionReference,
  PlotJsonDocumentMigration,
  PlotJsonMigrationScope,
  PlotJsonPlannedDefinitionStep,
  PlotJsonPlannedDocumentStep,
} from "./plotjson-migration-types.js";
import {
  comparePlotJsonVersions,
  parsePlotJsonVersion,
} from "./plotjson-version.js";

export type PlotJsonMigrationRegistryErrorCode =
  | "PLOTJSON_MIGRATION_REGISTRATION_INVALID"
  | "PLOTJSON_MIGRATION_SOURCE_DUPLICATE"
  | "PLOTJSON_MIGRATION_GRAPH_CYCLE";

export interface PlotJsonMigrationRegistryErrorContext {
  readonly scope?: PlotJsonMigrationScope;
  readonly sourceVersion?: string;
  readonly targetVersion?: string;
  readonly plotType?: string;
}

/** Developer-facing failure for an invalid trusted migration registry. */
export class PlotJsonMigrationRegistryError extends PlotLibreError {
  public readonly scope: PlotJsonMigrationScope | undefined;
  public readonly sourceVersion: string | undefined;
  public readonly targetVersion: string | undefined;
  public readonly plotType: string | undefined;

  public constructor(
    code: PlotJsonMigrationRegistryErrorCode,
    message: string,
    context: PlotJsonMigrationRegistryErrorContext = {},
  ) {
    super(code, message);
    this.name = "PlotJsonMigrationRegistryError";
    this.scope = context.scope;
    this.sourceVersion = context.sourceVersion;
    this.targetVersion = context.targetVersion;
    this.plotType = context.plotType;
  }
}

const EMPTY_DOCUMENT_PLAN = Object.freeze(
  [] as PlotJsonPlannedDocumentStep[],
);
const EMPTY_DEFINITION_PLAN = Object.freeze(
  [] as PlotJsonPlannedDefinitionStep[],
);

/**
 * Separate, engine-independent registry for PlotJSON history.
 *
 * Each source node has at most one outgoing edge. Registration copies and
 * freezes every descriptor. Planning follows the unique chain and never calls
 * migration functions.
 */
export class PlotJsonMigrationRegistry {
  readonly #documentBySource = new Map<
    string,
    PlotJsonPlannedDocumentStep
  >();
  readonly #definitionBySource = new Map<
    string,
    PlotJsonPlannedDefinitionStep
  >();

  public registerDocument(migration: PlotJsonDocumentMigration): this {
    const normalized = normalizeDocumentMigration(migration);
    if (this.#documentBySource.has(normalized.fromVersion)) {
      throw new PlotJsonMigrationRegistryError(
        "PLOTJSON_MIGRATION_SOURCE_DUPLICATE",
        "A document migration source may have only one outgoing edge.",
        {
          scope: "document",
          sourceVersion: normalized.fromVersion,
          targetVersion: normalized.toVersion,
        },
      );
    }

    this.#documentBySource.set(normalized.fromVersion, normalized);
    try {
      assertDocumentGraphAcyclic(this.#documentBySource);
    } catch (error) {
      this.#documentBySource.delete(normalized.fromVersion);
      throw error;
    }
    return this;
  }

  public registerDefinition(migration: PlotJsonDefinitionMigration): this {
    const normalized = normalizeDefinitionMigration(migration);
    const sourceKey = definitionReferenceKey(normalized.from);
    if (this.#definitionBySource.has(sourceKey)) {
      throw new PlotJsonMigrationRegistryError(
        "PLOTJSON_MIGRATION_SOURCE_DUPLICATE",
        "A Definition migration source may have only one outgoing edge.",
        {
          scope: "definition",
          sourceVersion: normalized.from.definitionVersion,
          targetVersion: normalized.to.definitionVersion,
          plotType: normalized.from.plotType,
        },
      );
    }

    this.#definitionBySource.set(sourceKey, normalized);
    try {
      assertDefinitionGraphAcyclic(this.#definitionBySource);
    } catch (error) {
      this.#definitionBySource.delete(sourceKey);
      throw error;
    }
    return this;
  }

  public get documentMigrations(): readonly PlotJsonPlannedDocumentStep[] {
    return Object.freeze(
      [...this.#documentBySource.values()].sort(compareDocumentSteps),
    );
  }

  public get definitionMigrations(): readonly PlotJsonPlannedDefinitionStep[] {
    return Object.freeze(
      [...this.#definitionBySource.values()].sort(compareDefinitionSteps),
    );
  }

  public planDocument(
    fromVersion: string,
    toVersion: string,
  ): readonly PlotJsonPlannedDocumentStep[] {
    const source = parsePlotJsonVersion(fromVersion).value;
    const target = parsePlotJsonVersion(toVersion).value;
    const sourceOrder = comparePlotJsonVersions(source, target);
    if (sourceOrder === 0) return EMPTY_DOCUMENT_PLAN;
    if (sourceOrder > 0) {
      throw new PlotJsonError(
        "PLOTJSON_SCHEMA_VERSION_UNSUPPORTED",
        "The document schema version is newer than the requested target.",
        { sourceVersion: source, targetVersion: target },
      );
    }

    const planned: PlotJsonPlannedDocumentStep[] = [];
    const visited = new Set<string>();
    let current = source;
    while (current !== target) {
      if (visited.has(current)) {
        throw documentCycleError(current, target);
      }
      visited.add(current);

      const step = this.#documentBySource.get(current);
      if (
        !step ||
        comparePlotJsonVersions(step.toVersion, target) > 0
      ) {
        throw missingDocumentPath(source, target);
      }
      planned.push(step);
      current = step.toVersion;
    }
    return Object.freeze(planned);
  }

  public planDefinition(
    from: PlotJsonDefinitionReference,
    to: PlotJsonDefinitionReference,
  ): readonly PlotJsonPlannedDefinitionStep[] {
    const source = normalizeDefinitionReferenceForPlanning(from);
    const target = normalizeDefinitionReferenceForPlanning(to);
    const sourceOrder = comparePlotJsonVersions(
      source.definitionVersion,
      target.definitionVersion,
    );
    if (sourceOrder === 0 && definitionReferencesEqual(source, target)) {
      return EMPTY_DEFINITION_PLAN;
    }
    if (sourceOrder > 0) {
      throw new PlotJsonError(
        "PLOTJSON_DEFINITION_VERSION_UNSUPPORTED",
        "The Definition version is newer than the requested target.",
        {
          plotType: source.plotType,
          sourceVersion: source.definitionVersion,
          targetVersion: target.definitionVersion,
        },
      );
    }
    if (sourceOrder === 0) {
      throw missingDefinitionPath(source, target);
    }

    const planned: PlotJsonPlannedDefinitionStep[] = [];
    const visited = new Set<string>();
    let current = source;
    while (!definitionReferencesEqual(current, target)) {
      const currentKey = definitionReferenceKey(current);
      if (visited.has(currentKey)) {
        throw definitionCycleError(current, target);
      }
      visited.add(currentKey);

      const step = this.#definitionBySource.get(currentKey);
      if (
        !step ||
        comparePlotJsonVersions(
          step.to.definitionVersion,
          target.definitionVersion,
        ) > 0
      ) {
        throw missingDefinitionPath(source, target);
      }
      planned.push(step);
      current = step.to;
    }
    return Object.freeze(planned);
  }
}

function normalizeDocumentMigration(
  migration: PlotJsonDocumentMigration,
): PlotJsonPlannedDocumentStep {
  if (!isObject(migration) || typeof migration.migrate !== "function") {
    throw invalidRegistration("document");
  }
  const fromVersion = normalizeRegistrationVersion(
    migration.fromVersion,
    "document",
  );
  const toVersion = normalizeRegistrationVersion(
    migration.toVersion,
    "document",
  );
  if (comparePlotJsonVersions(fromVersion, toVersion) >= 0) {
    throw new PlotJsonMigrationRegistryError(
      "PLOTJSON_MIGRATION_REGISTRATION_INVALID",
      "A document migration target must be strictly newer than its source.",
      { scope: "document", sourceVersion: fromVersion, targetVersion: toVersion },
    );
  }
  return Object.freeze({
    scope: "document",
    fromVersion,
    toVersion,
    migrate: migration.migrate,
  });
}

function normalizeDefinitionMigration(
  migration: PlotJsonDefinitionMigration,
): PlotJsonPlannedDefinitionStep {
  if (!isObject(migration) || typeof migration.migrate !== "function") {
    throw invalidRegistration("definition");
  }
  const from = normalizeRegistrationReference(migration.from);
  const to = normalizeRegistrationReference(migration.to);
  if (
    comparePlotJsonVersions(
      from.definitionVersion,
      to.definitionVersion,
    ) >= 0
  ) {
    throw new PlotJsonMigrationRegistryError(
      "PLOTJSON_MIGRATION_REGISTRATION_INVALID",
      "A Definition migration target must be strictly newer than its source.",
      {
        scope: "definition",
        sourceVersion: from.definitionVersion,
        targetVersion: to.definitionVersion,
        plotType: from.plotType,
      },
    );
  }
  return Object.freeze({
    scope: "definition",
    from,
    to,
    migrate: migration.migrate,
  });
}

function normalizeRegistrationReference(
  reference: PlotJsonDefinitionReference,
): PlotJsonDefinitionReference {
  if (
    !isObject(reference) ||
    typeof reference.plotType !== "string" ||
    reference.plotType.length === 0
  ) {
    throw invalidRegistration("definition");
  }
  const definitionVersion = normalizeRegistrationVersion(
    reference.definitionVersion,
    "definition",
    reference.plotType,
  );
  return Object.freeze({
    plotType: reference.plotType,
    definitionVersion,
  });
}

function normalizeDefinitionReferenceForPlanning(
  reference: PlotJsonDefinitionReference,
): PlotJsonDefinitionReference {
  if (
    !isObject(reference) ||
    typeof reference.plotType !== "string" ||
    reference.plotType.length === 0
  ) {
    throw new PlotJsonError(
      "PLOTJSON_DEFINITION_NOT_FOUND",
      "A non-empty plotType is required to plan a Definition migration.",
    );
  }
  let definitionVersion: string;
  try {
    definitionVersion = parsePlotJsonVersion(
      reference.definitionVersion,
    ).value;
  } catch (cause) {
    throw new PlotJsonError(
      "PLOTJSON_DEFINITION_VERSION_INVALID",
      "The Definition version must be a canonical numeric triple.",
      { plotType: reference.plotType, cause },
    );
  }
  return Object.freeze({
    plotType: reference.plotType,
    definitionVersion,
  });
}

function normalizeRegistrationVersion(
  value: unknown,
  scope: PlotJsonMigrationScope,
  plotType?: string,
): string {
  try {
    return parsePlotJsonVersion(value).value;
  } catch (cause) {
    const context: PlotJsonMigrationRegistryErrorContext = plotType === undefined
      ? { scope }
      : { scope, plotType };
    throw new PlotJsonMigrationRegistryError(
      "PLOTJSON_MIGRATION_REGISTRATION_INVALID",
      "Migration versions must be canonical numeric triples.",
      context,
    );
  }
}

function assertDocumentGraphAcyclic(
  migrations: ReadonlyMap<string, PlotJsonPlannedDocumentStep>,
): void {
  for (const source of migrations.keys()) {
    const visited = new Set<string>();
    let current = source;
    while (true) {
      if (visited.has(current)) {
        throw documentCycleError(source, current);
      }
      visited.add(current);
      const step = migrations.get(current);
      if (!step) break;
      current = step.toVersion;
    }
  }
}

function assertDefinitionGraphAcyclic(
  migrations: ReadonlyMap<string, PlotJsonPlannedDefinitionStep>,
): void {
  for (const source of migrations.keys()) {
    const visited = new Set<string>();
    let current = source;
    while (true) {
      if (visited.has(current)) {
        const step = migrations.get(source);
        throw new PlotJsonMigrationRegistryError(
          "PLOTJSON_MIGRATION_GRAPH_CYCLE",
          "The Definition migration graph contains a cycle.",
          step
            ? {
                scope: "definition",
                sourceVersion: step.from.definitionVersion,
                targetVersion: step.to.definitionVersion,
                plotType: step.from.plotType,
              }
            : { scope: "definition" },
        );
      }
      visited.add(current);
      const step = migrations.get(current);
      if (!step) break;
      current = definitionReferenceKey(step.to);
    }
  }
}

function documentCycleError(
  sourceVersion: string,
  targetVersion: string,
): PlotJsonMigrationRegistryError {
  return new PlotJsonMigrationRegistryError(
    "PLOTJSON_MIGRATION_GRAPH_CYCLE",
    "The document migration graph contains a cycle.",
    { scope: "document", sourceVersion, targetVersion },
  );
}

function definitionCycleError(
  source: PlotJsonDefinitionReference,
  target: PlotJsonDefinitionReference,
): PlotJsonMigrationRegistryError {
  return new PlotJsonMigrationRegistryError(
    "PLOTJSON_MIGRATION_GRAPH_CYCLE",
    "The Definition migration graph contains a cycle.",
    {
      scope: "definition",
      sourceVersion: source.definitionVersion,
      targetVersion: target.definitionVersion,
      plotType: source.plotType,
    },
  );
}

function missingDocumentPath(
  sourceVersion: string,
  targetVersion: string,
): PlotJsonError {
  return new PlotJsonError(
    "PLOTJSON_MIGRATION_PATH_MISSING",
    "No complete document migration chain reaches the requested target.",
    { sourceVersion, targetVersion },
  );
}

function missingDefinitionPath(
  source: PlotJsonDefinitionReference,
  target: PlotJsonDefinitionReference,
): PlotJsonError {
  return new PlotJsonError(
    "PLOTJSON_DEFINITION_MIGRATION_PATH_MISSING",
    "No complete Definition migration chain reaches the requested target.",
    {
      plotType: source.plotType,
      sourceVersion: source.definitionVersion,
      targetVersion: target.definitionVersion,
    },
  );
}

function invalidRegistration(
  scope: PlotJsonMigrationScope,
): PlotJsonMigrationRegistryError {
  return new PlotJsonMigrationRegistryError(
    "PLOTJSON_MIGRATION_REGISTRATION_INVALID",
    "A migration registration must contain valid references and a function.",
    { scope },
  );
}

function definitionReferenceKey(
  reference: PlotJsonDefinitionReference,
): string {
  return JSON.stringify([
    reference.plotType,
    reference.definitionVersion,
  ]);
}

function definitionReferencesEqual(
  left: PlotJsonDefinitionReference,
  right: PlotJsonDefinitionReference,
): boolean {
  return left.plotType === right.plotType &&
    left.definitionVersion === right.definitionVersion;
}

function compareDocumentSteps(
  left: PlotJsonPlannedDocumentStep,
  right: PlotJsonPlannedDocumentStep,
): number {
  const sourceOrder = comparePlotJsonVersions(
    left.fromVersion,
    right.fromVersion,
  );
  return sourceOrder !== 0
    ? sourceOrder
    : comparePlotJsonVersions(left.toVersion, right.toVersion);
}

function compareDefinitionSteps(
  left: PlotJsonPlannedDefinitionStep,
  right: PlotJsonPlannedDefinitionStep,
): number {
  const plotTypeOrder = compareStrings(
    left.from.plotType,
    right.from.plotType,
  );
  if (plotTypeOrder !== 0) return plotTypeOrder;
  const sourceOrder = comparePlotJsonVersions(
    left.from.definitionVersion,
    right.from.definitionVersion,
  );
  if (sourceOrder !== 0) return sourceOrder;
  const targetTypeOrder = compareStrings(
    left.to.plotType,
    right.to.plotType,
  );
  return targetTypeOrder !== 0
    ? targetTypeOrder
    : comparePlotJsonVersions(
        left.to.definitionVersion,
        right.to.definitionVersion,
      );
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

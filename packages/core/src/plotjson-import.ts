import { PlotJsonError } from "./plotjson-error.js";
import { PlotJsonMigrationRegistry } from "./plotjson-migration-registry.js";
import { createPlotJsonMigrationReport } from "./plotjson-migration-report.js";
import type { PlotJsonDefinitionReference } from "./plotjson-migration-types.js";
import {
  readPlotDocument,
  type ReadPlotDocumentResult,
} from "./plotjson-reader.js";
import type { PlotJsonLimits } from "./plotjson-safety.js";
import {
  comparePlotJsonVersions,
  parsePlotJsonVersion,
} from "./plotjson-version.js";
import type {
  PlotDefinition,
  PlotDocument,
  PlotFeature,
} from "./types.js";
import type { PlotRegistry } from "./registry.js";

export interface PreparePlotDocumentImportOptions {
  readonly migrations?: PlotJsonMigrationRegistry;
  readonly limits?: Partial<PlotJsonLimits>;
}

/**
 * Reads, migrates and Registry-preflights a complete PlotJSON document without
 * mutating Store, History, selection, interactions or rendering state.
 */
export function preparePlotDocumentImport(
  input: string | unknown,
  registry: PlotRegistry,
  options: PreparePlotDocumentImportOptions = {},
): ReadPlotDocumentResult {
  const migrations = options.migrations ?? new PlotJsonMigrationRegistry();

  // The first pass executes document-schema migration and current structural
  // decoding only. The second pass starts from that already-current immutable
  // document, so document migration functions are never executed twice.
  const decoded = readPlotDocument(input, {
    migrations,
    ...(options.limits === undefined ? {} : { limits: options.limits }),
  });
  const definitionTargets = deriveRegistryDefinitionTargets(
    decoded.document.features,
    registry,
    migrations,
  );
  const migrated = readPlotDocument(decoded.document, {
    migrations,
    definitionTargets,
    ...(options.limits === undefined ? {} : { limits: options.limits }),
  });

  const canonicalFeatures = migrated.document.features.map((feature) =>
    prepareRegistryFeature(feature, registry),
  );
  const canonical = readPlotDocument(
    {
      ...migrated.document,
      features: canonicalFeatures,
    },
    options.limits === undefined ? {} : { limits: options.limits },
  );

  const report = createPlotJsonMigrationReport({
    sourceSchemaVersion: decoded.report.sourceSchemaVersion,
    targetSchemaVersion: migrated.report.targetSchemaVersion,
    documentSteps: decoded.report.documentSteps,
    featureSteps: migrated.report.featureSteps,
    normalizations: [
      ...decoded.report.normalizations,
      ...migrated.report.normalizations,
    ],
    warnings: [...decoded.report.warnings, ...migrated.report.warnings],
  });

  return Object.freeze({ document: canonical.document, report });
}

/**
 * Resolves one exact final live Definition target per source plotType.
 *
 * A source that already exactly matches a live Definition does not migrate.
 * Otherwise resolution follows the unique 008B outgoing chain until the first
 * exact live Definition is reached. No aliases, nearest versions or best-effort
 * targets are inferred.
 */
export function deriveRegistryDefinitionTargets(
  features: readonly PlotFeature[],
  registry: PlotRegistry,
  migrations: PlotJsonMigrationRegistry,
): Readonly<Record<string, PlotJsonDefinitionReference>> {
  const liveDefinitions = new Map<string, PlotJsonDefinitionReference>();
  for (const definition of registry.list()) {
    liveDefinitions.set(
      definition.type,
      createLiveDefinitionReference(definition),
    );
  }

  const outgoing = new Map(
    migrations.definitionMigrations.map((step) => [
      definitionReferenceKey(step.from),
      step.to,
    ] as const),
  );
  const targets = Object.create(null) as Record<
    string,
    PlotJsonDefinitionReference
  >;

  for (const feature of features) {
    const source = Object.freeze({
      plotType: feature.plotType,
      definitionVersion: parseFeatureVersion(feature),
    });
    const target = resolveLiveDefinitionTarget(
      source,
      liveDefinitions,
      outgoing,
    );
    const previous = targets[source.plotType];
    if (previous !== undefined && !sameReference(previous, target)) {
      throw new PlotJsonError(
        "PLOTJSON_DEFINITION_MIGRATION_PATH_MISSING",
        "Features sharing one source plotType must resolve to one live Definition target.",
        {
          plotType: source.plotType,
          sourceVersion: source.definitionVersion,
          targetVersion: target.definitionVersion,
        },
      );
    }
    targets[source.plotType] = target;
  }

  return Object.freeze(targets);
}

function resolveLiveDefinitionTarget(
  source: PlotJsonDefinitionReference,
  liveDefinitions: ReadonlyMap<string, PlotJsonDefinitionReference>,
  outgoing: ReadonlyMap<string, PlotJsonDefinitionReference>,
): PlotJsonDefinitionReference {
  let current = source;
  let followedMigration = false;
  const visited = new Set<string>();

  while (true) {
    const live = liveDefinitions.get(current.plotType);
    if (live !== undefined && sameReference(current, live)) return live;

    const key = definitionReferenceKey(current);
    if (visited.has(key)) {
      throw missingDefinitionPath(source, current);
    }
    visited.add(key);

    const next = outgoing.get(key);
    if (next === undefined) {
      if (live !== undefined) {
        if (
          comparePlotJsonVersions(
            current.definitionVersion,
            live.definitionVersion,
          ) > 0
        ) {
          throw new PlotJsonError(
            "PLOTJSON_DEFINITION_VERSION_UNSUPPORTED",
            "The document Definition version is newer than the live registered Definition.",
            {
              plotType: current.plotType,
              sourceVersion: current.definitionVersion,
              targetVersion: live.definitionVersion,
            },
          );
        }
        throw missingDefinitionPath(source, live);
      }
      if (followedMigration) throw missingDefinitionPath(source, current);
      throw new PlotJsonError(
        "PLOTJSON_DEFINITION_NOT_FOUND",
        "No live Definition or migration chain exists for this plotType.",
        {
          plotType: source.plotType,
          sourceVersion: source.definitionVersion,
        },
      );
    }

    followedMigration = true;
    current = next;
  }
}

function prepareRegistryFeature(
  feature: PlotFeature,
  registry: PlotRegistry,
): PlotFeature {
  let definition: PlotDefinition;
  try {
    definition = registry.get(feature.plotType);
  } catch (cause) {
    throw new PlotJsonError(
      "PLOTJSON_DEFINITION_NOT_FOUND",
      "The migrated feature does not resolve to a live Definition.",
      {
        featureId: feature.id,
        plotType: feature.plotType,
        sourceVersion: feature.definitionVersion,
        cause,
      },
    );
  }

  const targetVersion = createLiveDefinitionReference(definition)
    .definitionVersion;
  if (feature.definitionVersion !== targetVersion) {
    throw new PlotJsonError(
      "PLOTJSON_DEFINITION_VERSION_UNSUPPORTED",
      "The migrated feature does not match the live Definition version.",
      {
        featureId: feature.id,
        plotType: feature.plotType,
        sourceVersion: feature.definitionVersion,
        targetVersion,
      },
    );
  }

  const canonical = registry.canonicalize(feature);
  registry.generate(canonical);
  return canonical;
}

function createLiveDefinitionReference(
  definition: PlotDefinition,
): PlotJsonDefinitionReference {
  let definitionVersion: string;
  try {
    definitionVersion = parsePlotJsonVersion(definition.version).value;
  } catch (cause) {
    throw new PlotJsonError(
      "PLOTJSON_DEFINITION_VERSION_INVALID",
      "A live registered Definition must expose a canonical numeric version.",
      { plotType: definition.type, cause },
    );
  }
  return Object.freeze({
    plotType: definition.type,
    definitionVersion,
  });
}

function parseFeatureVersion(feature: PlotFeature): string {
  try {
    return parsePlotJsonVersion(feature.definitionVersion).value;
  } catch (cause) {
    throw new PlotJsonError(
      "PLOTJSON_DEFINITION_VERSION_INVALID",
      "A decoded feature must expose a canonical Definition version.",
      {
        featureId: feature.id,
        plotType: feature.plotType,
        cause,
      },
    );
  }
}

function missingDefinitionPath(
  source: PlotJsonDefinitionReference,
  target: PlotJsonDefinitionReference,
): PlotJsonError {
  return new PlotJsonError(
    "PLOTJSON_DEFINITION_MIGRATION_PATH_MISSING",
    "No complete Definition migration chain reaches a live registered Definition.",
    {
      plotType: source.plotType,
      sourceVersion: source.definitionVersion,
      targetVersion: target.definitionVersion,
    },
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

function sameReference(
  left: PlotJsonDefinitionReference,
  right: PlotJsonDefinitionReference,
): boolean {
  return left.plotType === right.plotType &&
    left.definitionVersion === right.definitionVersion;
}

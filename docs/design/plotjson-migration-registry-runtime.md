# Milestone 008B — PlotJSON Migration Registry Runtime

Status: runtime implementation on PR #55.  
Production schema: `PlotLibreDocument / 1.0.0`.  
Production migrations: none.  
Scope: trusted migration descriptors, deterministic graph registration/planning and immutable report records.

## 1. Purpose

008A established canonical persisted-version parsing, structured PlotJSON errors, iterative JSON safety and finite input limits. 008B adds the next isolated layer: a registry that can describe and plan historical transitions without reading a document and without executing migration code.

The separation is deliberate:

```text
008A  version + errors + JSON safety + limits
008B  migration descriptors + registry + planner + report records
008C  safe reader + migration execution + 1.0 compatibility + invariants
008D  Registry-aware preparation + atomic Store replacement
```

008B therefore cannot change the behavior of `parsePlotDocument()`, `PlotRegistry`, `PlotStore`, `PlotLibre.importDocument()` or persisted output.

## 2. Public modules

```text
packages/core/src/plotjson-migration-types.ts
packages/core/src/plotjson-migration-registry.ts
packages/core/src/plotjson-migration-report.ts
```

All are exported by `@plotlibre/core`.

## 3. Two independent graph domains

### 3.1 Document graph

A document edge changes only structural schema version:

```ts
interface PlotJsonDocumentMigration {
  readonly fromVersion: string;
  readonly toVersion: string;
  readonly migrate: PlotJsonMigrationFunction;
}
```

One node is one canonical `MAJOR.MINOR.PATCH` document version.

### 3.2 Definition graph

A Definition edge changes one feature's authored semantics:

```ts
interface PlotJsonDefinitionReference {
  readonly plotType: string;
  readonly definitionVersion: string;
}

interface PlotJsonDefinitionMigration {
  readonly from: PlotJsonDefinitionReference;
  readonly to: PlotJsonDefinitionReference;
  readonly migrate: PlotJsonMigrationFunction;
}
```

A node is the pair:

```text
(plotType, definitionVersion)
```

This allows an explicit, auditable type rename:

```text
arrow.legacy@1.0.0
→ arrow.bridge@1.1.0
→ arrow.current@2.0.0
```

A rename is never a `PlotRegistry` alias and never an implicit fallback.

## 4. Trusted migration functions

```ts
interface PlotJsonMigrationContext {
  readonly scope: "document" | "definition";
  readonly sourceVersion: string;
  readonly targetVersion: string;
  readonly featureId?: string;
  readonly sourcePlotType?: string;
  readonly targetPlotType?: string;
}

type PlotJsonMigrationFunction = (
  input: PlotJsonObject,
  context: PlotJsonMigrationContext,
) => PlotJsonObject;
```

008B stores the function reference only. Registration, graph validation, snapshots and planning **never invoke it**.

Execution remains 008C work because execution requires:

- immutable input cloning;
- per-step JSON-safety/resource scans;
- output envelope checks;
- structured output errors;
- report construction;
- no partial result on failure.

Migration code is application-installed trusted code. A document cannot name or load executable modules.

## 5. Registration invariants

Every registration is normalized before insertion:

1. descriptor must be an object;
2. `migrate` must be a function;
3. every version must parse through `parsePlotJsonVersion()`;
4. `toVersion` must be strictly greater than `fromVersion`;
5. Definition `plotType` values must be non-empty strings;
6. the normalized descriptor and nested references are copied and frozen;
7. one source node may have only one outgoing edge;
8. invalid insertion is rolled back without changing the registry.

The single-outgoing-edge rule rejects both exact duplicates and branches:

```text
1.0.0 → 1.1.0
1.0.0 → 2.0.0   rejected
```

The initial runtime does not choose shortest paths, weights or priorities. Ambiguous history is a developer configuration error.

## 6. Strictly increasing graph

Every edge must advance the numeric version tuple:

```text
1.0.0 → 1.1.0   valid
1.0.0 → 1.0.0   rejected
2.0.0 → 1.9.0   rejected
```

This rule makes downgrade, self-edge and normal cycles impossible in a valid registry. The implementation still performs explicit cycle validation and exposes a stable developer-facing cycle error so future refactors cannot silently weaken the invariant.

## 7. Developer-facing registry errors

Invalid trusted registry configuration throws `PlotJsonMigrationRegistryError`, derived from `PlotLibreError`.

Codes:

```text
PLOTJSON_MIGRATION_REGISTRATION_INVALID
PLOTJSON_MIGRATION_SOURCE_DUPLICATE
PLOTJSON_MIGRATION_GRAPH_CYCLE
```

Optional scalar context:

```text
scope
sourceVersion
targetVersion
plotType
```

These are distinct from document-input failures. A missing path or unsupported input version still throws the existing `PlotJsonError` codes.

## 8. Deterministic planning

### 8.1 Document plan

```ts
registry.planDocument("1.0.0", "2.0.0")
```

Algorithm:

```text
parse source and target
→ equal: return shared frozen empty plan
→ source newer: reject unsupported
→ follow the unique outgoing edge
→ reject missing edge
→ reject an edge that overshoots target
→ stop only at exact target
→ return frozen ordered step array
```

### 8.2 Definition plan

```ts
registry.planDefinition(
  { plotType: "arrow.legacy", definitionVersion: "1.0.0" },
  { plotType: "arrow.current", definitionVersion: "2.0.0" },
)
```

The planner follows exact pair nodes, so arriving at the correct version under the wrong `plotType` does not count as success.

### 8.3 Registration-order independence

Registry snapshots are sorted by stable scalar keys. Planning follows source-key lookup, not insertion order. Registering the same valid edges in reverse order yields the same chain.

### 8.4 No best effort

The planner does not:

- skip a missing intermediate step;
- choose a nearby target;
- stop at the greatest version below target;
- infer a renamed `plotType`;
- plan a downgrade;
- execute a partial chain.

## 9. Immutability

The registry copies scalar descriptor fields and Definition references at registration. Caller mutation after registration cannot change stored history.

Returned values:

```text
documentMigrations     fresh frozen sorted array
                    ↘ stable frozen step objects

definitionMigrations   fresh frozen sorted array
                    ↘ stable frozen step/reference objects

planDocument()          frozen ordered array
planDefinition()        frozen ordered array
```

Migration function identity is intentionally preserved because the function is trusted installed code.

## 10. Report record model

008B defines report facts without constructing reports from documents yet.

```ts
interface PlotJsonMigrationReport {
  readonly sourceSchemaVersion: string;
  readonly targetSchemaVersion: string;
  readonly documentSteps: readonly PlotJsonAppliedDocumentStep[];
  readonly featureSteps: readonly PlotJsonFeatureMigrationRecord[];
  readonly normalizations: readonly PlotJsonNormalizationRecord[];
  readonly warnings: readonly PlotJsonWarning[];
}
```

Definition applied steps retain explicit `from` and `to` references, so a type rename remains visible.

`createPlotJsonMigrationReport()`:

- copies every array;
- copies every record;
- copies nested Definition references;
- deeply freezes the structural envelope;
- omits absent optional scalar fields rather than materializing `undefined`;
- never stores a complete document, metadata object or migration function.

008C will create these records from actual successful execution and historical `1.0.0` normalization.

## 11. Stable normalization and warning codes

Normalization facts:

```text
PLOTJSON_DEFINITION_VERSION_DEFAULTED
PLOTJSON_PARAMETERS_DEFAULTED
PLOTJSON_STYLE_DEFAULTED
PLOTJSON_FEATURE_METADATA_DEFAULTED
PLOTJSON_REVISION_DEFAULTED
PLOTJSON_UNKNOWN_FIELD_DROPPED
```

Warnings:

```text
PLOTJSON_INVALID_RECORD_DEFAULTED
PLOTJSON_INVALID_REVISION_DEFAULTED
PLOTJSON_UNKNOWN_FIELD_DROPPED
```

These records contain code, JSON path and optional feature identity only.

## 12. Complexity

For `E` registered edges and a planned chain of length `L`:

```text
registration normalization: O(1)
graph validation:          O(E) per registration
snapshot sorting:          O(E log E)
planning:                  O(L)
```

Migration histories are expected to be small. 008B intentionally favors explicit validation and reviewability over a more complex mutable graph index. Tests prove a 256-step chain plans iteratively and in exact order.

These are algorithmic properties, not latency SLAs.

## 13. Test matrix

Current 008B tests cover:

- deterministic document chains;
- registration-order independence;
- exact-version empty plans;
- missing and overshooting paths;
- newer-source rejection;
- exact duplicate and branch rejection;
- malformed, self and decreasing registrations;
- same-type Definition chains;
- explicit multi-step `plotType` rename;
- wrong-type target rejection;
- Definition version/input errors;
- sorted immutable registry snapshots;
- caller mutation isolation;
- planning never invoking migration functions;
- 256-step iterative planning;
- deeply frozen copied reports;
- absent optional report fields;
- detached empty report arrays;
- all historical tests and browser regressions.

## 14. Explicit exclusions

008B does not implement:

```text
migration execution
safe output scanning
readPlotDocument()
parsePlotDocument() replacement
historical 1.0 normalization reporting
document invariants or duplicate-id detection
Definition target lookup/enforcement
Registry canonicalize/generate preflight
Store replacement
MapLibre import changes
production migration registrations
schema bump
007D group/lock/visibility/z-order fields
```

## 15. Next boundary

008C may start only after 008B exact-head validation, squash merge and post-merge authority synchronization.

008C owns:

1. safe string/direct-object reader boundary;
2. migration execution over cloned JSON objects;
3. output safety and resource scans after every step;
4. current `1.0.0` decode and historical normalization records;
5. document-wide invariants and duplicate feature-id rejection;
6. Definition plan execution and final version equality;
7. `readPlotDocument()` plus compatibility `parsePlotDocument()` wrapper;
8. current/legacy/invalid/future fixtures and idempotence tests.

Store and MapLibre mutation remain 008D work.

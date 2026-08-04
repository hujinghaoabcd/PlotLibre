# PlotLibre Development Contract

This file defines mandatory rules for every developer, coding agent and future conversation.

## 1. Product model

Canonical authored state:

```text
PlotDefinition + authored controlPoints + parameters + style + metadata
```

Generated geometry, samples, local frames, pivots, selection/region/transform overlays, handles and previews are derived. They cannot replace authored state or enter PlotJSON.

Groups, locks, visibility and z-order are future schema-owned core state. They cannot be hidden in metadata.

## 2. Dependency direction

```text
core <- geometry <- symbols
core <- interaction
core + interaction <- maplibre
public packages <- playground / wrappers
```

Core cannot depend on geometry, MapLibre, DOM or UI. Geometry and interaction remain engine-independent. MapLibre owns projection, rendered queries, browser events and derived UI. Playground consumes public APIs and cannot duplicate framework algorithms.

PlotJSON versioning, JSON safety, migration, validation and import preparation belong in `@plotlibre/core`.

## 3. Current authority

```text
main SHA:             409786f6a55aeab6e810651410954d78123e32d3
workspace:            0.0.22
current schema:       PlotJSON 1.0.0
production migrations: none
public symbols:       19 (14 Arrow + 1 Line + 4 Area)
merged Node baseline: 348
Chromium baseline:    34
MapLibre Sources:     4
MapLibre Layers:      10
benchmark jobs:       region selection + selection transform
007A:                 merged PR #38/#39
007B:                 merged PR #40–#44
007B-P:               merged PR #45/#46
007C:                 merged PR #47–#50
008 design:           merged PR #51/#52
008A runtime:         merged PR #53/#54
008B runtime:         merged PR #55
current branch:       agent/008b-plotjson-post-merge-finalization
next runtime branch:  agent/008c-plotjson-reader-runtime
```

PR #55 exact-head authority:

```text
validated head:       c86bcc02d2b85bb1495d8a3e659d2e3d5ff18335
CI:                   30957964547 / #541
Node tests:           348
Chromium tests:       34
region artifact:      8911803937
transform artifact:   8911810112
review threads:       0
squash/main:          409786f6a55aeab6e810651410954d78123e32d3
```

Never use old-head evidence for a newer head. Design, runtime and post-merge finalization remain separate branches.

## 4. Canonical editing and selection

Selection is transient, ordered and Primary-last. It is excluded from PlotJSON and feature revision.

`PlotStore.applyTransaction()` stages one complete batch. `BatchEditCommand` captures exact before/after features, document order and selection. Batch delete, translation, rotation and scale each use one atomic command.

Preview, rejection, cancellation and no-op never enter Store or History.

Transform authored controls only. Preserve feature identity, Definition version, parameters, style, metadata, Store order, selection order and Primary. Each effectively changed feature receives exact `revision + 1`.

Uniform scale is `[0.01,100]`. Reflection, negative/non-uniform scale, skew and snapping remain excluded.

## 5. PlotJSON design authority

```text
docs/PLOTJSON_SPEC.md
docs/design/plotjson-migrations.md
docs/design/plotjson-compatibility-matrix.md
docs/algorithms/plotjson-migration-pipeline.md
docs/handover/2026-08-05-milestone-008-plotjson-migrations-design.md
docs/handover/2026-08-05-milestone-008-design-post-merge-finalization.md
```

Document `schemaVersion` owns document structure, order, references and future persisted editor state. Feature `definitionVersion` owns one Definition's authored control and parameter semantics.

Required eventual order:

```text
raw document
→ document schema migration
→ current document decode
→ Definition migration for every feature
→ final Definition-version equality
→ Registry preflight
→ atomic Store replacement
```

## 6. Merged 008A authority

```text
packages/core/src/plotjson-version.ts
packages/core/src/plotjson-error.ts
packages/core/src/plotjson-safety.ts
docs/design/plotjson-version-json-safety-runtime.md
docs/handover/2026-08-05-milestone-008a-post-merge-finalization.md
```

Public foundations:

```text
PLOTJSON_DOCUMENT_TYPE
CURRENT_PLOTJSON_SCHEMA_VERSION
parsePlotJsonVersion
comparePlotJsonVersions
isCanonicalPlotJsonVersion
PlotJsonError / PlotJsonErrorCode
DEFAULT_PLOTJSON_LIMITS
resolvePlotJsonLimits
assertPlotJsonInputSize
clonePlotJsonValue
scanPlotJsonValue
```

Persisted versions are canonical numeric `MAJOR.MINOR.PATCH` triples. Direct-object safety accepts JSON primitives, dense arrays and plain/null-prototype objects only. Traversal is iterative, descriptor-based and getter-free. Prototype-sensitive keys must remain safe data properties.

Finite defaults:

```text
inputBytes:                16 MiB UTF-8
maximum depth:             128
total value nodes:         1,000,000
total object keys:         250,000
maximum string/key length: 1,000,000 UTF-16 code units
features:                  100,000
controls per feature:      10,000
total authored controls:   1,000,000
```

These are security ceilings, not product-size recommendations or latency SLAs.

## 7. Current `1.0.0` compatibility

Historical parser behavior remains binding until 008C:

```text
missing definitionVersion → "1.0.0"
missing/non-record parameters → {}
missing/non-record style → {}
missing/non-record feature metadata → {}
missing/non-integer revision → 0
unknown root/feature fields → dropped
```

008A and 008B are deliberately not connected to `parsePlotDocument()`, so same-version interpretation remains unchanged.

## 8. Merged 008B authority

Runtime:

```text
packages/core/src/plotjson-migration-types.ts
packages/core/src/plotjson-migration-registry.ts
packages/core/src/plotjson-migration-report.ts
```

Tests:

```text
tests/plotjson-migration-registry.test.mjs
tests/plotjson-migration-registry-hardening.test.mjs
tests/plotjson-migration-report.test.mjs
```

Documentation:

```text
docs/PLOTJSON_SPEC.md
docs/design/plotjson-migration-registry-runtime.md
docs/handover/2026-08-05-milestone-008b-migration-planning.md
docs/handover/2026-08-05-milestone-008b-post-merge-finalization.md
```

## 9. Migration graph domains

Document node:

```text
schemaVersion
```

Definition node:

```text
(plotType, definitionVersion)
```

A type rename is an explicit Definition edge:

```text
arrow.legacy@1.0.0
→ arrow.bridge@1.1.0
→ arrow.current@2.0.0
```

Migration code remains separate from `PlotDefinition.generate()` and `PlotRegistry` aliases.

## 10. Registration rules

Every migration registration must satisfy:

- descriptor object exists;
- `migrate` is a function;
- versions parse through `parsePlotJsonVersion()`;
- target version is strictly greater than source version;
- Definition plot types are non-empty strings;
- normalized descriptors and references are copied and frozen;
- one source node has zero or one outgoing edge;
- exact duplicate and branch both reject;
- invalid insertion leaves the registry unchanged;
- registration order cannot change a valid plan.

Developer configuration errors:

```text
PLOTJSON_MIGRATION_REGISTRATION_INVALID
PLOTJSON_MIGRATION_SOURCE_DUPLICATE
PLOTJSON_MIGRATION_GRAPH_CYCLE
```

They use `PlotJsonMigrationRegistryError`, a `PlotLibreError` subclass, not `PlotJsonError` for untrusted documents.

## 11. Planning rules

`planDocument()` and `planDefinition()`:

- validate source and target first;
- return a shared frozen empty plan for exact equality;
- reject a newer source/downgrade;
- follow only the unique outgoing edge;
- reject missing or overshooting paths;
- require exact target version and exact target plot type;
- return frozen ordered arrays;
- never invoke migration functions;
- never choose a shortest, nearest or best-effort path.

Untrusted path failures reuse stable PlotJSON codes:

```text
PLOTJSON_SCHEMA_VERSION_INVALID
PLOTJSON_SCHEMA_VERSION_UNSUPPORTED
PLOTJSON_MIGRATION_PATH_MISSING
PLOTJSON_DEFINITION_NOT_FOUND
PLOTJSON_DEFINITION_VERSION_INVALID
PLOTJSON_DEFINITION_VERSION_UNSUPPORTED
PLOTJSON_DEFINITION_MIGRATION_PATH_MISSING
```

## 12. Migration purity boundary

`PlotJsonMigrationFunction` is trusted synchronous application-installed code. In 008B it is stored but never called.

008C execution must ensure each step:

- receives a cloned JSON object;
- cannot mutate caller input;
- returns a new JSON object;
- is followed by JSON-safety/resource scanning;
- produces deterministic output and report;
- exposes no partial result on failure;
- reads no clock, random, network, DOM, MapLibre, Store or History.

Documents cannot name executable modules.

## 13. Report record contract

`PlotJsonMigrationReport` contains facts only:

```text
sourceSchemaVersion
targetSchemaVersion
documentSteps
featureSteps
normalizations
warnings
```

Definition applied steps retain explicit source/target references so plotType renames are auditable.

`createPlotJsonMigrationReport()` copies and deeply freezes arrays, records and nested references. It must not retain complete documents, metadata or migration functions.

## 14. 008C frozen boundary

After this Markdown-only finalization merges, create:

```text
agent/008c-plotjson-reader-runtime
```

008C owns:

1. string UTF-8 size guard and JSON syntax parsing;
2. direct-object JSON safety/resource clone;
3. minimal document type/schema envelope;
4. document plan execution over cloned JSON;
5. output scan after every migration step;
6. current `1.0.0` decoding and compatibility normalization facts;
7. document invariants and duplicate feature ids;
8. Definition plan execution and final version equality;
9. immutable report-bearing `readPlotDocument()`;
10. compatibility `parsePlotDocument()` wrapper;
11. current, legacy, invalid and future fixtures;
12. repeat-read/idempotence tests.

008C cannot mutate Store or MapLibre. Atomic import remains 008D.

## 15. Future atomic import

Current `PlotLibre.importDocument()` still preflights then performs:

```text
store.clear()
→ repeated store.add(feature)
```

A duplicate id can fail after partial replacement. 008D must prepare everything in memory and commit one exact ordered Store document transaction.

Expected input failure preserves Store, order, selection, History and active interaction state.

## 16. Runtime sequence

```text
008A version / JSON safety / limits / errors — merged
008B migration registry / planner / report records — merged
008C report-bearing reader / compatibility / invariants — next
008D Registry-aware preparation / atomic import
008E compatibility fixtures / docs / synchronization
```

007D groups, locks, visibility and z-order remain blocked through 008D/E.

## 17. Validation gate

Every exact runtime head must pass:

```text
Node 20.19
Node 22
all Node tests (current merged baseline 348)
Playground typecheck/build
handover contract
region benchmark
selection-transform benchmark
34 Chromium tests
zero unresolved review threads
```

## 18. Merge discipline

Design, runtime and finalization use separate branches. Runtime remains Draft until exact-head green; every review thread is resolved; immutable handover is written; Ready state does not change head; squash merge uses expected SHA; `main` is verified; post-merge synchronization starts only from latest `main`.

Post-merge finalization must be Markdown-only. The next runtime branch must be created only after finalization reaches `main`.

Current exclusions include reflection, non-uniform scale, groups/locks/visibility/z-order runtime, snapping, touch transforms, new symbols, unresolved-feature mode, future-version best effort, downgrade migrations and PlotJSON shortcuts.

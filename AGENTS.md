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

PlotJSON versioning, JSON safety, migration, reading, validation and import preparation belong in `@plotlibre/core`.

## 3. Current authority

```text
main SHA:              9d5b8dc23ad0e5b4ae6be3d1d1656f6d84f6adbe
workspace:             0.0.22
current schema:        PlotJSON 1.0.0
production migrations: none
public symbols:        19 (14 Arrow + 1 Line + 4 Area)
merged Node baseline:  375
Chromium baseline:     34
MapLibre Sources:      4
MapLibre Layers:       10
benchmark jobs:        region selection + selection transform
007A:                  merged PR #38/#39
007B:                  merged PR #40–#44
007B-P:                merged PR #45/#46
007C:                  merged PR #47–#50
008 design:            merged PR #51/#52
008A runtime:          merged PR #53/#54
008B runtime:          merged PR #55/#56
008C runtime:          merged PR #57
current branch:        agent/008c-plotjson-post-merge-finalization
next runtime branch:   agent/008d-plotjson-atomic-import-runtime
```

PR #57 exact-head authority:

```text
validated head:       ecd14daa1b83f6702027aca785e326f510e267cf
CI:                   30962224541 / #559
Node tests:           375
Chromium tests:       34
region artifact:      8913362065
transform artifact:   8913357021
review threads:       0
squash/main:          9d5b8dc23ad0e5b4ae6be3d1d1656f6d84f6adbe
```

Never use old-head evidence for a newer head. Design, runtime and post-merge finalization remain separate branches.

## 4. Canonical editing and selection

Selection is transient, ordered and Primary-last. It is excluded from PlotJSON and feature revision.

`PlotStore.applyTransaction()` stages one complete batch. `BatchEditCommand` captures exact before/after features, document order and selection. Batch delete, translation, rotation and scale each use one atomic command.

Preview, rejection, cancellation and no-op never enter Store or History.

Transform authored controls only. Preserve feature identity, Definition version, parameters, style, metadata, Store order, selection order and Primary. Each effectively changed feature receives exact `revision + 1`.

Uniform scale is `[0.01,100]`. Reflection, negative/non-uniform scale, skew and snapping remain excluded.

## 5. PlotJSON authority

```text
docs/PLOTJSON_SPEC.md
docs/design/plotjson-migrations.md
docs/design/plotjson-compatibility-matrix.md
docs/design/plotjson-version-json-safety-runtime.md
docs/design/plotjson-migration-registry-runtime.md
docs/design/plotjson-reader-runtime.md
docs/algorithms/plotjson-migration-pipeline.md
```

Document `schemaVersion` owns document structure, order, references and future persisted editor state. Feature `definitionVersion` owns one Definition's authored control and parameter semantics.

Required complete import order:

```text
untrusted input
→ document schema migration
→ current document decode
→ Definition migration for every feature
→ final Definition-version equality
→ Registry canonicalize/generate preflight
→ atomic Store replacement
```

008C owns the pure stages through the immutable current document/report. 008D owns live Registry binding and application-state commit.

## 6. Merged 008A authority

```text
packages/core/src/plotjson-version.ts
packages/core/src/plotjson-error.ts
packages/core/src/plotjson-safety.ts
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

Persisted versions are canonical numeric `MAJOR.MINOR.PATCH` triples. Direct-object safety accepts JSON primitives, dense arrays and plain/null-prototype objects only. Traversal is iterative, descriptor-based and getter-free. Prototype-sensitive keys remain safe data properties.

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

## 7. Merged 008B authority

Runtime:

```text
packages/core/src/plotjson-migration-types.ts
packages/core/src/plotjson-migration-registry.ts
packages/core/src/plotjson-migration-report.ts
```

Document node:

```text
schemaVersion
```

Definition node:

```text
(plotType, definitionVersion)
```

A type rename is an explicit Definition edge, not a `PlotRegistry` alias.

Registration requires canonical strictly increasing versions, non-empty plot types, frozen copied descriptors and one outgoing edge per source node. Duplicate, branch, self, decreasing and cycle configurations reject.

Planning follows only the unique exact chain, returns frozen steps and never invokes migration functions.

## 8. Merged 008C authority

Runtime:

```text
packages/core/src/plotjson-reader.ts
packages/core/src/plotjson-current-decoder.ts
packages/core/src/plotjson.ts
packages/core/src/index.ts
```

Public API:

```ts
readPlotDocument(input, options?): ReadPlotDocumentResult
parsePlotDocument(input, options?): PlotDocument
```

`readPlotDocument()` accepts text or direct values and returns a detached deeply frozen current document plus immutable migration report. `parsePlotDocument()` is a compatibility wrapper returning only the document.

## 9. Reader input rules

Text input:

- measure UTF-8 bytes before parsing;
- reject syntax with `PLOTJSON_SYNTAX_INVALID`;
- expose no partial result.

Direct input:

- run descriptor-safe cloning before semantic access;
- never invoke getters;
- reject accessors, symbols, hidden properties, custom prototypes, sparse arrays, cycles, non-finite values and non-JSON object families;
- do not reuse caller containers.

## 10. Document migration execution rules

Every trusted document step:

```text
safe cloned JSON input
→ freeze input
→ synchronous migration function
→ require a new object
→ reject Promise/async output
→ descriptor-safe output clone and resource scan
→ exact target type/schema envelope
→ append report fact only after success
```

Expected failure uses `PLOTJSON_MIGRATION_OUTPUT_INVALID` and cannot mutate caller input or expose a partial result.

Documents cannot name executable modules.

## 11. Current 1.0 compatibility

Merged behavior:

```text
missing/non-string definitionVersion → "1.0.0"
missing/non-record parameters         → {}
missing/non-record style              → {}
missing/non-record feature metadata   → {}
missing/invalid revision              → 0
unknown root/feature fields           → dropped
```

These results are now represented in `PlotJsonMigrationReport` as normalization and warning facts. Unknown fields are visited in sorted key order.

The reader also rejects malformed root/feature structures, invalid control coordinates, non-canonical present Definition versions and duplicate feature ids.

## 12. Definition migration rules

`definitionTargets` is explicit application configuration keyed by the source plotType after current document decoding.

When the map is omitted, parser-only 1.0 compatibility remains available and no live Registry equality is claimed.

When supplied:

- every source plotType requires an own target;
- exact source/target equality performs no migration;
- all other targets require an exact 008B chain;
- every step receives frozen cloned feature JSON;
- every output is a new synchronous JSON object;
- every output is generic JSON/resource scanned;
- `controlPointsPerFeature` is enforced after every step;
- feature id remains stable;
- output plotType/version equals the exact step target;
- malformed final feature decoding is attributed to Definition migration;
- final feature equals the requested target reference.

Explicit plotType renames remain auditable in the report.

## 13. Final semantic-budget scan

A standalone feature root cannot infer document semantic roles or aggregate controls. After all Definition migrations, 008C rebuilds and scans the complete final document.

This final scan enforces:

```text
features
controlPointsPerFeature
totalControlPoints
depth
totalNodes
objectKeys
stringLength
```

Do not remove this scan or assume per-feature scans are sufficient.

## 14. Result and error contract

Successful reader output is detached and deeply frozen, including document, features, controls, parameters, styles, metadata and report records.

Expected errors retain scalar context only:

```text
path
featureId
plotType
sourceVersion
targetVersion
limitName
limit
actual
cause
```

They must not retain complete documents or business metadata.

## 15. 008D frozen boundary

Create only after this Markdown-only finalization merges:

```text
agent/008d-plotjson-atomic-import-runtime
```

008D owns:

1. derive final Definition targets from live `PlotRegistry`;
2. require final Definition-version equality;
3. call the pure reader before mutation;
4. canonicalize/generate every feature in memory;
5. validate complete ids and exact order;
6. add one atomic Store document-replacement operation;
7. emit one Store batch event;
8. preserve Store/order/selection/History/interactions on expected failure;
9. clear incompatible transient state only after success;
10. integrate `PlotLibre.importDocument()` and MapLibre derived refresh;
11. add Node and Chromium rollback/success regressions.

008D cannot introduce a schema bump, groups, locks, visibility, z-order, downgrade migration, unresolved-feature mode or future-version best effort.

## 16. Current import limitation

The current high-level import still performs:

```text
Registry preflight
→ store.clear()
→ repeated store.add(feature)
```

This is not atomic under all later failures. 008D must prepare the complete candidate first and commit one exact ordered replacement.

## 17. Runtime sequence

```text
008A version / JSON safety / limits / errors — merged
008B migration registry / planner / report records — merged
008C safe reader / execution / compatibility / invariants — merged
008D Registry-aware preparation / atomic import — next
008E compatibility fixtures / docs / synchronization
```

007D groups, locks, visibility and z-order remain blocked through 008D/E.

## 18. Validation gate

Every exact runtime head must pass:

```text
Node 20.19
Node 22
all Node tests (current merged baseline 375)
Playground typecheck/build
handover contract
region benchmark
selection-transform benchmark
34 Chromium tests
zero unresolved review threads
```

## 19. Merge discipline

Design, runtime and finalization use separate branches. Runtime remains Draft until exact-head green; every review thread is resolved; immutable handover is written; Ready state does not change head; squash merge uses expected SHA; `main` is verified; post-merge synchronization starts only from latest `main`.

Post-merge finalization must be Markdown-only. The next runtime branch must be created only after finalization reaches synchronized `main`.

Current exclusions include reflection, non-uniform scale, groups/locks/visibility/z-order runtime, snapping, touch transforms, new symbols, unresolved-feature mode, future-version best effort, downgrade migrations and PlotJSON shortcuts.

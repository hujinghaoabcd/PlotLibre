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

PlotJSON versioning, JSON safety, migration, reading, live-Definition preparation and Store transaction primitives belong in `@plotlibre/core`. MapLibre owns high-level application-state coordination after pure preparation.

## 3. Current authority

```text
base main SHA:         b1c394f93a0a685d291fba54207dad9f9d020cb2
workspace:             0.0.22
current schema:        PlotJSON 1.0.0
production migrations: none
public symbols:        19 (14 Arrow + 1 Line + 4 Area)
merged Node baseline:  375
008D candidate:        400 Node
Chromium baseline:     34
MapLibre Sources:      4
MapLibre Layers:       10
benchmark jobs:        region selection + selection transform
008A runtime:          merged PR #53/#54
008B runtime:          merged PR #55/#56
008C runtime:          merged PR #57/#58
008D runtime:          Draft PR #59
current branch:        agent/008d-plotjson-atomic-import-runtime
next milestone:        008E compatibility closure
```

Never use old-head evidence for a newer head. Design, runtime and post-merge finalization remain separate branches.

## 4. Canonical editing and selection

Selection is transient, ordered and Primary-last. It is excluded from PlotJSON and feature revision.

`PlotStore.applyTransaction()` stages one complete batch. `BatchEditCommand` captures exact before/after features, document order and selection. Batch delete, translation, rotation and scale each use one atomic command.

Preview, rejection, cancellation and no-op never enter Store or History.

Transform authored controls only. Preserve feature identity, Definition version, parameters, style, metadata, Store order, selection order and Primary. Each effectively changed interactive feature receives exact `revision + 1`.

Uniform scale is `[0.01,100]`. Reflection, negative/non-uniform scale, skew and snapping remain excluded.

## 5. PlotJSON authority

```text
docs/PLOTJSON_SPEC.md
docs/design/plotjson-migrations.md
docs/design/plotjson-compatibility-matrix.md
docs/design/plotjson-version-json-safety-runtime.md
docs/design/plotjson-migration-registry-runtime.md
docs/design/plotjson-reader-runtime.md
docs/design/plotjson-atomic-import-runtime.md
docs/algorithms/plotjson-migration-pipeline.md
```

Document `schemaVersion` owns document structure, order, references and future persisted editor state. Feature `definitionVersion` owns one Definition's authored control and parameter semantics.

Complete import order:

```text
untrusted input
→ document migration/current decode
→ live Definition target derivation
→ Definition migration
→ final Definition-version equality
→ Registry canonicalize/generate preflight
→ final detached document scan
→ one atomic Store replacement
→ post-success transient-state cleanup
```

## 6. Merged 008A authority

```text
packages/core/src/plotjson-version.ts
packages/core/src/plotjson-error.ts
packages/core/src/plotjson-safety.ts
```

Persisted versions are canonical numeric `MAJOR.MINOR.PATCH`. Direct-object traversal is iterative, descriptor-based and getter-free. It rejects non-JSON values, custom prototypes, accessors, hidden/symbol properties, sparse arrays and cycles.

Finite default ceilings:

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

```text
packages/core/src/plotjson-migration-types.ts
packages/core/src/plotjson-migration-registry.ts
packages/core/src/plotjson-migration-report.ts
```

Document nodes are schema versions. Definition nodes are exact `(plotType, definitionVersion)` references. A type rename is an explicit edge, not a Registry alias.

Registration requires canonical strictly increasing versions, frozen copied descriptors and at most one outgoing edge per source. Duplicate, branch, self, decreasing and cycle configurations reject.

Planning follows only the unique exact chain and never invokes migration functions.

## 8. Merged 008C authority

```text
packages/core/src/plotjson-reader.ts
packages/core/src/plotjson-current-decoder.ts
packages/core/src/plotjson.ts
```

```ts
readPlotDocument(input, options?): ReadPlotDocumentResult
parsePlotDocument(input, options?): PlotDocument
```

The reader accepts text or direct values, executes trusted synchronous document/Definition migrations on frozen cloned JSON, scans every output, records current-1.0 compatibility normalization, rejects duplicate ids and returns a detached deeply frozen document/report.

A standalone Definition feature scan cannot enforce aggregate document controls. 008C therefore checks `controlPointsPerFeature` after every Definition step and scans the rebuilt complete document for `totalControlPoints` and all other semantic limits.

## 9. 008D pure preparation authority

```text
packages/core/src/plotjson-import.ts
```

```ts
preparePlotDocumentImport(input, registry, options?)
deriveRegistryDefinitionTargets(features, registry, migrations)
```

Preparation mutates no Store, History, selection, interaction or renderer state.

It uses three bounded reader passes:

```text
Pass 1: input → document migration/current decode
Pass 2: current document → Definition migration
Pass 3: Registry-canonical document → final detach/safety scan
```

Document migrations execute once only. Definition migrations execute once per required edge. Pass 3 executes no migration.

## 10. Live Definition target rules

Every live Definition must expose a canonical numeric version.

For each source reference:

```text
exactly matches live Definition
→ use source, no migration

otherwise
→ follow unique outgoing Definition edges
→ stop at first exact live Definition
```

Never infer aliases, nearest versions or best effort.

Expected failures:

```text
unknown source            PLOTJSON_DEFINITION_NOT_FOUND
incomplete chain          PLOTJSON_DEFINITION_MIGRATION_PATH_MISSING
source newer than live    PLOTJSON_DEFINITION_VERSION_UNSUPPORTED
invalid live version      PLOTJSON_DEFINITION_VERSION_INVALID
```

The reader target map is keyed by source plotType. Multiple historical versions of one source type may converge to one live target. If they resolve to different targets, reject the document.

## 11. Registry preflight rules

After migration:

```text
feature.plotType === definition.type
feature.definitionVersion === canonical definition.version
```

Then every feature must pass:

```text
registry.canonicalize(feature)
registry.generate(canonicalFeature)
```

Any validation or generation failure occurs before Store mutation. Canonicalized features pass through a final reader clone/limit scan.

Registry canonicalization is not schema migration history and is not added to `PlotJsonMigrationReport`.

## 12. Atomic Store document replacement

```text
packages/core/src/store.ts
```

`PlotStore.replaceDocument(features)` must:

- clone the complete candidate first;
- reject duplicate ids before mutation;
- classify new ids as additions;
- classify reused ids as exact replacements;
- classify old-only ids as removals;
- enforce exact imported order;
- reuse one staged `applyTransaction()`;
- commit one Store Map;
- emit one immutable `batch` event.

Imported revisions are preserved exactly. Import replacement is not an interactive revision increment.

Store listener failures occur after commit and cannot roll back canonical Store state.

## 13. High-level atomic import

```text
packages/maplibre/src/plotlibre.ts
```

```ts
plot.importDocumentWithReport(input): ReadPlotDocumentResult
plot.importDocument(input): PlotDocument
```

`PlotLibreOptions` accepts:

```ts
migrations?: PlotJsonMigrationRegistry
plotJsonLimits?: Partial<PlotJsonLimits>
```

The migration registry is retained intentionally. PlotJSON limits are copied/frozen at construction so caller mutation cannot change the active policy.

High-level sequence:

```text
preparePlotDocumentImport
→ store.replaceDocument
→ post-success cleanup
```

No interaction is cancelled and no History/selection state is cleared before pure preparation and Store commit succeed.

## 14. Precommit failure preservation

Every expected precommit failure must preserve:

```text
Store contents and exact order
selection membership and Primary
History undo/redo stacks
active drawing session and draft
armed/active box or lasso
armed/active rotation or scale
active selection translation
committed MapLibre rendering
```

Do not move cleanup before the Store commit.

## 15. Success cleanup and failure isolation

After successful Store commit:

```text
cancel selection transform
cancel region selection
cancel translation
cancel drawing
clear selection
clear History
```

Each cleanup operation runs independently. External listener failures are captured, remaining cleanup continues and failures are logged.

A committed import must not be reported to its caller as failed. Logging failure also cannot throw from import.

## 16. Events and rendering

A successful changed import emits one Store `batch` event. The renderer's existing Store subscription rebuilds derived committed GeoJSON from the complete new Store snapshot.

008D adds no MapLibre Source or Layer.

## 17. Current API compatibility

`importDocument()` continues to return a `PlotDocument`. It delegates to `importDocumentWithReport()` and returns only `.document`.

`parsePlotDocument()` remains the document-only wrapper over `readPlotDocument()`.

## 18. Explicit non-goals

008D does not:

```text
bump schemaVersion
register production migrations
make import undoable
persist selection or History
change Definition geometry algorithms
add renderer resources
support unresolved Definitions
support downgrade/future-version best effort
add groups, locks, visibility or z-order
```

History is cleared after successful import because previous commands reference the replaced document.

## 19. Validation gate

Every exact 008D head must pass:

```text
Node 20.19
Node 22
all Node tests (candidate baseline 400)
Playground typecheck/build
handover contract
region benchmark
selection-transform benchmark
34 Chromium tests
zero unresolved review threads
```

## 20. Next milestone

008E closes the PlotJSON evolution sequence with golden compatibility fixtures, completed matrices, public examples, end-to-end round-trip/rollback fixtures and final documentation synchronization.

007D groups, locks, visibility and z-order remain blocked until 008E closes this foundation.

## 21. Merge discipline

Runtime remains Draft until final exact-head green; every review thread is resolved; immutable handover is complete; Ready does not change head; squash merge uses expected SHA; `main` is verified; post-merge finalization begins only from latest `main`.

The 008D post-merge finalization must be Markdown-only. 008E starts only after finalization reaches synchronized `main`.

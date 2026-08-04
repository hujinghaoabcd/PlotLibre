# PlotLibre Architecture

## 1. Product boundary

PlotLibre is a MapLibre-native but engine-independent framework for semantic parametric situation plots and tactical graphics.

Canonical authored state:

```text
PlotDefinition + authored controlPoints + parameters + style + metadata
```

Generated GeoJSON, samples, local frames, pivots, handles, guides, selection overlays, region paths and transform previews are derived. They cannot replace authored controls or enter PlotJSON as canonical state.

Current baseline:

```text
main:               409786f6a55aeab6e810651410954d78123e32d3
workspace:          0.0.22
PlotJSON:           PlotLibreDocument / 1.0.0
production migrations: none
public Definitions: 19 (14 Arrow + 1 Line + 4 Area)
Node:               20.19+
merged tests:       348 Node / 34 Chromium
MapLibre:           6.0.0 in Playground
renderer:           4 Sources / 10 Layers
008A:               merged PR #53/#54
008B:               merged PR #55
next:               008C safe reader and migration execution
```

## 2. Dependency direction

```text
core <- geometry <- symbols
core <- interaction
core + interaction <- maplibre
public packages <- playground / wrappers
```

Rules:

- `core` cannot depend on geometry, MapLibre, DOM or UI;
- `geometry` cannot depend on MapLibre, DOM or UI;
- `symbols` owns pure parametric Definitions and uses geometry;
- `interaction` owns engine-independent sessions, selection and commands;
- `maplibre` owns projection, rendered queries, map events and browser overlays;
- Playground consumes public package APIs and cannot duplicate canonical algorithms.

## 3. Packages

### 3.1 `@plotlibre/core`

Responsibilities:

- domain and JSON types;
- `PlotRegistry` canonicalization, validation and generation;
- transactional `PlotStore`;
- reversible commands and `CommandHistory`;
- current PlotJSON parser/serializer;
- persisted-version parsing and comparison;
- descriptor-safe JSON cloning and resource limits;
- migration graph registration and deterministic planning;
- immutable migration report record types;
- engine-independent errors and invariants.

Current key modules:

```text
commands.ts
errors.ts
history.ts
plotjson.ts
plotjson-error.ts
plotjson-safety.ts
plotjson-version.ts
plotjson-migration-types.ts
plotjson-migration-registry.ts
plotjson-migration-report.ts
registry.ts
store.ts
types.ts
```

008A safety and 008B planning remain disconnected from the historical parser until 008C. Store and MapLibre import remain unchanged until 008D.

### 3.2 `@plotlibre/geometry`

Pure local/geodesic projection, vectors, bearings, polyline metrics, curves, offsets, circular geometry, ring topology, arrow heads, ribbons and antimeridian utilities.

### 3.3 `@plotlibre/symbols`

Nineteen public Definitions:

```text
arrow.straight
arrow.fine
arrow.fine.tailed
arrow.assault-direction
arrow.curved
arrow.attack
arrow.attack.tailed
arrow.double
arrow.pincer
arrow.squad-combat
arrow.route
arrow.corridor
arrow.route.bidirectional
arrow.route.double-head
line.circular-arc
area.closed-curve
area.gathering-place
area.circular-segment
area.sector
```

Each Definition owns stable `plotType`, Definition version, authored control semantics, defaults, canonicalization where permitted, validation, derived geometry and optional semantic guides. A Definition never owns browser input, migration registration or Store mutation.

### 3.4 `@plotlibre/interaction`

Draw sessions, ordered multi-selection, region geometry, batch commands, local translation, shared-pivot clockwise rotation and positive uniform scale. It cannot reference MapLibre, DOM or WebGL.

### 3.5 `@plotlibre/maplibre`

Derived renderer, Source/Layer lifecycle, broad-phase queries, exact projected region resolution, browser event normalization, semantic handles, selection transforms, DOM/SVG overlays, high-level `PlotLibre` facade and style lifecycle.

### 3.6 `@plotlibre/playground`

Browser demonstration, Nanjing samples, PlotJSON UI, real Chromium E2E and GitHub Pages deployment. It is a consumer rather than a second implementation.

## 4. Canonical data model

```text
PlotFeature
├── id
├── plotType
├── definitionVersion
├── controlPoints
├── parameters
├── style
├── metadata
└── revision
```

Rules:

- ids are stable and document-unique;
- `plotType` resolves one registered Definition;
- `definitionVersion` identifies authored symbol semantics;
- controls are WGS84 positions with Definition-owned order and roles;
- metadata is application data, not hidden core state;
- effective authored edits increment revision exactly once;
- generated geometry is discarded and regenerated as needed.

## 5. Definition pipeline

```text
PlotFeature input
→ Definition lookup by plotType
→ canonicalize authored controls where permitted
→ validate control/parameter/style semantics
→ Definition.generate
→ RenderBundle
```

`RenderBundle` may contain fills, lines, points, labels and hit areas. Every create, replace, draw completion, handle edit and selection transform performs complete Registry generation before Store mutation.

## 6. Store and History

`PlotStore.applyTransaction()` stages additions, replacements, removals and exact ordering before one commit. Failure leaves state unchanged. Success emits one immutable batch event. Listener exceptions are isolated after commit.

Commands capture exact values:

```text
CreatePlotCommand
ReplacePlotCommand
DeletePlotCommand
BatchEditCommand
```

History records successful effective mutations only. Preview, rejection, cancellation, selection and no-op do not enter History.

## 7. Selection, region and transforms

Selection is transient, ordered and Primary-last. It is excluded from PlotJSON and feature revision.

Region pipeline:

```text
CSS-pixel box/lasso
→ committed rendered broad phase
→ plotId deduplication and Store ordering
→ Registry.generate semantic geometry
→ map.project
→ exact point/line/polygon intersection
→ one selection event
```

Translation/rotation/scale pipeline:

```text
all selected authored controls
→ one order-independent local-metre frame
→ translation delta or fixed authored AABB-centre pivot
→ complete candidate transform
→ complete Registry preflight
→ one stale-safe atomic command
```

Uniform scale range is `[0.01,100]`. Reflection, non-uniform scale, skew and snapping remain excluded.

## 8. Renderer resources

Sources:

```text
plotlibre-committed
plotlibre-selection
plotlibre-draft
plotlibre-handles
```

Layers:

```text
plotlibre-fill
plotlibre-line
plotlibre-point
plotlibre-selection-line
plotlibre-selection-point
plotlibre-draft-fill
plotlibre-draft-line
plotlibre-draft-point
plotlibre-handle-guide
plotlibre-handle
```

DOM/SVG region and transform overlays are outside MapLibre resources. `style.load` rebuilds derived state from canonical Store and selection data.

## 9. PlotJSON version domains

Document `schemaVersion` owns document structure, fields, order, references, extensions and future groups, locks, visibility and z-order.

Feature `definitionVersion` owns one symbol's control roles, parameters and authored semantics.

They migrate independently and in order:

```text
JSON boundary
→ document schema migration
→ current document decode
→ Definition migration for every feature
→ final Definition-version equality
→ Registry preflight
→ atomic Store replacement
```

## 10. Merged 008A safety foundation

Persisted versions use canonical numeric `MAJOR.MINOR.PATCH` triples and numeric tuple comparison.

Direct-object input accepts only JSON primitives, dense arrays and plain/null-prototype objects. Iterative descriptor inspection rejects accessors, hidden/symbol properties, custom prototypes, sparse/custom arrays, non-finite values and cycles without invoking getters.

Default finite ceilings:

```text
16 MiB UTF-8 input
128 depth
1,000,000 value nodes
250,000 object keys
1,000,000 UTF-16 code units per string/key
100,000 features
10,000 controls per feature
1,000,000 total controls
```

They are security limits, not performance SLAs.

## 11. Merged 008B migration registry

### 11.1 Separate graph domains

```text
Document graph node:   schemaVersion
Definition graph node: (plotType, definitionVersion)
```

A Definition type rename is explicit:

```text
arrow.legacy@1.0.0
→ arrow.bridge@1.1.0
→ arrow.current@2.0.0
```

It is not a `PlotRegistry` alias.

### 11.2 Descriptor model

```ts
interface PlotJsonDocumentMigration {
  fromVersion: string;
  toVersion: string;
  migrate: PlotJsonMigrationFunction;
}

interface PlotJsonDefinitionMigration {
  from: PlotJsonDefinitionReference;
  to: PlotJsonDefinitionReference;
  migrate: PlotJsonMigrationFunction;
}
```

Migration functions are trusted application-installed synchronous code. 008B stores references but never executes them.

### 11.3 Registration

```text
validate descriptor/function
→ parse canonical versions
→ require strict version increase
→ copy and freeze descriptor/references
→ require one outgoing edge per source node
→ validate graph
→ commit registration or roll back
```

Duplicate and branch are the same invariant violation. Registration order cannot alter a valid plan.

### 11.4 Planner

```text
validate exact source/target
→ equal: frozen empty plan
→ reject downgrade
→ follow unique outgoing edge
→ reject missing edge or target overshoot
→ require exact target node
→ return frozen ordered plan
```

No shortest path, nearest version, alias inference or best effort exists. Planning never invokes migration functions.

### 11.5 Immutability and reports

Registry snapshots are fresh frozen sorted arrays containing stable frozen step objects. Definition references are copied and frozen. Caller mutation after registration cannot alter stored history.

`PlotJsonMigrationReport` contains source/target schema versions, document steps, per-feature Definition steps, normalizations and warnings. `createPlotJsonMigrationReport()` copies and deeply freezes the structural envelope and stores no complete document or executable function.

## 12. 008C reader architecture

008C is the next runtime slice. It will connect the existing safety and planning layers without touching Store or MapLibre.

Required pure read pipeline:

```text
string byte guard or direct-object clone
→ JSON syntax parse when needed
→ JSON safety/resource scan
→ minimal type/schema envelope
→ document plan and execution
→ safety/resource scan after every step
→ current 1.0.0 decode and compatibility normalization records
→ document invariants and duplicate ids
→ Definition plan and execution for every feature
→ final Definition-version equality
→ immutable document + report result
```

`readPlotDocument()` becomes the report-bearing API. `parsePlotDocument()` remains a compatibility wrapper returning only the document.

Every expected failure exposes no partial result and does not mutate caller input.

## 13. 008D atomic import target

Current import performs complete Registry generation before mutation, then uses `store.clear()` and repeated `store.add()`. Duplicate ids can fail after partial replacement.

008D target:

```text
read and migrate completely in memory
→ Registry canonicalize/generate every feature
→ validate complete ordered candidate
→ stage one Store replacement transaction
→ one Store batch event
→ clear selection and History only after success
```

Every expected failure must preserve old Store, order, selection, History and active interaction state.

## 14. Runtime roadmap

```text
008A version / errors / JSON safety / limits — merged
008B migration registry / planner / report records — merged
008C safe reader / execution / 1.0 compatibility / invariants — next
008D Registry-aware preparation / atomic Store import
008E compatibility fixtures / docs / finalization
```

## 15. Validation strategy

Every runtime exact head runs:

```text
Node 20.19 and 22
all Node tests
Playground typecheck/build
handover contract
region-selection benchmark
selection-transform benchmark
34 Chromium E2E
zero unresolved review threads
```

Current merged baseline is 348 Node and 34 Chromium tests. PR #55 validated head `c86bcc02…` in CI #541 and squash-merged as `409786f6…`.

## 16. Deferred work

```text
safe reader and migration execution
production schema and Definition migrations
atomic import
PlotJSON 1.1.0 shape
groups / locks / visibility / z-order
snapping and constraints
touch-specific transforms
copy/paste and duplication
unresolved Definition preservation
downgrade and future-version best effort
coordinated npm release
```

007D remains blocked until 008D/E establishes real migration, reference validation and atomic import.

## 17. Authority documents

```text
README.md
AGENTS.md
docs/ARCHITECTURE.md
docs/PLOTJSON_SPEC.md
docs/DEVELOPMENT_PLAN.md

docs/design/plotjson-migrations.md
docs/design/plotjson-compatibility-matrix.md
docs/design/plotjson-version-json-safety-runtime.md
docs/design/plotjson-migration-registry-runtime.md
docs/algorithms/plotjson-migration-pipeline.md

docs/design/region-selection.md
docs/design/rotation-uniform-scale.md
docs/design/rotation-uniform-scale-runtime.md
docs/algorithms/selection-local-transform.md

docs/performance/region-selection-benchmark.md
docs/performance/selection-transform-benchmark.md

docs/handover/LATEST.md
docs/handover/2026-08-05-milestone-008b-post-merge-finalization.md
```

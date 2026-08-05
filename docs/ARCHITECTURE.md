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
main:                9d5b8dc23ad0e5b4ae6be3d1d1656f6d84f6adbe
workspace:           0.0.22
PlotJSON:            PlotLibreDocument / 1.0.0
production migrations: none
public Definitions:  19 (14 Arrow + 1 Line + 4 Area)
Node:                20.19+
merged tests:        375 Node / 34 Chromium
MapLibre:            6.0.0 in Playground
renderer:            4 Sources / 10 Layers
008A:                merged PR #53/#54
008B:                merged PR #55/#56
008C:                merged PR #57
next:                008D Registry-aware atomic import
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
- PlotJSON serializer and report-bearing reader;
- persisted-version parsing and comparison;
- descriptor-safe JSON cloning and resource limits;
- migration graph registration, deterministic planning and execution;
- immutable migration report records;
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
plotjson-current-decoder.ts
plotjson-reader.ts
registry.ts
store.ts
types.ts
```

008C connects safety and migration planning into a pure reader. Store and MapLibre import remain unchanged until 008D.

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

Browser demonstration, Nanjing samples, PlotJSON UI, Chromium E2E and GitHub Pages deployment. It is a consumer rather than a second implementation.

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

Every create, replace, draw completion, handle edit and selection transform performs complete Registry generation before Store mutation.

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

Complete import order:

```text
JSON boundary
→ document schema migration
→ current document decode
→ Definition migration for every feature
→ final Definition-version equality
→ Registry preflight
→ atomic Store replacement
```

008C implements the pure reader stages. 008D will bind them to the live Registry and Store.

## 10. 008A safety foundation

Persisted versions use canonical numeric `MAJOR.MINOR.PATCH` triples and numeric tuple comparison.

Direct-object input accepts JSON primitives, dense arrays and plain/null-prototype objects. Iterative descriptor inspection rejects accessors, hidden/symbol properties, custom prototypes, sparse/custom arrays, non-finite values and cycles without invoking getters.

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

## 11. 008B migration graph

```text
Document graph node:   schemaVersion
Definition graph node: (plotType, definitionVersion)
```

A Definition type rename is an explicit edge, not a Registry alias. Registration requires a canonical strictly increasing single outgoing edge per source. Planning follows only the exact unique chain and does not execute functions.

## 12. 008C reader architecture

Public API:

```ts
readPlotDocument(input, options?): ReadPlotDocumentResult
parsePlotDocument(input, options?): PlotDocument
```

Pure reader pipeline:

```text
string byte guard or direct-object clone
→ JSON syntax parse when needed
→ document type/schema envelope
→ exact document migration plan and execution
→ safety/resource scan after every step
→ current 1.0 compatibility decode and report facts
→ document invariants and duplicate ids
→ explicit Definition target and migration execution
→ per-step controlPointsPerFeature enforcement
→ exact feature identity/type/version
→ final complete-document semantic scan
→ immutable document + report
```

### 12.1 Migration execution

Every trusted migration receives frozen cloned JSON and must return a new synchronous JSON object. Same-object, Promise, malformed, accessor, cycle, custom-prototype and resource-exceeding outputs reject. Successful step facts are appended only after validation.

### 12.2 Current decoding

Historical 1.0 defaults remain compatible and are represented as report facts. Unknown fields are dropped in deterministic sorted order. Duplicate feature ids reject before external state can be touched.

### 12.3 Definition migration

`definitionTargets` explicitly maps a source plotType to the exact final `(plotType, definitionVersion)`. Type renames are audited. Omitting the map preserves parser-only 1.0 compatibility and does not claim live Registry equality.

### 12.4 Semantic budgets

A feature-root scan cannot infer aggregate document controls. The reader therefore checks `controlPointsPerFeature` after each Definition step and scans the rebuilt final document to enforce `totalControlPoints` and all complete-document limits.

### 12.5 Immutability

The result, document, feature arrays/records, control arrays, parameter/style/metadata trees and report are detached and deeply frozen.

## 13. 008D atomic import target

Current high-level import performs Registry preflight followed by `store.clear()` and repeated `store.add()`. This is not atomic under every later failure.

008D target:

```text
read and migrate completely in memory
→ derive final targets from live PlotRegistry
→ require Definition-version equality
→ canonicalize/generate every feature
→ validate complete ordered candidate
→ stage one Store replacement transaction
→ one Store batch event
→ clear transient state only after success
→ rebuild derived MapLibre state
```

Every expected failure must preserve old Store, order, selection, History and active interaction state.

## 14. Runtime roadmap

```text
008A version / errors / JSON safety / limits — merged
008B migration registry / planner / report records — merged
008C safe reader / execution / 1.0 compatibility / invariants — merged
008D Registry-aware preparation / atomic Store import — next
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

Current merged baseline is 375 Node and 34 Chromium tests. PR #57 validated head `ecd14daa…` in CI #559 and squash-merged as `9d5b8dc2…`.

## 16. Deferred work

```text
live Registry target derivation and Definition equality
atomic Store/MapLibre import
production schema and Definition migrations
PlotJSON 1.1.0 shape
groups / locks / visibility / z-order
snapping and constraints
touch-specific transforms
copy/paste and duplication
unresolved Definition preservation
downgrade and future-version best effort
coordinated npm release
```

007D remains blocked until 008D/E establishes atomic import and production migration discipline.

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
docs/design/plotjson-reader-runtime.md
docs/algorithms/plotjson-migration-pipeline.md

docs/handover/LATEST.md
docs/handover/2026-08-05-milestone-008c-reader-runtime.md
docs/handover/2026-08-05-milestone-008c-post-merge-finalization.md
```

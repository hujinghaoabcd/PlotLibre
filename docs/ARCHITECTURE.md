# PlotLibre Architecture

## 1. Product boundary

PlotLibre is a MapLibre-native but engine-independent framework for semantic parametric situation plots and tactical graphics.

Canonical authored state is:

```text
PlotDefinition + authored controlPoints + parameters + style + metadata
```

Generated GeoJSON, samples, local frames, pivots, handles, guides, selection overlays, region paths and transform previews are derived. They cannot replace authored controls or enter PlotJSON as canonical state.

Current baseline:

```text
workspace:          0.0.22
PlotJSON:           PlotLibreDocument / 1.0.0
public Definitions: 19 (14 Arrow + 1 Line + 4 Area)
Node:               20.19+
MapLibre:           6.0.0 in Playground
renderer:           4 Sources / 10 Layers
historical tests:   299 Node / 34 Chromium
008A target:        324 Node / 34 Chromium
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
- Playground consumes public package APIs and must not duplicate canonical algorithms.

## 3. Packages

### 3.1 `@plotlibre/core`

Responsibilities:

- `PlotFeature`, `PlotDefinition`, `RenderBundle` and JSON types;
- `PlotRegistry` canonicalization, validation and generation;
- transactional `PlotStore`;
- reversible commands and `CommandHistory`;
- PlotJSON document constructors, current parser and serializer;
- PlotJSON version/error/JSON-safety/resource primitives;
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
registry.ts
store.ts
types.ts
```

008A deliberately adds foundation primitives without connecting them to the historical parser. Migration registry, report-bearing reading and atomic document replacement remain 008B–008D.

### 3.2 `@plotlibre/geometry`

Responsibilities:

- local-metre projection and geodesic helpers;
- vectors, bearings and distances;
- polyline metrics and sampling;
- Catmull-Rom and Bezier curves;
- variable-width offsets;
- circular arcs, sectors and segments;
- ring orientation and self-intersection checks;
- arrow-head and ribbon construction;
- antimeridian-aware utilities.

All functions are pure and tested independently of map engines.

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

Each Definition owns:

```text
stable plotType
Definition version
control schema and semantic roles
default parameters and style
canonicalization where permitted
validation
derived RenderBundle generation
semantic guides where required
```

A Definition never owns browser input or Store mutation.

### 3.4 `@plotlibre/interaction`

Responsibilities:

- fixed and variable-point draw sessions;
- validation/rejection snapshots;
- ordered multi-selection and Primary semantics;
- screen-region geometry and lasso simplification;
- batch commands;
- local-metre selection translation;
- shared-pivot rotation and positive uniform scale;
- transform session state and stale-safe command creation.

Interaction cannot reference MapLibre, DOM or WebGL.

### 3.5 `@plotlibre/maplibre`

Responsibilities:

- derived GeoJSON renderer;
- MapLibre Source/Layer lifecycle;
- rendered broad-phase queries and exact projected region resolution;
- map/canvas event normalization;
- semantic handles and selected-body translation;
- explicit region and transform controllers;
- DOM/SVG region and transform overlays;
- high-level `PlotLibre` facade;
- style reload and lifecycle cancellation.

MapLibre-specific code cannot become canonical model logic.

### 3.6 `@plotlibre/playground`

Responsibilities:

- browser demonstration of all public Definitions;
- toolbar and status presentation;
- Nanjing sample data;
- PlotJSON import/export UI;
- real Chromium E2E;
- GitHub Pages deployment.

Playground is a consumer, not a second implementation of framework rules.

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

- ids are stable and unique in a document;
- `plotType` resolves one registered Definition;
- `definitionVersion` describes authored symbol semantics;
- controls are WGS84 positions with Definition-owned order/roles;
- parameters and style are JSON state;
- metadata is application data, not hidden core state;
- effective authored edits increment revision exactly once;
- generated geometry is discarded and regenerated as needed.

## 5. Registry pipeline

```text
PlotFeature input
→ Definition lookup by plotType
→ Definition canonicalize if defined
→ control/parameter/style validation
→ Definition.generate
→ RenderBundle
```

`RenderBundle` may contain:

```text
fills
lines
points
labels
hitAreas
```

Complex plots are not forced into one Polygon.

Every programmatic create/replace, drawing completion, handle edit, batch translation and selection transform performs Registry generation before canonical Store mutation.

## 6. Store and history

`PlotStore` owns ordered canonical features.

`applyTransaction()` stages additions, replacements, removals and optional exact ordering before one commit. Failure leaves state unchanged. Success emits one immutable batch event. Listener exceptions are isolated after commit.

Commands capture exact values rather than recomputing:

```text
CreatePlotCommand
ReplacePlotCommand
DeletePlotCommand
BatchEditCommand
```

`CommandHistory` records only successful effective mutations. Preview, rejection, cancellation, selection changes and no-op do not enter History.

## 7. Selection architecture

Selection is transient and ordered:

```text
selectedIds
primaryId = final selected id
selection revision
```

It is excluded from PlotJSON and PlotFeature revision.

Operations:

```text
replace
add
subtract
toggle
make Primary
clear
restore exact snapshot
```

Every selected feature receives a lightweight derived overlay. Only Primary exposes semantic authored handles and style editing.

## 8. Region selection

Input modes:

```text
neutral Shift-empty box
explicit one-shot box
explicit one-shot lasso
```

Pipeline:

```text
CSS-pixel region
→ committed-layer rendered broad phase
→ plotId deduplication
→ Store-order normalization
→ one Registry.generate per candidate
→ map.project semantic geometry
→ exact point/line/polygon intersection
→ one SelectionController.applyMany event
```

MapLibre rendered bounds are never final hit truth. Labels, hit areas, handles, guides, drafts and overlays are excluded from semantic region geometry.

Box/lasso guides are DOM/SVG overlays and add no MapLibre Source or Layer.

## 9. Selection transforms

Translation:

```text
one order-independent local frame
→ one pointer metre delta
→ translate all selected authored controls
→ complete Registry preflight
→ one atomic command
```

Rotation/scale:

```text
all selected authored controls
→ one order-independent local frame
→ fixed authored-control AABB-centre pivot
→ positive clockwise angle or positive uniform factor
→ complete Registry preflight
→ one stale-safe atomic command
```

Uniform scale range is `[0.01,100]`. Reflection, negative scale, non-uniform scale, skew and snapping are excluded.

Store remains unchanged during previews. Last-valid complete preview survives structured rejection. One invalid member rejects the complete batch.

## 10. Renderer resources

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

DOM/SVG region and transform overlays are outside MapLibre resources.

`style.load` reconstructs all derived Source/Layer data from Store, selection and active interaction state. Active unsafe gestures cancel according to lifecycle contracts.

## 11. PlotJSON version domains

Document `schemaVersion` owns:

```text
document structure
required/optional schema fields
ordering and references
future groups/locks/visibility/z-order
extension containers
```

Feature `definitionVersion` owns:

```text
control roles
parameter semantics
Definition-specific authored behavior
```

They are independent. Future read order is:

```text
JSON boundary
→ document schema migration
→ current document decode
→ Definition migration for every feature
→ final Definition-version equality
→ Registry preflight
→ atomic Store replacement
```

## 12. PlotJSON 008A foundation

### Version primitives

```text
PLOTJSON_DOCUMENT_TYPE = PlotLibreDocument
CURRENT_PLOTJSON_SCHEMA_VERSION = 1.0.0
```

Persisted versions use canonical numeric `MAJOR.MINOR.PATCH`. Components are non-negative safe integers. Comparison is numeric tuple comparison.

### JSON-safe boundary

Accepted direct values:

```text
null / string / boolean / finite number
dense arrays
plain or null-prototype objects
```

Rejected:

```text
non-JSON primitives
Date / Map / Set / RegExp / typed arrays / class instances
custom prototypes
accessors / hidden properties / symbol keys
sparse/custom arrays
cycles
```

Traversal is iterative and descriptor-based. It does not invoke getters. Object keys are lexicographically ordered for deterministic failure paths. Repeated non-cyclic references become independent JSON-tree values.

Own `__proto__` and `constructor` keys are installed with data descriptors and cannot pollute target prototypes.

### Resource ceilings

```text
input bytes:             16 MiB UTF-8
depth:                   128
value nodes:             1,000,000
object keys:             250,000
string/key length:       1,000,000 UTF-16 code units
features:                100,000
controls per feature:    10,000
total authored controls: 1,000,000
```

These are finite untrusted-input ceilings, not product-size recommendations or performance SLAs.

008A exports primitives only. Existing `parsePlotDocument()` and import behavior remain unchanged until 008C/008D.

## 13. PlotJSON runtime roadmap

```text
008A version / errors / JSON safety / limits
008B migration registry / graph planner / report records
008C report-bearing reader / 1.0 compatibility / invariants
008D Registry-aware preparation / atomic document import
008E documentation / compatibility fixtures / finalization
```

Migration code remains in core and separate from `PlotDefinition.generate()`.

The migration graph is deliberately linear per scope/source version: one strictly increasing outgoing step, no cycle and no branch ambiguity.

## 14. Import atomicity target

Current import performs complete Registry generation before mutation, then uses `store.clear()` and repeated `store.add()`. Duplicate ids can fail after partial replacement.

008D target:

```text
parse and migrate completely in memory
→ validate document-wide ids/references/order
→ migrate and preflight every Definition
→ stage one complete ordered Store replacement
→ one batch event
→ clear selection and History after success
```

Every expected input failure must preserve old Store, order, selection, History and active interaction state.

## 15. Interaction priority and lifecycle

Priority:

```text
active drawing
> authored-handle drag
> active selection transform
> active region gesture
> armed transform handle
> armed region mode
> neutral Shift-empty box
> selected-body translation
> click selection
> camera gesture
```

Cancellation sources include Escape, pointer cancellation, unexpected capture loss, style load, resize, active-drag camera movement, external Store/selection changes, document lifecycle actions and destroy.

Map interactions such as dragPan, boxZoom and doubleClickZoom are restored exactly once.

## 16. Validation strategy

Every runtime exact head runs:

```text
Node 20.19
Node 22
all Node unit/integration tests
Playground typecheck/build
handover contract
region-selection benchmark
selection-transform benchmark
Chromium E2E
zero unresolved review threads before merge
```

Test layers:

- deterministic golden geometry;
- property and boundary tests;
- Store/History atomicity;
- interaction state-machine tests;
- MapLibre adapter tests with fake maps;
- real browser pointer/DOM flows;
- exact-head benchmark artifacts;
- immutable handovers and post-merge synchronization.

## 17. Future packages and deferred work

Potential packages:

```text
@plotlibre/ui
@plotlibre/io
@plotlibre/milstd
@plotlibre/react
@plotlibre/vue
@plotlibre/collab
```

Deferred until prerequisites are complete:

```text
PlotJSON production migration to a newer schema
groups / locks / visibility / z-order
snapping and constraints
touch-specific transforms
copy/paste and duplication
unresolved Definition preservation
downgrade and future-version best effort
coordinated npm release
```

007D groups/locks/visibility/z-order remains blocked until 008D/E establishes migration infrastructure, reference validation and atomic import.

## 18. Authority documents

```text
README.md
AGENTS.md
docs/ARCHITECTURE.md
docs/PLOTJSON_SPEC.md
docs/DEVELOPMENT_PLAN.md

docs/design/region-selection.md
docs/design/rotation-uniform-scale.md
docs/design/rotation-uniform-scale-runtime.md
docs/design/plotjson-migrations.md
docs/design/plotjson-compatibility-matrix.md
docs/design/plotjson-version-json-safety-runtime.md

docs/algorithms/selection-local-transform.md
docs/algorithms/plotjson-migration-pipeline.md

docs/performance/region-selection-benchmark.md
docs/performance/selection-transform-benchmark.md

docs/handover/LATEST.md
```

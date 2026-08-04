# PlotLibre

**PlotLibre** is a MapLibre-native, engine-independent framework for drawing, editing, rendering and exchanging semantic parametric situation plots and tactical graphics.

> PlotLibre 保存“符号类型 + authored controls + 参数 + 样式 + 元数据”。地图中的 LineString、Polygon、采样点、选择轮廓、区域选择路径、平移预览和语义引导线均为可重新生成的派生结果。

## Live Playground

**https://hujinghaoabcd.github.io/PlotLibre/**

The Playground includes nineteen public Definitions:

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

It supports exact fixed-point and variable-point drawing, live preview, structured rejection feedback, semantic handle editing, ordered multi-selection, box/lasso selection, atomic batch delete, whole-selection local-metre translation, undo/redo, style editing, nineteen Nanjing samples and PlotJSON import/export.

## Current baseline

```text
workspace version: 0.0.22
MapLibre GL JS:    6.0.0
Node.js:           20.19+
Node tests:        264
Chromium tests:    32
public symbols:    19 (14 Arrow + 1 Line + 4 Area)
MapLibre sources:  4
MapLibre layers:   10
```

The root workspace version is a development baseline, not yet a coordinated npm release across all public packages.

## Professional editing

### Ordered selection and Primary

`SelectionController` owns transient ordered selection:

```ts
interface SelectionSnapshot {
  readonly selectedIds: readonly string[];
  readonly primaryId?: string;
  readonly revision: number;
}
```

The final selected id is Primary. Every selected plot receives a lightweight derived selection overlay; only Primary exposes authored handles, Definition guides and style editing.

Click semantics:

```text
plain click       replace / make Primary
Shift + click     add
Ctrl/Cmd + click  toggle
Alt + click       subtract
empty plain click clear
```

Compatibility APIs remain:

```ts
plot.select(id | undefined)
plot.selectedId
plot.selectedIds
plot.selection
```

Selection is not document state. It does not change PlotFeature revisions and is excluded from PlotJSON.

### Box and lasso selection

Milestone 007B adds screen-space region selection.

Entry paths:

```text
Shift + empty drag       one-shot additive box
plot.startBoxSelection() explicit one-shot box, default replace
plot.startLassoSelection() explicit one-shot lasso, default replace
```

Public APIs:

```ts
plot.regionSelection
plot.regionSelectionSnapshot
plot.regionSelectionRejection
plot.startBoxSelection({ intent?: "replace" | "add" | "toggle" | "subtract" })
plot.startLassoSelection({ intent?: "replace" | "add" | "toggle" | "subtract" })
plot.cancelRegionSelection()
```

Modifier priority at pointerdown is:

```text
Alt > Ctrl/Cmd > Shift > configured/default intent
```

The Playground exposes `框选`、`套索` and `取消区域` controls and reports armed, active, rejected, retry and completion states.

#### Region geometry

All region coordinates use CSS pixels:

```text
box threshold:       4 px Euclidean distance
lasso spacing:       2 px
minimum points:      3
minimum area:        16 px²
RDP tolerance:       1.5 px
boundary:            inclusive
```

Raw and simplified lasso paths must both be simple. Repeated non-consecutive vertices, non-adjacent crossings, touches and collinear overlaps reject. Invalid completion preserves the current selection and an explicit mode can be retried directly.

#### Exact semantic hit testing

MapLibre's rendered index is broad phase only:

```text
region bounds
→ queryRenderedFeatures(committed fill/line/point layers)
→ plotId deduplication
→ PlotStore-order normalization
→ Registry.generate once per candidate
→ map.project semantic geometry
→ exact screen intersection
```

Point centers, line segments, polygon crossing/containment, Multi geometries and Polygon holes are supported. CSS line width, point radius, labels, hit areas, drafts, handles, guides and selection overlays are not semantic region geometry.

A query, generation or projection failure rejects the whole operation. Partial selection is prohibited.

#### One-event mutation

`SelectionController.applyMany()` applies replace/add/subtract/toggle once. Result ordering follows PlotStore order, one effective completion emits one immutable selection event, and region selection never creates a History entry.

#### Overlay and lifecycle

The region guide is a DOM/SVG screen overlay, not geographic GeoJSON. No new Source or Layer was added; the 4-source/10-layer renderer baseline remains unchanged.

Escape, pointer cancellation, unexpected lost capture, style reload, resize, camera movement, Store mutation, external selection revision and document lifecycle operations cancel active region state safely. MapLibre boxZoom, dragPan and pointer capture are restored exactly once.

Real Chromium exposed that intentional `releasePointerCapture()` emits `lostpointercapture`. The final controller ignores that event after intentional ownership release, preserving a newly created rejected state while still cancelling unexpected pointer loss.

### Atomic Store transactions

`PlotStore.applyTransaction()` stages additions, replacements, removals and optional exact document ordering before one commit. Every precondition and candidate is validated against the staged state. Failure leaves the Store unchanged and no listener sees partial state.

Post-commit listener exceptions are isolated and reported through the configured listener-error hook. A listener failure cannot create changed Store state without a corresponding History entry.

### Batch commands and delete

`BatchEditCommand` captures exact before/after feature values, document order and selection snapshots. Execute, undo and redo each use one Store transaction and one selection restoration.

Delete/Backspace and the Playground batch-delete button remove the complete selection with one history entry. Undo restores document order, feature values, selected ids and Primary.

### Whole-selection translation

Dragging the body of any selected plot translates every selected plot by one common local-metre vector:

```text
ordered authored controls
→ one order-independent local projection origin
→ pointer start/end in that frame
→ one metre delta
→ same delta for every control
→ canonicalize and generate every candidate
→ one atomic BatchEditCommand on release
```

The Store remains unchanged during preview. Escape cancels the gesture. If any member is invalid, the complete batch rejects and History remains unchanged. Parameters, style and metadata are preserved.

Handle drag retains priority over body translation. PlotLibre reserves Shift for selection and temporarily disables MapLibre box zoom while the region controller is installed.

## Rendering resources

Four derived GeoJSON sources:

```text
plotlibre-committed
plotlibre-selection
plotlibre-draft
plotlibre-handles
```

Ten layers:

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

The DOM/SVG box/lasso overlay is outside these resources. Style reload reconstructs committed geometry, selection overlays, drafts, handles and guides from canonical state.

## Architecture

```text
core <- geometry <- symbols
core <- interaction
core + interaction <- maplibre
public packages <- playground / wrappers
```

- `@plotlibre/core`: domain types, Registry, transactional Store, commands, History and PlotJSON;
- `@plotlibre/geometry`: pure planar, circular, closed-area and geodesic geometry;
- `@plotlibre/symbols`: built-in parametric Definitions;
- `@plotlibre/interaction`: draw sessions, ordered selection, screen-region algorithms, batch commands and local translation;
- `@plotlibre/maplibre`: rendering, broad-phase queries, exact projected region resolution, overlays, handles and gesture adapters;
- `@plotlibre/playground`: browser demo, E2E and GitHub Pages site.

Canonical state remains engine-independent. Rendered geometry, region paths and interaction overlays cannot become authored state.

## Symbol families

### Circular family

- `line.circular-arc@1.0.0`: exact start/through/end controls define a directed minor or major arc;
- `area.circular-segment@1.0.0`: the same arc closed by its endpoint chord;
- `area.sector@1.0.0`: center, radius/start and end-bearing handle; bearing-handle distance does not define a second radius.

Circular v1 is local-metre only and fails closed for invalid WGS84 positions, duplicate/collinear controls, unstable or excessive circles, ambiguous sweeps, invalid parameters and invalid Polygon topology.

### Closed action areas

- `area.closed-curve@1.0.0`: 3–64 ordered boundary waypoints with periodic interpolating closure;
- `area.gathering-place@1.0.0`: flank A, front crown and flank B with only deterministic flank permutation allowed.

### Arrow and path families

PlotLibre includes exact two-point arrows, curved and attack-path arrows, flat and tailed attack closures, four-control double arrow, five-control pincer, center-path squad combat, route/corridor ribbons, bidirectional exact-two-tip route and a route with a derived secondary emphasis head.

Widths, heads, necks, notches, bridges, mirrored points and samples are derived; authored semantic roles are preserved.

## Validation

```bash
npm install
npm run check
npm run playground:e2e
npm run handover:check
```

Final 007B evidence:

```text
PR #42 runtime foundation
head: 812183a47413bdac554fbd6ca75e1443026ac474
CI:   #437 / 30920263173
Node: 264 passed
E2E:  30 passed
merge: e18183df5be4b98c38ba177e8440b28e859c2c90

PR #43 Playground/browser finalization
head: f7d9e107221d4ee3fc4278f697a7c0ba84d95a59
CI:   #445 / 30924648279
Node: 264 passed
E2E:  32 passed
merge: f98483d3504ce464c93e5a03a49f7f856d1cc1a0
```

Pull requests remain Draft while incomplete. Merge only after current-head Node 20.19/22 validation, Node tests, Playground build, handover contract, Chromium E2E and review threads are green. Use Squash and merge with the exact expected head SHA; never merge feature branches locally.

## Current boundaries and next work

- no hard region-selection latency guarantee is published;
- measure 100 / 1,000 / 10,000 feature fixtures before adding a persistent spatial index;
- rotation and positive uniform scale belong to Milestone 007C;
- groups, locks, visibility and z-order require formal PlotJSON schema/migration design first;
- touch region gestures, snapping, contain-only selection, persistent region tools, coordinated package releases and Playground code splitting remain deferred.

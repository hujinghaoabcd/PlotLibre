# PlotLibre

**PlotLibre** is a MapLibre-native, engine-independent framework for drawing, editing, rendering, and exchanging semantic parametric situation plots and tactical graphics.

> PlotLibre 是面向 MapLibre GL JS 的参数化态势标绘框架。原始数据是“符号类型 + 控制点 + 参数 + 样式 + 元数据”，地图中的 GeoJSON Polygon 只是可重新生成的派生结果。

## Live playground

**https://hujinghaoabcd.github.io/PlotLibre/**

Current built-in Definitions:

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
area.closed-curve
area.gathering-place
```

The Playground supports exact two-point, variable path, variable closed-boundary, fixed-three-point, fixed-four-point and fixed-five-point drawing; live preview; semantic-guide fallback; maximum-point or explicit completion; structured completion-rejection feedback; semantic control-point editing; undo/redo; style editing; sixteen-symbol samples; and PlotJSON import/export.

## Current baseline

```text
workspace version: 0.0.19
MapLibre GL JS:    6.0.0
Node.js:           20.19+
Node tests:        163
Chromium tests:    23
public symbols:    16 (14 Arrow + 2 Area)
```

Public package versions remain independent development placeholders; the root workspace version is not yet a coordinated npm release.

Implemented foundations:

- engine-independent `PlotDefinition`, Registry, Store and CommandHistory;
- PlotJSON 1.0 semantic serialization;
- `TwoPointDrawSession` and reusable `MultiPointDrawSession`;
- schema-driven variable paths and fixed-count semantic controls;
- optional Definition-driven transient draft controls;
- optional Definition-level canonical control-role ordering that may only permute authored coordinates;
- full renderability preflight before interactive completion, create, replace or import mutates Store;
- `ValidationResult`-backed completion rejection details with backward-compatible boolean validators;
- public `MapLibrePlotInteraction.drawRejection` state;
- last-valid-draft retention and transient semantic guides for temporarily invalid candidates;
- MapLibre committed, draft and semantic-handle Sources/Layers;
- click, pointer preview, double-click, Enter, Escape and point-removal interaction;
- fixed-maximum-point auto-completion for three-, four- and five-control symbols;
- semantic handle editing with one-command history and undo;
- local-metre projection and strict finite/closed/simple topology validation;
- shared pure geometry frames for related symbol groups;
- periodic closed Hermite/Catmull–Rom interpolation for Area Definitions;
- deterministic geometry fixtures and actual-rendered-feature Chromium tests;
- browser visibility coverage for every public symbol family.

## Closed action area group

Milestone 006I adds PlotLibre's first Area family while preserving the same semantic-source model used by the Arrow family.

### Closed curve

`area.closed-curve@1.0.0` stores 3–64 ordered boundary waypoints:

```text
0..n-1 authored boundary controls
```

A periodic curve interpolates every authored control and closes the final derived ring automatically. The repeated closing coordinate, sampled curve vertices, winding normalization and Polygon coordinates are never persisted as controls. Double-click or Enter completes the variable-count drawing session.

### Gathering place

`area.gathering-place@1.0.0` stores exactly three role-based controls:

```text
0 flank A
1 front crown
2 flank B
```

The flank pair is canonicalized only by deterministic permutation while the exact crown remains at index `1`. A rounded rear closure anchor is derived from the flank midpoint and crown direction. The third click completes automatically; the rear anchor never enters Store, handles, History or PlotJSON.

Both Definitions output one counterclockwise simple Polygon without holes and reject duplicate, degenerate or self-intersecting candidates before Store mutation.

`area.route-loop` is intentionally deferred. It will become public only if an independent route, direction, entry/exit or operational semantic contract can be demonstrated; a restyled closed curve is not a new Definition.

## Route multi-head group

`arrow.route.bidirectional` and `arrow.route.double-head` share the authored center-path model and route-head geometry while keeping different directional topology.

### Bidirectional route

```text
0      exact start tip
1..n-2 optional path controls
n-1    exact end tip
```

Both authored endpoints are exact arrow tips. The body is derived only between two neck planes, producing one closed simple Polygon with equal directional emphasis in both directions.

### Double-head route

```text
0      route origin
1..n-2 optional path controls
n-1    exact primary objective/tip
```

The primary body retains ordinary route-arrow semantics. A second same-direction emphasis head is derived behind the primary neck and rendered as an additional Polygon component. It is never stored as a control point.

## Route and corridor group

`arrow.route` and `arrow.corridor` share a pure path-ribbon foundation while keeping independent public semantics.

### Route arrow

```text
0      route origin
1..n-2 optional path controls
n-1    exact objective/tip
```

The shaft is a constant-width derived ribbon. The terminal path segment is trimmed at a derived neck plane and completed by an exact-tip arrow head.

### Corridor arrow

```text
0      corridor endpoint A
1..n-2 optional path controls
n-1    corridor endpoint B
```

The output is an undirected constant-width ribbon with flat end caps and no arrow head. It is not a route arrow with a hidden or zero-sized head.

## Squad combat arrow

`arrow.squad-combat@1.0.0` stores a centre action path:

```text
0      tail centre
1..n-2 optional path controls
n-1    exact objective/tip
```

The two temporary tail edges are derived symmetrically in local metres and never enter Store, handles, History or PlotJSON. This differs from `arrow.attack`, whose two tail edges are explicit controls.

## Pincer arrow

`arrow.pincer@1.1.0` stores exactly five canonical controls:

```text
0 outer tail A
1 outer tail B
2 objective A
3 objective B
4 shared inner junction
```

Users may click the objectives in either left/right order. When swapping controls 2/3 is the only valid authored pairing, the Definition applies a permutation-only canonicalization. No coordinate is inserted, removed, moved or mirrored. Rejected fifth-point candidates remain editable and expose structured validation guidance without entering Store, History or PlotJSON.

## Why semantic plotting

A tactical graphic may render as many polygon vertices, but its canonical model remains compact:

```text
plotType
controlPoints
parameters
style
metadata
```

PlotLibre preserves this model so geometry can be regenerated after editing, projection changes, algorithm upgrades, style reloads or export to another engine.

## Workspace packages

| Package | Responsibility |
|---|---|
| `@plotlibre/core` | Domain types, Registry, Store, commands, history and PlotJSON |
| `@plotlibre/geometry` | Pure planar, closed-area and geodesic geometry |
| `@plotlibre/symbols` | Built-in parametric Definitions |
| `@plotlibre/interaction` | Engine-independent draw sessions and completion rejection state |
| `@plotlibre/maplibre` | MapLibre rendering, event adapter and draw-rejection exposure |
| `@plotlibre/playground` | Browser demo, E2E and GitHub Pages site |

# PlotLibre

**PlotLibre** is a MapLibre-native, engine-independent framework for drawing, editing, rendering and exchanging semantic parametric situation plots and tactical graphics.

> PlotLibre 是面向 MapLibre GL JS 的参数化态势标绘框架。原始数据是“符号类型 + authored controls + 参数 + 样式 + 元数据”；地图中的 LineString、Polygon、采样点和语义引导线都是可重新生成的派生结果。

## Live Playground

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
line.circular-arc
area.closed-curve
area.gathering-place
area.circular-segment
area.sector
```

The Playground supports exact two-point, variable path, variable closed-boundary and fixed three/four/five-control drawing; live preview; structured rejection feedback; Definition-driven semantic guides; semantic handle editing; undo/redo; style editing; nineteen-symbol samples; and PlotJSON import/export.

## Current baseline

```text
workspace version: 0.0.20
MapLibre GL JS:    6.0.0
Node.js:           20.19+
Node tests:        184
Chromium tests:    28
public symbols:    19 (14 Arrow + 1 Line + 4 Area)
```

Public package versions remain independent development placeholders; the root workspace version is not yet a coordinated npm release.

## Architecture foundations

- engine-independent `PlotDefinition`, Registry, Store and CommandHistory;
- PlotJSON 1.0 semantic serialization;
- schema-driven `TwoPointDrawSession` and `MultiPointDrawSession`;
- variable-count and fixed-count completion without symbol-ID-specific state machines;
- Definition-level canonicalization limited to deterministic authored-coordinate permutations;
- full Registry generation preflight before interactive completion, create, replace or import mutates Store;
- structured completion rejection and last-valid-draft retention;
- transient Definition-driven draft controls and semantic guide paths;
- MapLibre committed, draft, semantic-handle and handle-guide Sources/Layers;
- semantic handle editing with one replace command and undo;
- local-metre, geodesic, topology and coordinate-mode foundations;
- deterministic geometry fixtures and actual-rendered-feature Chromium tests;
- browser coverage for every public symbol family.

## Circular arc family

Milestone 006J introduces a three-control circular foundation shared by one open line and two area Definitions.

### Circular arc

`line.circular-arc@1.0.0` stores:

```text
0 exact start
1 exact through-point
2 exact end
```

The three controls define a stable local-metre circumcircle. The through-point selects the exact minor or major directed sweep. Sampling is split into `start → through` and `through → end`, so all three authored controls remain exact. The output is one open LineString.

### Circular segment

`area.circular-segment@1.0.0` uses the same exact three-control arc and closes it with the straight chord between the authored endpoints. Minor and major circular segments are supported when the derived ring is finite, counterclockwise and simple.

The identifier is deliberately not `area.lune`: the legacy plotting type often named `Lune/弓形` is one circular arc plus one chord, while a mathematical lune is bounded by two arcs and requires a separate future semantic model.

### Sector

`area.sector@1.0.0` stores:

```text
0 center
1 exact radius and start-boundary point
2 end-bearing handle
```

Control `2` defines direction only. Its distance from the center does not define a second radius. The rendered end-boundary point is derived at the radius established by control `1`.

The public parameter:

```text
sweepDirection: "clockwise" | "counterclockwise"
```

supports crossing 0° and sweeps above 180°. A transient center-to-bearing radial guide is rendered during complete drafts, selection and handle dragging. The guide never enters the committed RenderBundle, Store, History or PlotJSON.

### Circular failure policy

Version 1.0 is explicitly local-metre only. Circular generation rejects before Store mutation:

- invalid or non-finite WGS84 positions;
- duplicate controls;
- collinear or numerically unstable three-point circles;
- excessive circumradius;
- antimeridian, high-latitude or large-extent input;
- ambiguous through-point sweep;
- zero/full sector sweep;
- invalid parameters or Polygon topology.

There is no two-point committed fallback, hidden authored-control movement, triangle/polyline degradation or silent geodesic switch.

## Closed action area group

### Closed curve

`area.closed-curve@1.0.0` stores 3–64 ordered boundary waypoints. A periodic Hermite/Catmull–Rom curve interpolates every authored control and closes the final derived ring automatically. The repeated closing coordinate, sampled vertices and normalized Polygon ring are never persisted.

### Gathering place

`area.gathering-place@1.0.0` stores exactly:

```text
0 flank A
1 front crown
2 flank B
```

The flank pair may be canonicalized only by deterministic permutation. A rounded rear closure anchor is derived and never enters Store, handles, History or PlotJSON.

## Route and compound Arrow families

PlotLibre currently includes:

- exact two-point arrows;
- curved and attack-path arrows;
- independent flat and tailed attack closures;
- four-control double arrow;
- five-control pincer with structured invalid-junction feedback;
- center-path squad combat arrow;
- route and flat-cap corridor sharing a pure PathRibbon frame;
- bidirectional exact-two-tip route;
- route with a derived secondary emphasis head.

Every Arrow Definition preserves its authored semantic roles while heads, necks, widths, notches, bridges, mirrored points and sampled vertices remain derived.

## Why semantic plotting

A rendered graphic may contain many vertices, but its canonical model remains compact:

```text
plotType
controlPoints
parameters
style
metadata
```

PlotLibre preserves this model so geometry can be regenerated after control editing, parameter changes, projection-policy upgrades, MapLibre style reloads or export to another engine.

## Workspace packages

| Package | Responsibility |
|---|---|
| `@plotlibre/core` | Domain types, Registry, Store, commands, history and PlotJSON |
| `@plotlibre/geometry` | Pure planar, circular, closed-area and geodesic geometry |
| `@plotlibre/symbols` | Built-in parametric Definitions |
| `@plotlibre/interaction` | Engine-independent draw sessions and rejection state |
| `@plotlibre/maplibre` | MapLibre rendering, semantic handles/guides and event adapter |
| `@plotlibre/playground` | Browser demo, E2E and GitHub Pages site |

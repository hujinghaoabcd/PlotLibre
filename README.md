# PlotLibre

**PlotLibre** is a MapLibre-native, engine-independent framework for drawing, editing, rendering, and exchanging semantic parametric situation plots and tactical graphics.

> PlotLibre 是面向 MapLibre GL JS 的参数化态势标绘框架。原始数据是“符号类型 + 控制点 + 参数 + 样式 + 元数据”，地图中的 GeoJSON Polygon 只是可重新生成的派生结果。

## Live playground

**https://hujinghaoabcd.github.io/PlotLibre/**

Current built-in Arrow definitions:

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
```

The Playground supports exact two-point, variable two-point-path, variable multi-point, fixed-four-point and fixed-five-point drawing; live preview; semantic-guide fallback; maximum-point or explicit completion; structured completion-rejection feedback; semantic control-point editing; undo/redo; style editing; twelve-symbol samples; and PlotJSON import/export.

## Current baseline

```text
workspace version: 0.0.17
MapLibre GL JS:    6.0.0
Node.js:           20.19+
Node tests:        145
Chromium tests:    20
```

Implemented foundations:

- engine-independent `PlotDefinition`, Registry, Store and CommandHistory;
- PlotJSON 1.0 semantic serialization;
- `TwoPointDrawSession` and reusable `MultiPointDrawSession`;
- schema-driven variable paths with a two-control minimum;
- optional Definition-driven transient draft controls;
- optional Definition-level canonical control-role ordering that may only permute authored coordinates;
- full renderability preflight before interactive completion, create, replace or import mutates Store;
- `ValidationResult`-backed completion rejection details with backward-compatible boolean validators;
- public `MapLibrePlotInteraction.drawRejection` state that clears on movement, completion or cancellation;
- last-valid-draft retention and transient semantic guides for temporarily invalid candidates;
- MapLibre committed, draft and semantic-handle Sources/Layers;
- click, pointer preview, double-click, Enter, Escape and point-removal interaction;
- fixed-maximum-point auto-completion for four- and five-control symbols;
- semantic handle edit, history and undo;
- local-metre projection and strict finite/closed/simple topology validation;
- shared pure geometry frames for related symbol groups;
- deterministic geometry fixtures and actual-rendered-feature Chromium tests;
- browser visibility coverage for all twelve public Arrow types.

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

Both symbols persist only authored center-path controls. Sampled centerlines, offsets, widths, necks, heads and polygon vertices remain derived geometry.

## Squad combat arrow

`arrow.squad-combat` Definition version `1.0.0` stores a centre action path:

```text
0      tail centre
1..n-2 optional path controls
n-1    exact objective/tip
```

The two temporary tail edges are derived symmetrically in local metres from the path direction and length. They are rendering inputs only and never enter Store, handles, History or PlotJSON. A tail-centre and objective pair creates a straight form; additional authored controls curve the action path. This is a semantic distinction from `arrow.attack`, whose two tail edges are explicit user controls.

## Pincer arrow

`arrow.pincer` Definition version `1.1.0` stores exactly five canonical controls:

```text
0 outer tail A
1 outer tail B
2 objective A
3 objective B
4 shared inner junction
```

Users may click the two objectives in either left/right order. When the clicked order would cross the two authored arms but swapping the two objective controls produces a valid pincer, the public Definition stores that valid permutation as the explicit A/B pairing. No coordinate is inserted, removed, moved or mirrored. The pure geometry API remains strict and positional, and invalid junction or topology cases remain fail-closed.

When a fifth point is rejected, the session remains active and exposes stable validation issues. The Playground translates those issue codes into actionable guidance. Moving the pointer clears the stale reason and allows an immediate retry; rejected candidates never enter Store, History or PlotJSON.

## Why semantic plotting

A tactical arrow may render as many polygon vertices, but its canonical model is compact:

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
| `@plotlibre/geometry` | Pure planar and geodesic geometry |
| `@plotlibre/symbols` | Built-in parametric definitions |
| `@plotlibre/interaction` | Engine-independent draw sessions and completion rejection state |
| `@plotlibre/maplibre` | MapLibre rendering, event adapter and draw-rejection exposure |
| `@plotlibre/playground` | Browser demo, E2E and GitHub Pages site |

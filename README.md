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
```

The Playground supports two-point, variable multi-point and fixed-four-point drawing; live preview; definition-derived transient drafts; semantic-guide fallback for temporarily invalid draft geometry; double-click/Enter or maximum-point completion; semantic control-point editing; undo/redo; style editing; eight Nanjing samples; and PlotJSON import/export.

## Current baseline

```text
workspace version: 0.0.12
MapLibre GL JS:    6.0.0
Node.js:           20.19+
Node tests:        107
Chromium tests:    15
```

Implemented foundations:

- engine-independent `PlotDefinition`, Registry, Store and CommandHistory;
- PlotJSON 1.0 semantic serialization;
- `TwoPointDrawSession` and reusable `MultiPointDrawSession`;
- optional Definition-driven transient draft-control derivation that never enters Store, History or PlotJSON;
- full renderability preflight before interactive completion, create, replace or import mutates Store;
- last-valid-draft retention plus transient semantic guides when candidate geometry is temporarily invalid;
- MapLibre committed, draft and semantic-handle Sources/Layers;
- click, pointer preview, double-click, Enter, Escape and point-removal interaction;
- fixed-maximum-point auto-completion for four-control symbols;
- deferred double-click zoom restoration after variable multi-point completion;
- explicit MapLibre 6 Worker and shared-module packaging;
- local bootstrap style and optional non-blocking raster basemap;
- vector, polyline, curve, offset, ring and geodesic primitives;
- antimeridian and coordinate-mode policies;
- deterministic golden fixtures, degenerate-input tests and Chromium actual-rendered-feature tests;
- browser visibility matrix covering draft and committed rendering for all eight public Arrow types;
- Definition-level complete renderability validation for topology-sensitive symbols;
- reusable `FineArrowFrame`, `AttackArrowFrame` and pure `DoubleArrowFrame` boundaries.

The next planned single-symbol work starts with the independent semantic design of `arrow.pincer`; it must not be implemented as an alias of `arrow.double`.

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
| `@plotlibre/interaction` | Engine-independent draw sessions |
| `@plotlibre/maplibre` | MapLibre rendering and event adapter |
| `@plotlibre/playground` | Browser demo, E2E and GitHub Pages site |

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
```

The Playground supports two-point, variable multi-point, fixed-four-point and fixed-five-point drawing; live preview; semantic-guide fallback; maximum-point or explicit completion; semantic control-point editing; undo/redo; style editing; nine Nanjing samples; and PlotJSON import/export.

## Current baseline

```text
workspace version: 0.0.14
MapLibre GL JS:    6.0.0
Node.js:           20.19+
Node tests:        124
Chromium tests:    17
```

Implemented foundations:

- engine-independent `PlotDefinition`, Registry, Store and CommandHistory;
- PlotJSON 1.0 semantic serialization;
- `TwoPointDrawSession` and reusable `MultiPointDrawSession`;
- optional Definition-driven transient draft controls;
- optional Definition-level canonical control-role ordering that may only permute authored coordinates;
- full renderability preflight before interactive completion, create, replace or import mutates Store;
- last-valid-draft retention and transient semantic guides for temporarily invalid candidates;
- MapLibre committed, draft and semantic-handle Sources/Layers;
- click, pointer preview, double-click, Enter, Escape and point-removal interaction;
- fixed-maximum-point auto-completion for four- and five-control symbols;
- semantic handle edit, history and undo;
- local-metre projection and strict finite/closed/simple topology validation;
- deterministic golden fixtures and actual-rendered-feature Chromium tests;
- browser visibility coverage for all nine public Arrow types.

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

`arrow.pincer` is not an alias or renamed implementation of `arrow.double`.

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

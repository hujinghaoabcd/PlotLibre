# PlotLibre

**PlotLibre** is a MapLibre-native, engine-independent framework for drawing, editing, rendering, and exchanging semantic parametric situation plots and tactical graphics.

> PlotLibre 是面向 MapLibre GL JS 的参数化态势标绘框架。原始数据是“符号类型 + 控制点 + 参数 + 样式 + 元数据”，地图上的 GeoJSON Polygon 只是可重新生成的派生结果。

## Live playground

**https://hujinghaoabcd.github.io/PlotLibre/**

The Playground supports four two-point Arrow definitions:

```text
arrow.straight
arrow.fine
arrow.fine.tailed
arrow.assault-direction
```

It also includes semantic control-point editing, live preview, undo/redo, style editing, mixed Nanjing samples, and PlotJSON import/export.

## Current baseline

```text
workspace version: 0.0.7
MapLibre GL JS:    6.0.0
Node.js:           20.19+
```

Implemented foundations:

- engine-independent `PlotDefinition`, Registry, Store and CommandHistory;
- PlotJSON 1.0 semantic serialization;
- engine-independent two-point DrawSession;
- MapLibre committed, draft and handles Sources/Layers;
- explicit MapLibre 6 Worker and shared-module packaging;
- local bootstrap style and optional raster basemap;
- vector, polyline, curve, offset, ring and geodesic primitives;
- antimeridian and coordinate-mode policies;
- golden fixtures, degenerate-input tests and Chromium rendered-feature tests.

The next slice is the first multi-point symbol: `arrow.curved`.

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

## Built-in Arrow definitions

### `arrow.straight`

General two-point straight arrow.

```ts
import { buildStraightArrowRing } from "@plotlibre/geometry";

const ring = buildStraightArrowRing(
  [118.78, 32.04],
  [118.86, 32.10],
);
```

### `arrow.fine`

Narrow tapered direction arrow with an independent parameter contract.

```ts
import { buildFineArrowRing } from "@plotlibre/geometry";

const ring = buildFineArrowRing(
  [118.78, 32.04],
  [118.86, 32.10],
  { tailWidthRatio: 0.055 },
);
```

See [`docs/algorithms/arrow-fine.md`](docs/algorithms/arrow-fine.md).

### `arrow.fine.tailed`

Fine arrow with a centered inward swallowtail notch. It reuses an internal fine-arrow frame rather than copying the base generator.

```ts
import { buildTailedFineArrowRing } from "@plotlibre/geometry";

const ring = buildTailedFineArrowRing(
  [118.78, 32.04],
  [118.86, 32.10],
  { tailNotchRatio: 0.9 },
);
```

See [`docs/algorithms/arrow-fine-tailed.md`](docs/algorithms/arrow-fine-tailed.md).

### `arrow.assault-direction`

Broad assault-direction arrow with a nearly constant-width shaft, explicit neck inset, pronounced shoulders and an angle-defined triangular head.

```ts
import { buildAssaultDirectionRing } from "@plotlibre/geometry";

const ring = buildAssaultDirectionRing(
  [118.78, 32.04],
  [118.86, 32.10],
  {
    bodyWidthRatio: 0.18,
    headAngleDegrees: 42,
  },
);
```

This is a separate geometry model, not a fine-arrow alias with different defaults. See [`docs/algorithms/arrow-assault-direction.md`](docs/algorithms/arrow-assault-direction.md).

## MapLibre usage

```ts
import { Map, setWorkerUrl } from "maplibre-gl";
import { PlotLibre } from "@plotlibre/maplibre";
import {
  ASSAULT_DIRECTION_TYPE,
  builtInSymbols,
} from "@plotlibre/symbols";

setWorkerUrl("/PlotLibre/assets/maplibre-gl-worker.mjs");

const map = new Map({
  container: "map",
  style: { version: 8, sources: {}, layers: [] },
  center: [118.8, 32.06],
  zoom: 10,
});

map.on("load", () => {
  const plot = new PlotLibre(map, { definitions: builtInSymbols });

  plot.draw(ASSAULT_DIRECTION_TYPE);
});
```

All current Arrow types use two semantic control points and reuse the same `TwoPointDrawSession` and two edit handles.

## PlotJSON example

```json
{
  "id": "assault-direction-1",
  "plotType": "arrow.assault-direction",
  "definitionVersion": "1.0.0",
  "controlPoints": [
    [118.78, 32.04],
    [118.86, 32.10]
  ],
  "parameters": {
    "bodyWidthRatio": 0.18,
    "headLengthRatio": 0.3,
    "headAngleDegrees": 42,
    "neckWidthRatio": 0.72,
    "minimumWidthMeters": 2,
    "maximumWidthMeters": 100000
  },
  "style": {},
  "metadata": {},
  "revision": 0
}
```

## Development

```bash
npm install
npm run typecheck
npm test
npm run playground:typecheck
npm run playground:build
npm run handover:check
```

Browser validation:

```bash
npx playwright install --with-deps chromium
npm run playground:e2e
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Interaction model](docs/INTERACTION_MODEL.md)
- [Geometry foundation](docs/GEOMETRY_FOUNDATION.md)
- [Assault direction algorithm](docs/algorithms/arrow-assault-direction.md)
- [MapLibre Worker packaging](docs/MAPLIBRE_WORKER_PACKAGING.md)
- [Playground](docs/PLAYGROUND.md)
- [PlotJSON](docs/PLOTJSON_SPEC.md)
- [Development roadmap](docs/DEVELOPMENT_PLAN.md)
- [Algorithm policy](docs/ALGORITHM_POLICY.md)
- [Latest handover](docs/handover/LATEST.md)

## Development discipline

Every completed milestone must update `docs/handover/LATEST.md` and add a dated immutable handover under `docs/handover/`.

## License

No open-source license has been selected. Package manifests remain `UNLICENSED` until the owner selects a license and the third-party notice policy is finalized.

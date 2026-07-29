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
```

The Playground supports two-point and multi-point drawing, live preview, double-click/Enter completion, semantic control-point editing, undo/redo, style editing, mixed Nanjing samples, and PlotJSON import/export.

## Current baseline

```text
workspace version: 0.0.10
MapLibre GL JS:    6.0.0
Node.js:           20.19+
```

Implemented foundations:

- engine-independent `PlotDefinition`, Registry, Store and CommandHistory;
- PlotJSON 1.0 semantic serialization;
- `TwoPointDrawSession` and reusable `MultiPointDrawSession`;
- MapLibre committed, draft and semantic-handle Sources/Layers;
- click, pointer preview, double-click, Enter, Escape and point-removal interaction;
- deferred double-click zoom restoration after multi-point completion, preventing camera jumps;
- explicit MapLibre 6 Worker and shared-module packaging;
- local bootstrap style and optional non-blocking raster basemap;
- vector, polyline, curve, offset, ring and geodesic primitives;
- antimeridian and coordinate-mode policies;
- deterministic golden fixtures, degenerate-input tests and Chromium actual-rendered-feature tests;
- Definition-level renderability validation for topology-sensitive attack arrows.

The next single-symbol vertical slice is `arrow.attack.tailed`.

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

Fine arrow with a centered inward swallowtail notch. It reuses an internal fine-arrow frame instead of copying the base generator.

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

This is a separate geometry model, not a fine-arrow alias. See [`docs/algorithms/arrow-assault-direction.md`](docs/algorithms/arrow-assault-direction.md).

### `arrow.curved`

Semantic path controls are interpolated through a Catmull–Rom/Hermite centreline; the shaft tapers by cumulative arc length and the head follows the terminal tangent.

```ts
import { buildCurvedArrowRing } from "@plotlibre/geometry";

const ring = buildCurvedArrowRing(
  [
    [118.72, 32.02],
    [118.75, 32.05],
    [118.78, 32.10],
    [118.82, 32.14],
  ],
  {
    tension: 0.15,
    tailWidthRatio: 0.065,
  },
);
```

Properties:

- minimum three and maximum 64 semantic controls;
- every semantic control remains editable;
- double-click or Enter completes drawing;
- Backspace/Delete removes one uncommitted point;
- exact final control point is preserved as the tip;
- self-intersecting derived rings are rejected explicitly.

See [`docs/algorithms/arrow-curved.md`](docs/algorithms/arrow-curved.md).

### `arrow.attack`

A structurally distinct multi-point attack arrow. The first two controls define the exact tail edges and their distance defines semantic tail width. Remaining controls define the attack spine and exact objective.

```ts
import { buildAttackArrowRing } from "@plotlibre/geometry";

const ring = buildAttackArrowRing([
  [118.745, 32.035], // tail edge A
  [118.755, 32.025], // tail edge B
  [118.79, 32.075],  // attack-spine control
  [118.85, 32.12],   // exact objective/tip
]);
```

Properties:

- minimum three and maximum 64 semantic controls;
- first two controls are preserved as exact tail vertices;
- tail-input order does not change the derived polygon;
- tail width drives body and head scale;
- the body can bulge before narrowing into the neck;
- the terminal tangent controls head direction;
- every tail/spine control is editable and undoable;
- full geometry generation is part of Definition validation;
- invalid or self-intersecting edits are rejected before Store mutation.

See [`docs/algorithms/arrow-attack.md`](docs/algorithms/arrow-attack.md).

## MapLibre usage

```ts
import { Map, setWorkerUrl } from "maplibre-gl";
import { PlotLibre } from "@plotlibre/maplibre";
import {
  ATTACK_ARROW_TYPE,
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
  plot.draw(ATTACK_ARROW_TYPE);
});
```

For an attack arrow:

1. click the first tail edge;
2. click the second tail edge across the initial attack direction;
3. click one or more spine controls;
4. double-click the final objective or press Enter;
5. drag any tail or spine handle to reshape it;
6. call `plot.undo()` to undo the complete handle drag in one step.

During double-click completion PlotLibre keeps MapLibre double-click zoom disabled until the browser event finishes, then restores the previous zoom-handler state without moving the camera.

## PlotJSON example

```json
{
  "id": "attack-direction-1",
  "plotType": "arrow.attack",
  "definitionVersion": "1.0.0",
  "controlPoints": [
    [118.745, 32.035],
    [118.755, 32.025],
    [118.79, 32.075],
    [118.85, 32.12]
  ],
  "parameters": {
    "headLengthRatio": 0.22,
    "maximumHeadLengthTailRatio": 2.4,
    "headHalfWidthTailRatio": 0.95,
    "neckHalfWidthTailRatio": 0.32,
    "bodyBulgeRatio": 1.08,
    "bodyBulgePosition": 0.35,
    "tension": 0.12,
    "segmentsPerSpan": 16,
    "miterLimit": 3,
    "minimumTailWidthMeters": 1,
    "maximumTailWidthMeters": 100000
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
- [Curved arrow algorithm](docs/algorithms/arrow-curved.md)
- [Attack arrow algorithm](docs/algorithms/arrow-attack.md)
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

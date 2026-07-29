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

The Playground supports two-point, variable multi-point and fixed-four-point drawing; live preview; definition-derived transient drafts; double-click/Enter or maximum-point completion; semantic control-point editing; undo/redo; style editing; eight Nanjing samples; and PlotJSON import/export.

## Current baseline

```text
workspace version: 0.0.12
MapLibre GL JS:    6.0.0
Node.js:           20.19+
Node tests:        101
Chromium tests:    14
```

Implemented foundations:

- engine-independent `PlotDefinition`, Registry, Store and CommandHistory;
- PlotJSON 1.0 semantic serialization;
- `TwoPointDrawSession` and reusable `MultiPointDrawSession`;
- optional Definition-driven transient draft-control derivation that never enters Store, History or PlotJSON;
- MapLibre committed, draft and semantic-handle Sources/Layers;
- click, pointer preview, double-click, Enter, Escape and point-removal interaction;
- fixed-maximum-point auto-completion for four-control symbols;
- deferred double-click zoom restoration after variable multi-point completion;
- explicit MapLibre 6 Worker and shared-module packaging;
- local bootstrap style and optional non-blocking raster basemap;
- vector, polyline, curve, offset, ring and geodesic primitives;
- antimeridian and coordinate-mode policies;
- deterministic golden fixtures, degenerate-input tests and Chromium actual-rendered-feature tests;
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

### `arrow.fine` and `arrow.fine.tailed`

Narrow tapered arrows with independent parameter contracts. The tailed variant reuses `FineArrowFrame` and changes only the tail closure.

See:

- [`docs/algorithms/arrow-fine.md`](docs/algorithms/arrow-fine.md)
- [`docs/algorithms/arrow-fine-tailed.md`](docs/algorithms/arrow-fine-tailed.md)

### `arrow.assault-direction`

Broad two-point assault-direction arrow with an explicit neck and pronounced shoulders.

See [`docs/algorithms/arrow-assault-direction.md`](docs/algorithms/arrow-assault-direction.md).

### `arrow.curved`

Semantic path controls are interpolated through a Catmull–Rom/Hermite centreline; shaft width follows cumulative arc length and the head follows the terminal tangent.

```ts
import { buildCurvedArrowRing } from "@plotlibre/geometry";

const ring = buildCurvedArrowRing([
  [118.72, 32.02],
  [118.75, 32.05],
  [118.78, 32.10],
  [118.82, 32.14],
]);
```

See [`docs/algorithms/arrow-curved.md`](docs/algorithms/arrow-curved.md).

### `arrow.attack` and `arrow.attack.tailed`

The first two controls define exact tail edges; remaining controls define the attack spine and exact objective. Both variants share `AttackArrowFrame`, while the tailed variant has its own inward notch closure.

```ts
import {
  buildAttackArrowRing,
  buildTailedAttackArrowRing,
} from "@plotlibre/geometry";

const controls = [
  [118.745, 32.035],
  [118.755, 32.025],
  [118.79, 32.075],
  [118.85, 32.12],
] as const;

const flat = buildAttackArrowRing(controls);
const tailed = buildTailedAttackArrowRing(controls);
```

See:

- [`docs/algorithms/arrow-attack.md`](docs/algorithms/arrow-attack.md)
- [`docs/algorithms/arrow-attack-tailed.md`](docs/algorithms/arrow-attack-tailed.md)

### `arrow.double`

A dedicated four-control compound arrow with one shared tail body, two explicit objectives and one connected simple Polygon.

```ts
import { buildDoubleArrowRing } from "@plotlibre/geometry";

const ring = buildDoubleArrowRing([
  [118.785, 32.045], // tail edge A
  [118.797, 32.045], // tail edge B
  [118.768, 32.095], // objective A
  [118.818, 32.095], // objective B
]);
```

Canonical behavior:

- exactly four authored controls;
- tail and objective pairs are unordered;
- swapping either pair preserves geometry;
- the third click immediately shows a temporary mirrored four-point draft;
- pointer movement replaces the temporary objective with the live fourth candidate;
- the temporary counterpart is never committed, serialized or exposed as a handle;
- fourth click auto-completes drawing;
- all four authored controls remain semantic handles;
- branch center, wing curves, heads and inner bridge are derived;
- both tail edges and both objective tips remain exact;
- output is one finite, closed, counterclockwise, simple Polygon;
- invalid or self-intersecting edits are rejected before Store mutation;
- PlotJSON stores four controls and parameters, never a derived fifth branch control.

See:

- [`docs/design/arrow-double-semantic-design.md`](docs/design/arrow-double-semantic-design.md)
- [`docs/algorithms/arrow-double.md`](docs/algorithms/arrow-double.md)

## MapLibre usage

```ts
import { Map, setWorkerUrl } from "maplibre-gl";
import { PlotLibre } from "@plotlibre/maplibre";
import {
  builtInSymbols,
  DOUBLE_ARROW_TYPE,
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
  plot.draw(DOUBLE_ARROW_TYPE);
});
```

Double-arrow drawing flow:

1. click tail edge A;
2. click tail edge B;
3. click objective A and immediately see a transient mirrored draft;
4. move the pointer to replace the temporary counterpart with the live objective-B candidate;
5. click objective B to auto-complete;
6. drag any of the four authored handles to reshape it;
7. call `plot.undo()` to undo a complete handle drag in one step.

## PlotJSON example

```json
{
  "id": "double-direction-1",
  "plotType": "arrow.double",
  "definitionVersion": "1.0.0",
  "controlPoints": [
    [118.785, 32.045],
    [118.797, 32.045],
    [118.768, 32.095],
    [118.818, 32.095]
  ],
  "parameters": {
    "branchPositionRatio": 0.42,
    "headLengthRatio": 0.22,
    "maximumHeadLengthTailRatio": 2.2,
    "headHalfWidthTailRatio": 0.58,
    "neckHalfWidthTailRatio": 0.18,
    "bodyBulgeRatio": 1.05,
    "innerBridgeRatio": 0.55,
    "tension": 0.18,
    "segmentsPerSpan": 12,
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
- [Double-arrow semantic design](docs/design/arrow-double-semantic-design.md)
- [Double-arrow algorithm](docs/algorithms/arrow-double.md)
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

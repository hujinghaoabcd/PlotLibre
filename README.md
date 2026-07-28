# PlotLibre

**PlotLibre** is a MapLibre-native, engine-independent framework for drawing, editing, rendering, and exchanging parametric situation plots, tactical graphics, and standardized military symbols.

> PlotLibre 是面向 MapLibre GL JS 的完整参数化态势标绘框架。它不是给普通 Draw 工具简单增加几个箭头，而是建立可扩展的标绘几何内核、专业交互编辑器、MapLibre 渲染适配器、PlotJSON 数据标准和符号插件体系。

## Live playground

**https://hujinghaoabcd.github.io/PlotLibre/**

The playground supports a symbol selector, straight-arrow, fine-arrow and tailed-fine-arrow drawing, live preview, semantic control-point editing, undo/redo, deletion, style editing, mixed sample data, and PlotJSON import/export.

The application starts from a local MapLibre style. The optional online basemap never blocks PlotLibre. MapLibre GL JS 6 Worker modules are packaged explicitly and verified by Chromium tests.

## Project status

Workspace baseline `0.0.6` contains three complete two-point Arrow slices on top of the shared geometry foundation:

- engine-independent plot definitions, registry, Store and CommandHistory;
- PlotJSON 1.0 semantic serialization;
- interactive MapLibre drawing and semantic control-point editing;
- Vite 8 / MapLibre GL JS 6 browser playground;
- explicit Worker and shared-module packaging for GitHub Pages;
- reusable finite `Vec2` operations;
- polyline cleaning, cumulative lengths and along-line sampling;
- cubic Bezier and Catmull-Rom interpolation;
- constant and per-vertex variable-width offsets;
- ring closure, winding normalization and self-intersection detection;
- Haversine distance, bearing, destination point and geodesic paths;
- antimeridian normalization and local/geodesic policy analysis;
- reusable arrow-head construction;
- an internal reusable fine-arrow frame;
- `arrow.straight`, `arrow.fine` and `arrow.fine.tailed` definitions;
- deterministic golden fixtures, parameter tests and PlotJSON round trips;
- Chromium tests that query actual committed fill/line features.

The next symbol slice is `arrow.assault-direction`. Arrow types continue one at a time rather than being added as an untested batch.

## Why PlotLibre

Most drawing libraries treat final GeoJSON as the source of truth. That is insufficient for tactical graphics.

An arrow may render as a polygon with many vertices, while its true semantic model is:

```text
plot type + control points + parameters + style + metadata
```

PlotLibre preserves that semantic model. Rendered GeoJSON is derived and may be regenerated after editing, projection changes, algorithm upgrades, style reloads, or export to another map engine.

## Workspace packages

| Package | Responsibility |
|---|---|
| `@plotlibre/core` | Domain types, registry, feature store, commands, history and PlotJSON |
| `@plotlibre/geometry` | Projection-aware planar and geodesic geometry algorithms |
| `@plotlibre/symbols` | Built-in parametric plot definitions |
| `@plotlibre/interaction` | Engine-independent draw-session state machines |
| `@plotlibre/maplibre` | MapLibre sources, layers, event adapter, selection and editing |
| `@plotlibre/playground` | Real MapLibre application, E2E tests and GitHub Pages site |

Planned packages include `@plotlibre/ui`, `@plotlibre/io`, `@plotlibre/milstd`, `@plotlibre/react`, `@plotlibre/vue`, and `@plotlibre/collab`.

## Shared geometry foundation

The geometry package operates in two explicit coordinate layers:

- planar algorithms consume local metre-based `Vec2` values;
- geographic algorithms consume WGS84 `Position` values.

Measure and sample a projected centerline:

```ts
import {
  measurePolyline,
  sampleMeasuredPolyline,
  type Vec2,
} from "@plotlibre/geometry";

const centerline: readonly Vec2[] = [
  { x: 0, y: 0 },
  { x: 80, y: 20 },
  { x: 150, y: 90 },
];

const measured = measurePolyline(centerline);
const midpoint = sampleMeasuredPolyline(
  measured,
  measured.totalLength * 0.5,
);
```

Construct variable-width boundaries:

```ts
import { offsetPolyline } from "@plotlibre/geometry";

const boundaries = offsetPolyline(centerline, [4, 8, 12], {
  miterLimit: 4,
});
```

Choose local or geodesic processing explicitly:

```ts
import { analyzeCoordinateMode } from "@plotlibre/geometry";

const analysis = analyzeCoordinateMode([
  [179.9, 10],
  [-179.9, 10],
]);

console.log(analysis.mode); // "geodesic"
```

See [`docs/GEOMETRY_FOUNDATION.md`](docs/GEOMETRY_FOUNDATION.md).

## Built-in arrows

### Straight arrow

```ts
import { buildStraightArrowRing } from "@plotlibre/geometry";

const ring = buildStraightArrowRing(
  [118.78, 32.04],
  [118.86, 32.1],
);
```

### Fine arrow

`arrow.fine` is a separate narrow, tapered two-point symbol. It has its own parameter contract and golden fixture rather than being an alias for `arrow.straight`.

```ts
import { buildFineArrowRing } from "@plotlibre/geometry";

const ring = buildFineArrowRing(
  [118.78, 32.04],
  [118.86, 32.1],
  {
    tailWidthRatio: 0.055,
    headLengthRatio: 0.22,
  },
);
```

See [`docs/algorithms/arrow-fine.md`](docs/algorithms/arrow-fine.md).

### Tailed fine arrow

`arrow.fine.tailed` reuses the same fine-arrow frame and adds one centered inward swallowtail notch. It introduces only `tailNotchRatio`; it does not duplicate the complete fine-arrow generator.

```ts
import { buildTailedFineArrowRing } from "@plotlibre/geometry";

const ring = buildTailedFineArrowRing(
  [118.78, 32.04],
  [118.86, 32.1],
  {
    tailNotchRatio: 0.9,
  },
);
```

See [`docs/algorithms/arrow-fine-tailed.md`](docs/algorithms/arrow-fine-tailed.md).

## Programmatic creation

MapLibre GL JS 6 is ESM-only. The GitHub Pages application sets an explicit Worker URL before creating the first map.

```ts
import { Map } from "maplibre-gl";
import { PlotLibre } from "@plotlibre/maplibre";
import {
  builtInSymbols,
  TAILED_FINE_ARROW_TYPE,
} from "@plotlibre/symbols";

const map = new Map({
  container: "map",
  style: {
    version: 8,
    sources: {},
    layers: [],
  },
  center: [118.8, 32.06],
  zoom: 10,
});

map.on("load", () => {
  const plot = new PlotLibre(map, {
    definitions: builtInSymbols,
  });

  plot.create({
    id: "tailed-direction",
    plotType: TAILED_FINE_ARROW_TYPE,
    controlPoints: [
      [118.78, 32.04],
      [118.86, 32.1],
    ],
  });
});
```

## Interactive drawing

All exactly-two-point definitions currently reuse the engine-independent `TwoPointDrawSession` and two semantic edit handles.

```ts
const id = plot.draw(TAILED_FINE_ARROW_TYPE, {
  style: {
    fillColor: "#d32f2f",
    fillOpacity: 0.5,
    lineColor: "#8e0000",
    lineWidth: 2,
  },
});
```

Then:

1. click the tail position;
2. move the pointer to preview the arrow;
3. click the tip position to commit it;
4. drag either semantic control handle to edit it;
5. call `plot.undo()` to undo the entire drag in one step.

Keyboard behavior:

| Key | Behavior |
|---|---|
| `Escape` | Cancel drawing, cancel a handle drag, or clear selection |
| `Backspace` / `Delete` | Remove the first collected point and reset the session |
| `Enter` | Complete using the current preview position |

## Playground development

Requirements:

- Node.js 20.19 or newer;
- a browser with WebGL2.

```bash
npm install
npm run playground:dev
```

Build the GitHub Pages version:

```bash
npm run playground:build
```

Run browser tests:

```bash
npx playwright install --with-deps chromium
npm run playground:e2e
```

See [`docs/PLAYGROUND.md`](docs/PLAYGROUND.md).

## Rendering model

The MapLibre adapter maintains separate sources:

```text
plotlibre-committed
plotlibre-draft
plotlibre-handles
```

This keeps pointer previews small, prevents draft state from polluting persistent data, and allows handles to be regenerated from semantic control points.

## PlotJSON

A PlotLibre feature stores semantic source data rather than only the generated polygon:

```json
{
  "id": "tailed-direction",
  "plotType": "arrow.fine.tailed",
  "definitionVersion": "1.0.0",
  "controlPoints": [
    [118.78, 32.04],
    [118.86, 32.1]
  ],
  "parameters": {
    "tailWidthRatio": 0.055,
    "headLengthRatio": 0.22,
    "headWidthRatio": 1.9,
    "neckWidthRatio": 0.42,
    "tailNotchRatio": 0.9
  },
  "style": {
    "fillColor": "#d32f2f"
  },
  "metadata": {},
  "revision": 0
}
```

See [`docs/PLOTJSON_SPEC.md`](docs/PLOTJSON_SPEC.md).

## Repository checks

```bash
npm install
npm run typecheck
npm test
npm run playground:typecheck
npm run playground:build
npm run handover:check
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Interaction model](docs/INTERACTION_MODEL.md)
- [Shared geometry foundation](docs/GEOMETRY_FOUNDATION.md)
- [Fine arrow algorithm](docs/algorithms/arrow-fine.md)
- [Tailed fine arrow algorithm](docs/algorithms/arrow-fine-tailed.md)
- [MapLibre Worker packaging](docs/MAPLIBRE_WORKER_PACKAGING.md)
- [Playground and GitHub Pages](docs/PLAYGROUND.md)
- [PlotJSON specification](docs/PLOTJSON_SPEC.md)
- [Reference library matrix](docs/REFERENCE_LIBRARY_MATRIX.md)
- [Development roadmap](docs/DEVELOPMENT_PLAN.md)
- [Algorithm and clean-room policy](docs/ALGORITHM_POLICY.md)
- [Latest handover](docs/handover/LATEST.md)

## Development discipline

Every completed milestone must:

1. update `docs/handover/LATEST.md`;
2. add a dated immutable file under `docs/handover/`;
3. record implementation, tests, decisions, risks, limitations and next tasks;
4. keep architecture and public API documents synchronized.

## Compatibility target

The adapter targets MapLibre GL JS 5.x and 6.x. The current playground pins MapLibre GL JS 6.0.0 and validates the `/PlotLibre/` project path, Worker module graph, committed source data and actual rendered features.

## License

No open-source license has been selected yet. Package manifests intentionally use `UNLICENSED` until the project owner chooses a license. Do not copy code from reference projects before completing the provenance and license review in `docs/ALGORITHM_POLICY.md`.

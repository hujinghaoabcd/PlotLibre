# PlotLibre

**PlotLibre** is a MapLibre-native, engine-independent framework for drawing, editing, rendering, and exchanging parametric situation plots, tactical graphics, and standardized military symbols.

> PlotLibre 是面向 MapLibre GL JS 的完整参数化态势标绘框架。它不是给普通 Draw 工具简单增加几个箭头，而是建立可扩展的标绘几何内核、专业交互编辑器、MapLibre 渲染适配器、PlotJSON 数据标准和符号插件体系。

## Live playground

The GitHub Pages workflow targets:

**https://hujinghaoabcd.github.io/PlotLibre/**

The playground supports straight-arrow drawing, live preview, semantic control-point editing, undo/redo, deletion, style editing, sample data, and PlotJSON import/export. The deployment URL should be treated as verified only after the Pages workflow succeeds and the page is opened successfully.

## Project status

Workspace baseline `0.0.4` adds the shared Arrow geometry foundation required before implementing multi-point tactical symbols:

- engine-independent plot definitions, registry, Store and CommandHistory;
- PlotJSON 1.0 semantic serialization;
- interactive MapLibre drawing and semantic control-point editing;
- Vite 8 / MapLibre GL JS 6 browser playground;
- Playwright Chromium end-to-end tests;
- reusable finite `Vec2` operations;
- polyline cleaning, cumulative lengths and along-line sampling;
- cubic Bezier and Catmull-Rom interpolation;
- constant and per-vertex variable-width offsets;
- ring closure, winding normalization and self-intersection detection;
- Haversine distance, bearing, destination point and geodesic paths;
- antimeridian normalization and local/geodesic policy analysis;
- reusable arrow-head construction;
- deterministic golden fixtures and fixed-seed property-style tests.

The next development stage is Milestone 005: the first traditional multi-point Arrow family, beginning with a narrow vertical slice rather than adding all six symbol types at once.

## Why PlotLibre

Most drawing libraries treat final GeoJSON as the source of truth. That works for ordinary points, lines, and polygons, but it is insufficient for tactical graphics.

An attack arrow may render as a polygon with dozens of vertices, while its true semantic model is:

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

Example: measure and sample a projected centerline.

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

Example: construct variable-width boundaries.

```ts
import { offsetPolyline } from "@plotlibre/geometry";

const boundaries = offsetPolyline(centerline, [4, 8, 12], {
  miterLimit: 4,
});

console.log(boundaries.left, boundaries.right);
```

Example: choose local or geodesic processing explicitly.

```ts
import { analyzeCoordinateMode } from "@plotlibre/geometry";

const analysis = analyzeCoordinateMode([
  [179.9, 10],
  [-179.9, 10],
]);

// "geodesic" because the path crosses the antimeridian.
console.log(analysis.mode);
```

See [`docs/GEOMETRY_FOUNDATION.md`](docs/GEOMETRY_FOUNDATION.md).

## Programmatic creation

MapLibre GL JS 6 is ESM-only, so use named imports or a namespace import:

```ts
import { Map } from "maplibre-gl";
import { PlotLibre } from "@plotlibre/maplibre";
import {
  straightArrowDefinition,
  STRAIGHT_ARROW_TYPE,
} from "@plotlibre/symbols";

const map = new Map({
  container: "map",
  style: "https://demotiles.maplibre.org/style.json",
  center: [118.8, 32.06],
  zoom: 10,
});

map.on("load", () => {
  const plot = new PlotLibre(map, {
    definitions: [straightArrowDefinition],
  });

  plot.create({
    id: "main-direction",
    plotType: STRAIGHT_ARROW_TYPE,
    controlPoints: [
      [118.78, 32.04],
      [118.86, 32.1],
    ],
  });
});
```

## Interactive drawing

```ts
const id = plot.draw(STRAIGHT_ARROW_TYPE, {
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

Install and start:

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

See [`docs/PLAYGROUND.md`](docs/PLAYGROUND.md) for the complete workflow.

## Rendering model

The MapLibre adapter maintains separate sources:

```text
plotlibre-committed
plotlibre-draft
plotlibre-handles
```

This keeps pointer previews small and fast, prevents draft state from polluting persistent data, and allows handles to be regenerated from semantic control points.

## PlotJSON

A PlotLibre feature stores semantic source data rather than only the generated polygon:

```json
{
  "id": "main-direction",
  "plotType": "arrow.straight",
  "definitionVersion": "1.0.0",
  "controlPoints": [
    [118.78, 32.04],
    [118.86, 32.1]
  ],
  "parameters": {
    "tailWidthRatio": 0.08,
    "headLengthRatio": 0.28
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

The library adapter targets MapLibre GL JS 5.x and 6.x. The current playground pins MapLibre GL JS 6.0.0 and validates the GitHub Pages `/PlotLibre/` project path.

## License

No open-source license has been selected yet. Package manifests intentionally use `UNLICENSED` until the project owner chooses a license. Do not copy code from reference projects before completing the provenance and license review in `docs/ALGORITHM_POLICY.md`.

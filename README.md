# PlotLibre

**PlotLibre** is a MapLibre-native, engine-independent framework for drawing, editing, rendering, and exchanging parametric situation plots, tactical graphics, and standardized military symbols.

> PlotLibre 是面向 MapLibre GL JS 的完整参数化态势标绘框架。它的目标不是给普通 Draw 工具增加几个箭头，而是建立可扩展的标绘几何内核、专业交互编辑器、MapLibre 渲染适配器、PlotJSON 数据标准和符号插件体系。

## Project status

PlotLibre is under active early development. The current `0.0.1` foundation includes:

- engine-independent plot definitions and registry;
- semantic plot features based on control points and parameters;
- immutable-style feature store with change notifications;
- reversible command history;
- PlotJSON 1.0 document serialization;
- a projection-aware straight-arrow geometry algorithm;
- the first built-in `arrow.straight` symbol;
- a MapLibre source/layer renderer;
- unit and integration tests using Node's built-in test runner.

The interactive drawing state machine, control handles, snapping, selection, more arrow families, and browser playground are planned next.

## Why PlotLibre

Most drawing libraries treat the final GeoJSON geometry as the source of truth. That model works for ordinary points, lines, and polygons, but it is insufficient for tactical graphics.

An attack arrow may render as a polygon with dozens of vertices, while its real semantic model is:

```text
plot type + control points + parameters + style + metadata
```

PlotLibre preserves that semantic model. Rendered GeoJSON is derived and may be regenerated after editing, projection changes, algorithm upgrades, or export to another map engine.

## Workspace packages

| Package | Responsibility |
|---|---|
| `@plotlibre/core` | Domain types, registry, feature store, commands, history and PlotJSON |
| `@plotlibre/geometry` | Projection-aware mathematical and geometric algorithms |
| `@plotlibre/symbols` | Built-in parametric plot definitions |
| `@plotlibre/maplibre` | MapLibre GL JS sources, layers, rendering and high-level controller |

Planned packages include `@plotlibre/ui`, `@plotlibre/io`, `@plotlibre/milstd`, `@plotlibre/react`, `@plotlibre/vue`, and `@plotlibre/collab`.

## Minimal usage

The current API supports programmatic creation and rendering. Interactive drawing will be added in a later milestone.

```ts
import maplibregl from "maplibre-gl";
import { PlotLibre } from "@plotlibre/maplibre";
import {
  straightArrowDefinition,
  STRAIGHT_ARROW_TYPE,
} from "@plotlibre/symbols";

const map = new maplibregl.Map({
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
      [118.86, 32.10],
    ],
    style: {
      fillColor: "#d32f2f",
      fillOpacity: 0.5,
      lineColor: "#8e0000",
      lineWidth: 2,
    },
  });
});
```

## PlotJSON

A PlotLibre feature stores its semantic source data:

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

See [`docs/PLOTJSON_SPEC.md`](docs/PLOTJSON_SPEC.md) for the full format.

## Development

Requirements:

- Node.js 20 or newer;
- TypeScript 5.8-compatible compiler or the workspace dev dependency.

Commands:

```bash
npm install
npm run build
npm test
npm run handover:check
```

`npm test` builds all packages and executes the current unit and adapter integration tests.

## Development discipline

Every completed development milestone must:

1. update `docs/handover/LATEST.md`;
2. add a dated file under `docs/handover/`;
3. record completed work, validation, risks, decisions, and exact next tasks;
4. keep design documents synchronized with implementation changes.

These rules are also recorded in [`AGENTS.md`](AGENTS.md) so a future developer or conversation can continue without relying on chat history.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [PlotJSON specification](docs/PLOTJSON_SPEC.md)
- [Reference library matrix](docs/REFERENCE_LIBRARY_MATRIX.md)
- [Development roadmap](docs/DEVELOPMENT_PLAN.md)
- [Algorithm and clean-room policy](docs/ALGORITHM_POLICY.md)
- [Latest handover](docs/handover/LATEST.md)

## Compatibility target

The MapLibre adapter targets MapLibre GL JS 5.x and 6.x. MapLibre GL JS is a peer dependency, so applications control the exact engine version.

## License

No open-source license has been selected yet. Package manifests intentionally use `UNLICENSED` until the project owner chooses a license. Do not copy code from reference projects before the license and provenance review described in `docs/ALGORITHM_POLICY.md` is completed.

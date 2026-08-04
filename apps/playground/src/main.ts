import { PlotLibre } from "@plotlibre/maplibre";
import { builtInSymbols } from "@plotlibre/symbols";
import {
  Map,
  NavigationControl,
  setWorkerUrl,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { installCircularArcPlayground } from "./circular-arc-playground.js";
import { installClosedActionAreaPlayground } from "./closed-action-area-playground.js";
import { installDoubleArrowPlayground } from "./double-arrow-playground.js";
import { installPathSymbolsPlayground } from "./path-symbols-playground.js";
import { installPincerArrowPlayground } from "./pincer-arrow-playground.js";
import { PlaygroundApp } from "./playground-app.js";
import { installRegionSelectionPlayground } from "./region-selection-controls.js";
import { installSelectionTransformPlayground } from "./selection-transform-controls.js";
import { installSquadCombatPlayground } from "./squad-combat-playground.js";
import "./styles.css";
import "./symbol-controls.css";
import { playgroundTemplate } from "./template.js";

const BASEMAP_SOURCE_ID = "plotlibre-basemap-source";
const BASEMAP_LAYER_ID = "plotlibre-basemap-layer";

const root = document.getElementById("app");
if (!root) {
  throw new Error("PlotLibre playground root element was not found.");
}
root.innerHTML = playgroundTemplate;

const query = new URLSearchParams(window.location.search);
const e2e = query.get("e2e") === "1";
const squadCombatE2e = query.get("squad") === "1";
const pathSymbolsE2e = query.get("paths") === "1";
const closedActionAreaE2e = query.get("areas") === "1";
const circularArcE2e = query.get("circular") === "1";
const basemapDisabled = e2e || query.get("basemap") === "none";

const bootstrapStyle = {
  version: 8,
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "#102337",
      },
    },
  ],
} satisfies StyleSpecification;

setWorkerUrl(`${import.meta.env.BASE_URL}assets/maplibre-gl-worker.mjs`);

const map = new Map({
  container: "map",
  style: bootstrapStyle,
  center: [118.7969, 32.0603],
  zoom: 11.2,
  canvasContextAttributes: {
    antialias: true,
  },
});

if (!e2e) {
  map.addControl(
    new NavigationControl({
      showCompass: true,
      showZoom: true,
      visualizePitch: true,
    }),
    "bottom-right",
  );
}

map.once("load", () => {
  if (!basemapDisabled) {
    installOptionalBasemap(map);
  }

  const plot = new PlotLibre(map, {
    definitions: builtInSymbols,
    historySize: 300,
  });
  const app = new PlaygroundApp(map, plot, { e2e });

  app.start();
  installRegionSelectionPlayground(plot);
  installSelectionTransformPlayground(plot);
  installDoubleArrowPlayground(app, plot, map, { e2e });
  installPincerArrowPlayground(app, plot, map, { e2e });
  installSquadCombatPlayground(app, plot, map, {
    e2e,
    enableInE2e: squadCombatE2e,
  });
  installPathSymbolsPlayground(app, plot, map, {
    e2e,
    enableInE2e: pathSymbolsE2e,
  });
  installClosedActionAreaPlayground(app, plot, map, {
    e2e,
    enableInE2e: closedActionAreaE2e,
  });
  installCircularArcPlayground(app, plot, map, {
    e2e,
    enableInE2e: circularArcE2e,
  });

  if (!e2e) {
    app.loadSample();
  }

  window.__plotlibrePlayground = { map, plot, app };
});

let basemapWarningShown = false;
map.on("error", (event) => {
  console.error("MapLibre error", event.error);
  if (e2e || basemapWarningShown) return;

  basemapWarningShown = true;
  const status = document.getElementById("status-text");
  if (status) {
    status.textContent =
      "在线底图暂时不可用，已切换为本地背景；PlotLibre 标绘功能不受影响。";
    status.dataset.state = "warning";
  }
});

function installOptionalBasemap(targetMap: Map): void {
  if (targetMap.getSource(BASEMAP_SOURCE_ID)) return;

  targetMap.addSource(BASEMAP_SOURCE_ID, {
    type: "raster",
    tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
    tileSize: 256,
    minzoom: 0,
    maxzoom: 19,
    attribution: "© OpenStreetMap contributors",
  });
  targetMap.addLayer({
    id: BASEMAP_LAYER_ID,
    type: "raster",
    source: BASEMAP_SOURCE_ID,
    paint: {
      "raster-opacity": 0.92,
      "raster-fade-duration": 150,
    },
  });
}

declare global {
  interface Window {
    __plotlibrePlayground?: {
      readonly map: Map;
      readonly plot: PlotLibre;
      readonly app: PlaygroundApp;
    };
  }
}

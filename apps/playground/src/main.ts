import { PlotLibre } from "@plotlibre/maplibre";
import { builtInSymbols } from "@plotlibre/symbols";
import {
  Map,
  NavigationControl,
  setWorkerUrl,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { installClosedActionAreaPlayground } from "./closed-action-area-playground.js";
import { installDoubleArrowPlayground } from "./double-arrow-playground.js";
import { installPathSymbolsPlayground } from "./path-symbols-playground.js";
import { installPincerArrowPlayground } from "./pincer-arrow-playground.js";
import { PlaygroundApp } from "./playground-app.js";
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

// MapLibre GL JS 6 ships its renderer worker as a sibling ESM file. Vite
// bundles the main module but does not automatically emit that sibling file,
// so the Playground copies it into public/assets during configuration and sets
// the URL explicitly before the first Map is created.
setWorkerUrl(`${import.meta.env.BASE_URL}assets/maplibre-gl-worker.mjs`);

const map = new Map({
  container: "map",
  // Always bootstrap from a local style. Remote basemap resources are optional
  // enhancements and must never block PlotLibre initialization.
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
  // Add the optional basemap synchronously before PlotLibre creates its layers,
  // so all plotting layers remain above it. Tile requests continue in the
  // background and do not delay the application.
  if (!basemapDisabled) {
    installOptionalBasemap(map);
  }

  const plot = new PlotLibre(map, {
    definitions: builtInSymbols,
    historySize: 300,
  });
  const app = new PlaygroundApp(map, plot, { e2e });
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
  // Install all symbol groups before start so the non-E2E automatic sample
  // uses the complete current catalog rather than only the original base set.
  app.start();

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

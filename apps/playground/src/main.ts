import { PlotLibre } from "@plotlibre/maplibre";
import { builtInSymbols } from "@plotlibre/symbols";
import { Map, NavigationControl, type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { PlaygroundApp } from "./playground-app.js";
import "./styles.css";
import { playgroundTemplate } from "./template.js";

const root = document.getElementById("app");
if (!root) {
  throw new Error("PlotLibre playground root element was not found.");
}
root.innerHTML = playgroundTemplate;

const query = new URLSearchParams(window.location.search);
const e2e = query.get("e2e") === "1";

const offlineStyle = {
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

const map = new Map({
  container: "map",
  style: e2e ? offlineStyle : "https://demotiles.maplibre.org/style.json",
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
  const plot = new PlotLibre(map, {
    definitions: builtInSymbols,
    historySize: 300,
  });
  const app = new PlaygroundApp(map, plot, { e2e });
  app.start();

  window.__plotlibrePlayground = { map, plot, app };
});

map.on("error", (event) => {
  console.error("MapLibre error", event.error);
  const status = document.getElementById("status-text");
  if (status && !e2e) {
    status.textContent =
      "底图资源加载出现问题，但 PlotLibre 标绘功能仍可在当前地图上使用。";
    status.dataset.state = "warning";
  }
});

declare global {
  interface Window {
    __plotlibrePlayground?: {
      readonly map: Map;
      readonly plot: PlotLibre;
      readonly app: PlaygroundApp;
    };
  }
}

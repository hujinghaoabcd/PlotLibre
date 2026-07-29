import type { PlotLibre } from "@plotlibre/maplibre";
import {
  CORRIDOR_ARROW_TYPE,
  ROUTE_ARROW_TYPE,
} from "@plotlibre/symbols";
import type { Map } from "maplibre-gl";
import type { PlaygroundApp } from "./playground-app.js";

const ROUTE_SAMPLE_ID = "sample-route";
const CORRIDOR_SAMPLE_ID = "sample-corridor";

export function installPathSymbolsPlayground(
  app: PlaygroundApp,
  plot: PlotLibre,
  map: Map,
  options: { readonly e2e: boolean; readonly enableInE2e: boolean },
): void {
  if (options.e2e && !options.enableInE2e) return;

  installSelectorOption(ROUTE_ARROW_TYPE, "路线箭头");
  installSelectorOption(CORRIDOR_ARROW_TYPE, "走廊箭头");

  const previousLoadSample = app.loadSample.bind(app);
  app.loadSample = (): void => {
    previousLoadSample();
    addPathSamples(plot);
    plot.history.clear();
    setStatus(
      "已加载南京十二类箭头示例。路线箭头有明确方向头，走廊箭头为无方向平头路径带。",
      "ready",
    );
    app.refresh();
  };

  if (!options.e2e && plot.store.size > 0) {
    addPathSamples(plot);
    plot.history.clear();
    setStatus(
      "已加载南京十二类箭头示例。路线箭头与走廊箭头共享路径带基础，但保持独立结构。",
      "ready",
    );
    app.refresh();
  }

  const refreshInstruction = (): void => {
    queueMicrotask(() => {
      const plotType = selectedPlotType();
      if (plotType !== ROUTE_ARROW_TYPE && plotType !== CORRIDOR_ARROW_TYPE) return;
      const route = plotType === ROUTE_ARROW_TYPE;
      setStatus(
        plot.interaction.isDrawing
          ? route
            ? "路线箭头绘制中：首点为起点，后续点定义路线；双击目标或按 Enter 完成。"
            : "走廊箭头绘制中：首点为端点 A，后续点定义中心路径；双击端点 B 或按 Enter 完成。"
          : route
            ? "已选择路线箭头。两点可直接形成直线路线，也可添加中间路径点后双击结束。"
            : "已选择走廊箭头。两点可直接形成直走廊，也可添加中间路径点后双击结束。",
        plot.interaction.isDrawing ? "drawing" : "ready",
      );
    });
  };

  document.getElementById("symbol-select")?.addEventListener(
    "change",
    refreshInstruction,
  );
  document.getElementById("draw-button")?.addEventListener(
    "click",
    refreshInstruction,
  );
  map.on("click", refreshInstruction);
  map.on("mousemove", refreshInstruction);
  map.on("mouseup", refreshInstruction);
}

function installSelectorOption(value: string, label: string): void {
  const select = document.getElementById("symbol-select");
  if (!(select instanceof HTMLSelectElement)) return;
  if (select.querySelector(`option[value="${value}"]`)) return;
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  select.append(option);
}

function addPathSamples(plot: PlotLibre): void {
  if (!plot.store.find(ROUTE_SAMPLE_ID)) {
    plot.create({
      id: ROUTE_SAMPLE_ID,
      plotType: ROUTE_ARROW_TYPE,
      controlPoints: [
        [118.82, 32.02],
        [118.85, 32.055],
        [118.89, 32.085],
      ],
      style: {
        fillColor: "#ff8a65",
        fillOpacity: 0.52,
        lineColor: "#a33f25",
        lineWidth: 2,
      },
      metadata: { source: "PlotLibre playground sample" },
    });
  }

  if (!plot.store.find(CORRIDOR_SAMPLE_ID)) {
    plot.create({
      id: CORRIDOR_SAMPLE_ID,
      plotType: CORRIDOR_ARROW_TYPE,
      controlPoints: [
        [118.69, 32.125],
        [118.735, 32.145],
        [118.79, 32.135],
      ],
      style: {
        fillColor: "#81c784",
        fillOpacity: 0.46,
        lineColor: "#2e6b35",
        lineWidth: 2,
      },
      metadata: { source: "PlotLibre playground sample" },
    });
  }
}

function selectedPlotType(): string | undefined {
  const select = document.getElementById("symbol-select");
  return select instanceof HTMLSelectElement ? select.value : undefined;
}

function setStatus(message: string, state: string): void {
  const status = document.getElementById("status-text");
  if (!status) return;
  status.textContent = message;
  status.dataset.state = state;
}

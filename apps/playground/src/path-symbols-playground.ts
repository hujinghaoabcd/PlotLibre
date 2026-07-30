import type { PlotLibre } from "@plotlibre/maplibre";
import {
  BIDIRECTIONAL_ROUTE_ARROW_TYPE,
  CORRIDOR_ARROW_TYPE,
  DOUBLE_HEAD_ROUTE_ARROW_TYPE,
  ROUTE_ARROW_TYPE,
} from "@plotlibre/symbols";
import type { Map } from "maplibre-gl";
import type { PlaygroundApp } from "./playground-app.js";

const ROUTE_SAMPLE_ID = "sample-route";
const CORRIDOR_SAMPLE_ID = "sample-corridor";
const BIDIRECTIONAL_SAMPLE_ID = "sample-route-bidirectional";
const DOUBLE_HEAD_SAMPLE_ID = "sample-route-double-head";

export function installPathSymbolsPlayground(
  app: PlaygroundApp,
  plot: PlotLibre,
  map: Map,
  options: { readonly e2e: boolean; readonly enableInE2e: boolean },
): void {
  if (options.e2e && !options.enableInE2e) return;

  installSelectorOption(ROUTE_ARROW_TYPE, "路线箭头");
  installSelectorOption(CORRIDOR_ARROW_TYPE, "走廊箭头");
  installSelectorOption(BIDIRECTIONAL_ROUTE_ARROW_TYPE, "双向路线箭头");
  installSelectorOption(DOUBLE_HEAD_ROUTE_ARROW_TYPE, "双头路线箭头");

  const previousLoadSample = app.loadSample.bind(app);
  app.loadSample = (): void => {
    previousLoadSample();
    addPathSamples(plot);
    plot.history.clear();
    setStatus(
      "已加载南京十四类箭头示例。双向路线两端均为箭尖，双头路线在目标前增加派生强调头。",
      "ready",
    );
    app.refresh();
  };

  const refreshInstruction = (): void => {
    queueMicrotask(() => {
      const plotType = selectedPlotType();
      const message = instructionFor(plotType, plot.interaction.isDrawing);
      if (!message) return;
      setStatus(message, plot.interaction.isDrawing ? "drawing" : "ready");
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

function instructionFor(
  plotType: string | undefined,
  drawing: boolean,
): string | undefined {
  switch (plotType) {
    case ROUTE_ARROW_TYPE:
      return drawing
        ? "路线箭头绘制中：首点为起点，后续点定义路线；双击目标或按 Enter 完成。"
        : "已选择路线箭头。两点可直接形成直线路线，也可添加中间路径点后双击结束。";
    case CORRIDOR_ARROW_TYPE:
      return drawing
        ? "走廊箭头绘制中：首点为端点 A，后续点定义中心路径；双击端点 B 或按 Enter 完成。"
        : "已选择走廊箭头。两点可直接形成直走廊，也可添加中间路径点后双击结束。";
    case BIDIRECTIONAL_ROUTE_ARROW_TYPE:
      return drawing
        ? "双向路线绘制中：首末点均为精确箭尖，中间点定义共同路线；双击或按 Enter 完成。"
        : "已选择双向路线箭头。两端具有同等方向强调，控制点只保存中心路径。";
    case DOUBLE_HEAD_ROUTE_ARROW_TYPE:
      return drawing
        ? "双头路线绘制中：首点为起点，末点为精确目标；第二个强调头沿路线自动派生。"
        : "已选择双头路线箭头。主箭头指向目标，后方自动增加同向强调头。";
    default:
      return undefined;
  }
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

  if (!plot.store.find(BIDIRECTIONAL_SAMPLE_ID)) {
    plot.create({
      id: BIDIRECTIONAL_SAMPLE_ID,
      plotType: BIDIRECTIONAL_ROUTE_ARROW_TYPE,
      controlPoints: [
        [118.66, 32.07],
        [118.71, 32.09],
        [118.77, 32.075],
      ],
      style: {
        fillColor: "#9575cd",
        fillOpacity: 0.5,
        lineColor: "#50398a",
        lineWidth: 2,
      },
      metadata: { source: "PlotLibre playground sample" },
    });
  }

  if (!plot.store.find(DOUBLE_HEAD_SAMPLE_ID)) {
    plot.create({
      id: DOUBLE_HEAD_SAMPLE_ID,
      plotType: DOUBLE_HEAD_ROUTE_ARROW_TYPE,
      controlPoints: [
        [118.80, 32.135],
        [118.845, 32.125],
        [118.90, 32.145],
      ],
      style: {
        fillColor: "#ffca28",
        fillOpacity: 0.54,
        lineColor: "#8d6e00",
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

import type { PlotLibre } from "@plotlibre/maplibre";
import {
  CLOSED_CURVE_TYPE,
  GATHERING_PLACE_TYPE,
} from "@plotlibre/symbols";
import type { Map } from "maplibre-gl";
import type { PlaygroundApp } from "./playground-app.js";

const CLOSED_CURVE_SAMPLE_ID = "sample-closed-curve";
const GATHERING_PLACE_SAMPLE_ID = "sample-gathering-place";

export function installClosedActionAreaPlayground(
  app: PlaygroundApp,
  plot: PlotLibre,
  map: Map,
  options: { readonly e2e: boolean; readonly enableInE2e: boolean },
): void {
  if (options.e2e && !options.enableInE2e) return;

  installSelectorOption(CLOSED_CURVE_TYPE, "闭合曲线区域");
  installSelectorOption(GATHERING_PLACE_TYPE, "集结地");

  const previousLoadSample = app.loadSample.bind(app);
  app.loadSample = (): void => {
    previousLoadSample();
    addClosedActionAreaSamples(plot);
    plot.history.clear();
    setStatus(
      "已加载南京十六类语义标绘示例，包括十四类箭头与两类闭合行动区域。",
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
    case CLOSED_CURVE_TYPE:
      return drawing
        ? "闭合曲线区域绘制中：沿边界依次点击至少三个点，双击末点或按 Enter 自动闭合。"
        : "已选择闭合曲线区域。控制点是有序边界途经点，闭合点与平滑顶点均为派生几何。";
    case GATHERING_PLACE_TYPE:
      return drawing
        ? "集结地绘制中：依次点击一侧翼点、前向冠点和另一侧翼点，第三点自动完成。"
        : "已选择集结地。三个控制点定义两侧翼点与前向冠点，后部闭合锚点自动派生。";
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

function addClosedActionAreaSamples(plot: PlotLibre): void {
  if (!plot.store.find(CLOSED_CURVE_SAMPLE_ID)) {
    plot.create({
      id: CLOSED_CURVE_SAMPLE_ID,
      plotType: CLOSED_CURVE_TYPE,
      controlPoints: [
        [118.675, 32.015],
        [118.715, 32.005],
        [118.745, 32.03],
        [118.725, 32.06],
        [118.68, 32.055],
      ],
      style: {
        fillColor: "#42a5f5",
        fillOpacity: 0.32,
        lineColor: "#0d47a1",
        lineWidth: 2,
      },
      metadata: { source: "PlotLibre playground sample" },
    });
  }

  if (!plot.store.find(GATHERING_PLACE_SAMPLE_ID)) {
    plot.create({
      id: GATHERING_PLACE_SAMPLE_ID,
      plotType: GATHERING_PLACE_TYPE,
      controlPoints: [
        [118.845, 32.005],
        [118.875, 32.055],
        [118.91, 32.012],
      ],
      style: {
        fillColor: "#66bb6a",
        fillOpacity: 0.36,
        lineColor: "#1b5e20",
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

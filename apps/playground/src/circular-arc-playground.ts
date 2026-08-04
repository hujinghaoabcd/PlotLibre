import type { PlotLibre } from "@plotlibre/maplibre";
import {
  CIRCULAR_ARC_TYPE,
  CIRCULAR_SEGMENT_TYPE,
  SECTOR_TYPE,
} from "@plotlibre/symbols";
import type { Map } from "maplibre-gl";
import type { PlaygroundApp } from "./playground-app.js";

const CIRCULAR_ARC_SAMPLE_ID = "sample-circular-arc";
const CIRCULAR_SEGMENT_SAMPLE_ID = "sample-circular-segment";
const SECTOR_SAMPLE_ID = "sample-sector";

export function installCircularArcPlayground(
  app: PlaygroundApp,
  plot: PlotLibre,
  map: Map,
  options: { readonly e2e: boolean; readonly enableInE2e: boolean },
): void {
  if (options.e2e && !options.enableInE2e) return;

  installSelectorOption(CIRCULAR_ARC_TYPE, "三点圆弧");
  installSelectorOption(CIRCULAR_SEGMENT_TYPE, "圆弓形区域");
  installSelectorOption(SECTOR_TYPE, "扇形区域");

  const previousLoadSample = app.loadSample.bind(app);
  app.loadSample = (): void => {
    previousLoadSample();
    addCircularArcSamples(plot);
    plot.history.clear();
    setStatus(
      "已加载南京十九类语义标绘示例，包括十四类箭头、一类开放线和四类区域。",
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
    case CIRCULAR_ARC_TYPE:
      return drawing
        ? "三点圆弧绘制中：依次点击起点、弧上经过点和终点；第三点自动完成，并精确经过三个控制点。"
        : "已选择三点圆弧。经过点决定小弧或大弧及方向，输出为开放 LineString。";
    case CIRCULAR_SEGMENT_TYPE:
      return drawing
        ? "圆弓形绘制中：依次点击弦起点、弧上经过点和弦终点；第三点自动完成。"
        : "已选择圆弓形区域。边界由经过控制点的圆弧和连接两端的直线弦组成。";
    case SECTOR_TYPE:
      return drawing
        ? "扇形绘制中：依次点击圆心、半径与起始边界点、结束方位控制点；第三点自动完成。"
        : "已选择扇形区域。第二点定义半径和起始边界，第三点只定义结束方位，其距离不会改变半径。";
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

function addCircularArcSamples(plot: PlotLibre): void {
  if (!plot.store.find(CIRCULAR_ARC_SAMPLE_ID)) {
    plot.create({
      id: CIRCULAR_ARC_SAMPLE_ID,
      plotType: CIRCULAR_ARC_TYPE,
      controlPoints: [
        [118.655, 32.115],
        [118.695, 32.145],
        [118.735, 32.115],
      ],
      style: {
        lineColor: "#8e24aa",
        lineOpacity: 1,
        lineWidth: 3,
      },
      metadata: { source: "PlotLibre playground sample" },
    });
  }

  if (!plot.store.find(CIRCULAR_SEGMENT_SAMPLE_ID)) {
    plot.create({
      id: CIRCULAR_SEGMENT_SAMPLE_ID,
      plotType: CIRCULAR_SEGMENT_TYPE,
      controlPoints: [
        [118.805, 32.11],
        [118.845, 32.155],
        [118.89, 32.11],
      ],
      style: {
        fillColor: "#26a69a",
        fillOpacity: 0.34,
        lineColor: "#00695c",
        lineWidth: 2,
      },
      metadata: { source: "PlotLibre playground sample" },
    });
  }

  if (!plot.store.find(SECTOR_SAMPLE_ID)) {
    plot.create({
      id: SECTOR_SAMPLE_ID,
      plotType: SECTOR_TYPE,
      controlPoints: [
        [118.95, 32.09],
        [118.985, 32.09],
        [118.95, 32.045],
      ],
      parameters: {
        sweepDirection: "clockwise",
      },
      style: {
        fillColor: "#ffa726",
        fillOpacity: 0.35,
        lineColor: "#e65100",
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

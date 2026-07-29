import type { PlotLibre } from "@plotlibre/maplibre";
import { DOUBLE_ARROW_TYPE } from "@plotlibre/symbols";
import type { Map } from "maplibre-gl";
import type { PlaygroundApp } from "./playground-app.js";

const SAMPLE_ID = "sample-double-direction";

export function installDoubleArrowPlayground(
  app: PlaygroundApp,
  plot: PlotLibre,
  map: Map,
  options: { readonly e2e: boolean },
): void {
  const originalLoadSample = app.loadSample.bind(app);
  app.loadSample = (): void => {
    originalLoadSample();
    addDoubleArrowSample(plot);
    plot.history.clear();
    setStatus(
      "已加载南京八类箭头示例。双箭头使用两个尾缘和两个显式目标。",
      "ready",
    );
    app.refresh();
  };

  if (!options.e2e && plot.store.size > 0) {
    addDoubleArrowSample(plot);
    plot.history.clear();
    setStatus(
      "已加载南京八类箭头示例。双箭头使用两个尾缘和两个显式目标。",
      "ready",
    );
    app.refresh();
  }

  const refreshInstruction = (): void => {
    queueMicrotask(() => {
      if (selectedPlotType() !== DOUBLE_ARROW_TYPE) return;
      setStatus(
        plot.interaction.isDrawing
          ? "双箭头绘制中：前两点定义尾缘，第三点定义首个目标，移动鼠标预览并以第四次点击自动完成。"
          : "已选择双箭头。依次点击两个尾缘和两个目标；第四次点击自动完成，无需双击。",
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

function addDoubleArrowSample(plot: PlotLibre): void {
  if (plot.store.find(SAMPLE_ID)) return;
  plot.create({
    id: SAMPLE_ID,
    plotType: DOUBLE_ARROW_TYPE,
    controlPoints: [
      [118.785, 32.045],
      [118.797, 32.045],
      [118.768, 32.095],
      [118.818, 32.095],
    ],
    style: {
      fillColor: "#7b61ff",
      fillOpacity: 0.5,
      lineColor: "#4030a0",
      lineWidth: 2,
    },
    metadata: { source: "PlotLibre playground sample" },
  });
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

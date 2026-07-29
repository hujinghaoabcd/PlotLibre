import type { PlotLibre } from "@plotlibre/maplibre";
import { PINCER_ARROW_TYPE } from "@plotlibre/symbols";
import type { Map } from "maplibre-gl";
import type { PlaygroundApp } from "./playground-app.js";

const SAMPLE_ID = "sample-pincer-direction";

export function installPincerArrowPlayground(
  app: PlaygroundApp,
  plot: PlotLibre,
  map: Map,
  options: { readonly e2e: boolean },
): void {
  const previousLoadSample = app.loadSample.bind(app);
  app.loadSample = (): void => {
    previousLoadSample();
    addPincerArrowSample(plot);
    plot.history.clear();
    setStatus(
      "已加载南京九类箭头示例。钳形箭头保存两个配对手臂和一个显式内侧汇合点。",
      "ready",
    );
    app.refresh();
  };

  if (!options.e2e && plot.store.size > 0) {
    addPincerArrowSample(plot);
    plot.history.clear();
    setStatus(
      "已加载南京九类箭头示例。钳形箭头保存两个配对手臂和一个显式内侧汇合点。",
      "ready",
    );
    app.refresh();
  }

  const refreshInstruction = (): void => {
    queueMicrotask(() => {
      if (selectedPlotType() !== PINCER_ARROW_TYPE) return;
      setStatus(
        plot.interaction.isDrawing
          ? "钳形箭头绘制中：依次确定两个外尾、两个目标（左右顺序均可）和内侧汇合点；第五次有效点击自动完成。"
          : "已选择钳形箭头。依次点击两个外尾、两个目标和内侧汇合点；目标将自动规范化为不交叉配对。",
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

function addPincerArrowSample(plot: PlotLibre): void {
  if (plot.store.find(SAMPLE_ID)) return;
  plot.create({
    id: SAMPLE_ID,
    plotType: PINCER_ARROW_TYPE,
    controlPoints: [
      [118.748, 32.035],
      [118.792, 32.035],
      [118.71, 32.13],
      [118.83, 32.13],
      [118.77, 32.055],
    ],
    style: {
      fillColor: "#35b779",
      fillOpacity: 0.5,
      lineColor: "#176c48",
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

import type { PlotLibre } from "@plotlibre/maplibre";
import { PINCER_ARROW_TYPE } from "@plotlibre/symbols";
import type { Map } from "maplibre-gl";
import type { PlaygroundApp } from "./playground-app.js";

const SAMPLE_ID = "sample-pincer-direction";

const PINCER_REJECTION_MESSAGES: Readonly<Record<string, string>> = {
  PINCER_CONTROL_COUNT_INVALID: "控制点数量不完整，请继续确定五个语义点。",
  PINCER_CONTROL_POINTS_NOT_DISTINCT: "存在重合控制点，请把汇合点或目标点移开。",
  PINCER_FORWARD_DIRECTION_UNDEFINED:
    "尾部与两个目标无法形成明确前进方向，请把目标放到尾部前方。",
  PINCER_TAILS_SAME_SIDE: "两个外尾必须位于整体前进轴两侧。",
  PINCER_JUNCTION_OUTSIDE_ZONE:
    "内侧汇合点前后位置超出允许范围，请将它移到两个外尾与目标之间并靠近尾部。",
  PINCER_JUNCTION_TOO_FAR_LATERALLY:
    "内侧汇合点横向偏离过大，请将它移回两条手臂之间。",
  PINCER_TAIL_SPAN_TOO_SHORT: "外尾与汇合点距离过短，请扩大尾部跨度。",
  PINCER_TAIL_SPAN_TOO_LONG: "外尾与汇合点距离过长，请缩小尾部跨度。",
  PINCER_ARM_TOO_SHORT: "目标距离尾部过近，请把目标向前移动。",
  PINCER_OBJECTIVE_NOT_AHEAD: "至少一个目标位于配对尾部后方，请把目标移到前方。",
  PINCER_ARM_PAIRING_CROSSES: "两条手臂仍会交叉，请调整目标位置。",
  PINCER_TAIL_FRAME_INVALID: "尾部方向与手臂方向不兼容，请调整汇合点或目标。",
  PINCER_JUNCTION_TOPOLOGY_INVALID: "汇合点无法形成唯一内侧连接，请调整其位置。",
  PINCER_SELF_INTERSECTION: "当前轮廓发生自相交，请调整汇合点或目标。",
  PINCER_PARAMETERS_INVALID: "当前钳形箭头参数无效。",
};

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
      const rejection = plot.interaction.drawRejection;
      if (plot.interaction.isDrawing && rejection) {
        const issue = rejection.issues.find((candidate) => candidate.severity === "error") ??
          rejection.issues[0];
        const detail = issue
          ? PINCER_REJECTION_MESSAGES[issue.code] ?? issue.message
          : "当前第五点无法生成有效钳形箭头，请调整后重试。";
        setStatus(`第五点未完成：${detail}`, "error");
        return;
      }

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

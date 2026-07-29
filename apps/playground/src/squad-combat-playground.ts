import type { PlotLibre } from "@plotlibre/maplibre";
import { SQUAD_COMBAT_ARROW_TYPE } from "@plotlibre/symbols";
import type { Map } from "maplibre-gl";
import type { PlaygroundApp } from "./playground-app.js";

const SAMPLE_ID = "sample-squad-combat";

export function installSquadCombatPlayground(
  app: PlaygroundApp,
  plot: PlotLibre,
  map: Map,
  options: { readonly e2e: boolean; readonly enableInE2e: boolean },
): void {
  if (options.e2e && !options.enableInE2e) return;

  installSelectorOption();

  const previousLoadSample = app.loadSample.bind(app);
  app.loadSample = (): void => {
    previousLoadSample();
    addSquadCombatSample(plot);
    plot.history.clear();
    setStatus(
      "已加载南京十类箭头示例。分队战斗箭头保存中心行动路径，尾部宽度自动派生。",
      "ready",
    );
    app.refresh();
  };

  if (!options.e2e && plot.store.size > 0) {
    addSquadCombatSample(plot);
    plot.history.clear();
    setStatus(
      "已加载南京十类箭头示例。分队战斗箭头保存中心行动路径，尾部宽度自动派生。",
      "ready",
    );
    app.refresh();
  }

  const refreshInstruction = (): void => {
    queueMicrotask(() => {
      if (selectedPlotType() !== SQUAD_COMBAT_ARROW_TYPE) return;
      setStatus(
        plot.interaction.isDrawing
          ? "分队战斗箭头绘制中：首点为尾部中心，后续点定义行动路径；双击目标或按 Enter 完成。"
          : "已选择分队战斗箭头。点击尾部中心和目标可直接完成直线形态，也可添加中间路径点后双击结束。",
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

function installSelectorOption(): void {
  const select = document.getElementById("symbol-select");
  if (!(select instanceof HTMLSelectElement)) return;
  if (select.querySelector(`option[value="${SQUAD_COMBAT_ARROW_TYPE}"]`)) return;
  const option = document.createElement("option");
  option.value = SQUAD_COMBAT_ARROW_TYPE;
  option.textContent = "分队战斗箭头";
  select.append(option);
}

function addSquadCombatSample(plot: PlotLibre): void {
  if (plot.store.find(SAMPLE_ID)) return;
  plot.create({
    id: SAMPLE_ID,
    plotType: SQUAD_COMBAT_ARROW_TYPE,
    controlPoints: [
      [118.7, 32.035],
      [118.73, 32.065],
      [118.775, 32.09],
    ],
    style: {
      fillColor: "#4fc3f7",
      fillOpacity: 0.52,
      lineColor: "#176b87",
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

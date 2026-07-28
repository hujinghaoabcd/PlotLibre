import type { PlotFeature, PlotStyle } from "@plotlibre/core";
import type { PlotLibre } from "@plotlibre/maplibre";
import {
  ASSAULT_DIRECTION_TYPE,
  FINE_ARROW_TYPE,
  STRAIGHT_ARROW_TYPE,
  TAILED_FINE_ARROW_TYPE,
} from "@plotlibre/symbols";
import type { Map } from "maplibre-gl";

interface PlaygroundElements {
  readonly symbolSelect: HTMLSelectElement;
  readonly drawButton: HTMLButtonElement;
  readonly cancelButton: HTMLButtonElement;
  readonly undoButton: HTMLButtonElement;
  readonly redoButton: HTMLButtonElement;
  readonly deleteButton: HTMLButtonElement;
  readonly clearButton: HTMLButtonElement;
  readonly sampleButton: HTMLButtonElement;
  readonly exportButton: HTMLButtonElement;
  readonly importButton: HTMLButtonElement;
  readonly importInput: HTMLInputElement;
  readonly statusText: HTMLElement;
  readonly plotCount: HTMLElement;
  readonly selectedId: HTMLElement;
  readonly selectionState: HTMLElement;
  readonly fillColor: HTMLInputElement;
  readonly fillOpacity: HTMLInputElement;
  readonly fillOpacityOutput: HTMLOutputElement;
  readonly lineColor: HTMLInputElement;
  readonly lineWidth: HTMLInputElement;
  readonly lineWidthOutput: HTMLOutputElement;
}

export interface PlaygroundAppOptions {
  readonly e2e: boolean;
}

export class PlaygroundApp {
  readonly #map: Map;
  readonly #plot: PlotLibre;
  readonly #elements: PlaygroundElements;
  readonly #e2e: boolean;
  readonly #unsubscribeStore: () => void;

  public constructor(map: Map, plot: PlotLibre, options: PlaygroundAppOptions) {
    this.#map = map;
    this.#plot = plot;
    this.#e2e = options.e2e;
    this.#elements = collectElements();
    this.#unsubscribeStore = this.#plot.store.subscribe(() => this.refresh());
  }

  public start(): void {
    this.#bindToolbar();
    this.#bindStyleControls();
    this.#bindMapRefresh();

    if (!this.#e2e && this.#plot.store.size === 0) {
      this.loadSample();
    } else {
      this.setStatus("准备就绪。选择符号后点击“开始绘制”。", "ready");
      this.refresh();
    }
  }

  public destroy(): void {
    this.#unsubscribeStore();
  }

  public refresh(): void {
    const selected = this.#selectedFeature();
    const isDrawing = this.#plot.interaction.isDrawing;
    const plotCount = this.#plot.store.size;

    this.#elements.plotCount.textContent = `${plotCount} 个标绘`;
    this.#elements.selectedId.textContent = selected?.id ?? "未选择";
    this.#elements.selectionState.textContent = selected ? "已选择" : "未选择";
    this.#elements.selectionState.dataset.state = selected ? "active" : "idle";

    this.#elements.symbolSelect.disabled = isDrawing;
    this.#elements.drawButton.disabled = isDrawing;
    this.#elements.cancelButton.disabled = !isDrawing;
    this.#elements.undoButton.disabled = !this.#plot.history.canUndo;
    this.#elements.redoButton.disabled = !this.#plot.history.canRedo;
    this.#elements.deleteButton.disabled = selected === undefined;
    this.#elements.clearButton.disabled = plotCount === 0;
    this.#elements.exportButton.disabled = plotCount === 0;

    for (const input of [
      this.#elements.fillColor,
      this.#elements.fillOpacity,
      this.#elements.lineColor,
      this.#elements.lineWidth,
    ]) {
      input.disabled = selected === undefined;
    }

    if (selected) {
      this.#syncStyleInputs(selected);
    }
  }

  public loadSample(): void {
    this.#plot.clear();

    const sampleStyle: PlotStyle = {
      fillColor: "#e54b4b",
      fillOpacity: 0.46,
      lineColor: "#8d2020",
      lineWidth: 2,
    };

    const samples = [
      {
        id: "sample-main-direction",
        plotType: STRAIGHT_ARROW_TYPE,
        controlPoints: [
          [118.755, 32.035],
          [118.835, 32.095],
        ] as const,
        style: sampleStyle,
      },
      {
        id: "sample-fine-direction",
        plotType: FINE_ARROW_TYPE,
        controlPoints: [
          [118.77, 32.105],
          [118.855, 32.065],
        ] as const,
        style: {
          fillColor: "#f29e38",
          fillOpacity: 0.56,
          lineColor: "#9a5512",
          lineWidth: 2,
        },
      },
      {
        id: "sample-tailed-fine-direction",
        plotType: TAILED_FINE_ARROW_TYPE,
        controlPoints: [
          [118.735, 32.075],
          [118.795, 32.125],
        ] as const,
        style: {
          fillColor: "#2d9cdb",
          fillOpacity: 0.46,
          lineColor: "#14608b",
          lineWidth: 2,
        },
      },
      {
        id: "sample-assault-direction",
        plotType: ASSAULT_DIRECTION_TYPE,
        controlPoints: [
          [118.805, 32.025],
          [118.885, 32.055],
        ] as const,
        style: {
          fillColor: "#9b51e0",
          fillOpacity: 0.5,
          lineColor: "#5f2b91",
          lineWidth: 2,
        },
      },
    ];

    for (const sample of samples) {
      this.#plot.create({
        id: sample.id,
        plotType: sample.plotType,
        controlPoints: sample.controlPoints,
        style: sample.style,
        metadata: { source: "PlotLibre playground sample" },
      });
    }

    this.#plot.history.clear();
    this.#plot.select(samples[0]?.id);
    this.#map.fitBounds(
      [
        [118.7, 31.99],
        [118.92, 32.16],
      ],
      { padding: 72, duration: 500 },
    );
    this.setStatus(
      "已加载南京四类箭头示例。可拖动控制点或修改右侧样式。",
      "ready",
    );
    this.refresh();
  }

  #bindToolbar(): void {
    this.#elements.symbolSelect.addEventListener("change", () => {
      this.setStatus(
        `已选择${this.#selectedSymbolLabel()}。点击“开始绘制”后在地图上确定箭尾和箭尖。`,
        "ready",
      );
    });

    this.#elements.drawButton.addEventListener("click", () => {
      try {
        const plotType = this.#elements.symbolSelect.value;
        this.#plot.draw(plotType, { style: this.#currentInputStyle() });
        this.setStatus(
          `正在绘制${this.#selectedSymbolLabel()}：请点击箭尾，再移动鼠标并点击箭尖。`,
          "drawing",
        );
        this.refresh();
      } catch (error) {
        this.#reportError("无法开始绘制", error);
      }
    });

    this.#elements.cancelButton.addEventListener("click", () => {
      const cancelled = this.#plot.cancelDrawing();
      this.setStatus(
        cancelled ? "已取消当前绘制。" : "当前没有正在进行的绘制。",
        "ready",
      );
      this.refresh();
    });

    this.#elements.undoButton.addEventListener("click", () => {
      const changed = this.#plot.undo();
      this.setStatus(changed ? "已撤销上一步操作。" : "没有可撤销的操作。", "ready");
      this.refresh();
    });

    this.#elements.redoButton.addEventListener("click", () => {
      const changed = this.#plot.redo();
      this.setStatus(changed ? "已重做操作。" : "没有可重做的操作。", "ready");
      this.refresh();
    });

    this.#elements.deleteButton.addEventListener("click", () => {
      const selectedId = this.#plot.interaction.selectedId;
      if (!selectedId) return;
      this.#plot.remove(selectedId);
      this.#plot.select(undefined);
      this.setStatus(`已删除 ${selectedId}。`, "ready");
      this.refresh();
    });

    this.#elements.clearButton.addEventListener("click", () => {
      this.#plot.clear();
      this.setStatus("已清空当前文档。", "ready");
      this.refresh();
    });

    this.#elements.sampleButton.addEventListener("click", () => this.loadSample());
    this.#elements.exportButton.addEventListener("click", () => this.#exportDocument());
    this.#elements.importButton.addEventListener("click", () => this.#elements.importInput.click());
    this.#elements.importInput.addEventListener("change", () => void this.#importDocument());
  }

  #bindStyleControls(): void {
    this.#elements.fillOpacity.addEventListener("input", () => {
      this.#elements.fillOpacityOutput.value = Number(
        this.#elements.fillOpacity.value,
      ).toFixed(2);
    });
    this.#elements.lineWidth.addEventListener("input", () => {
      this.#elements.lineWidthOutput.value = `${this.#elements.lineWidth.value} px`;
    });

    this.#elements.fillColor.addEventListener("change", () => {
      this.#replaceSelectedStyle({ fillColor: this.#elements.fillColor.value });
    });
    this.#elements.fillOpacity.addEventListener("change", () => {
      this.#replaceSelectedStyle({
        fillOpacity: Number(this.#elements.fillOpacity.value),
      });
    });
    this.#elements.lineColor.addEventListener("change", () => {
      this.#replaceSelectedStyle({ lineColor: this.#elements.lineColor.value });
    });
    this.#elements.lineWidth.addEventListener("change", () => {
      this.#replaceSelectedStyle({
        lineWidth: Number(this.#elements.lineWidth.value),
      });
    });
  }

  #bindMapRefresh(): void {
    const deferredRefresh = (): void => {
      queueMicrotask(() => {
        if (this.#plot.interaction.isDrawing) {
          this.setStatus("绘制中：再次点击地图完成；Escape 取消。", "drawing");
        } else if (this.#plot.interaction.selectedId) {
          this.setStatus("对象已选择。拖动圆形控制点可重新编辑。", "selected");
        }
        this.refresh();
      });
    };

    this.#map.on("click", deferredRefresh);
    this.#map.on("mouseup", deferredRefresh);
    this.#map.on("style.load", deferredRefresh);
    this.#map.getCanvas().addEventListener("keydown", deferredRefresh);
  }

  #replaceSelectedStyle(patch: PlotStyle): void {
    const selected = this.#selectedFeature();
    if (!selected) return;

    this.#plot.replace({
      ...selected,
      style: {
        ...selected.style,
        ...patch,
      },
    });
    this.setStatus("已更新选中对象样式。", "selected");
    this.refresh();
  }

  #selectedFeature(): PlotFeature | undefined {
    const selectedId = this.#plot.interaction.selectedId;
    return selectedId ? this.#plot.store.find(selectedId) : undefined;
  }

  #selectedSymbolLabel(): string {
    return this.#elements.symbolSelect.selectedOptions[0]?.textContent?.trim() ??
      this.#elements.symbolSelect.value;
  }

  #syncStyleInputs(feature: PlotFeature): void {
    const fillColor = feature.style.fillColor ?? "#d32f2f";
    const fillOpacity = feature.style.fillOpacity ?? 0.45;
    const lineColor = feature.style.lineColor ?? "#8e0000";
    const lineWidth = feature.style.lineWidth ?? 2;

    this.#elements.fillColor.value = fillColor;
    this.#elements.fillOpacity.value = String(fillOpacity);
    this.#elements.fillOpacityOutput.value = fillOpacity.toFixed(2);
    this.#elements.lineColor.value = lineColor;
    this.#elements.lineWidth.value = String(lineWidth);
    this.#elements.lineWidthOutput.value = `${lineWidth} px`;
  }

  #currentInputStyle(): PlotStyle {
    return {
      fillColor: this.#elements.fillColor.value,
      fillOpacity: Number(this.#elements.fillOpacity.value),
      lineColor: this.#elements.lineColor.value,
      lineWidth: Number(this.#elements.lineWidth.value),
    };
  }

  #exportDocument(): void {
    const json = this.#plot.exportJson("plotlibre-playground", "PlotLibre Playground");
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "plotlibre-playground.plotjson.json";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    this.setStatus("PlotJSON 已导出。", "ready");
  }

  async #importDocument(): Promise<void> {
    const file = this.#elements.importInput.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const documentData = this.#plot.importDocument(text);
      this.setStatus(
        `已导入“${documentData.name}”，共 ${documentData.features.length} 个标绘。`,
        "ready",
      );
    } catch (error) {
      this.#reportError("PlotJSON 导入失败", error);
    } finally {
      this.#elements.importInput.value = "";
      this.refresh();
    }
  }

  private setStatus(message: string, state: string): void {
    this.#elements.statusText.textContent = message;
    this.#elements.statusText.dataset.state = state;
  }

  #reportError(prefix: string, error: unknown): void {
    const detail = error instanceof Error ? error.message : String(error);
    this.setStatus(`${prefix}：${detail}`, "error");
    console.error(prefix, error);
  }
}

function collectElements(): PlaygroundElements {
  return {
    symbolSelect: required("symbol-select", HTMLSelectElement),
    drawButton: required("draw-button", HTMLButtonElement),
    cancelButton: required("cancel-button", HTMLButtonElement),
    undoButton: required("undo-button", HTMLButtonElement),
    redoButton: required("redo-button", HTMLButtonElement),
    deleteButton: required("delete-button", HTMLButtonElement),
    clearButton: required("clear-button", HTMLButtonElement),
    sampleButton: required("sample-button", HTMLButtonElement),
    exportButton: required("export-button", HTMLButtonElement),
    importButton: required("import-button", HTMLButtonElement),
    importInput: required("import-input", HTMLInputElement),
    statusText: required("status-text", HTMLElement),
    plotCount: required("plot-count", HTMLElement),
    selectedId: required("selected-id", HTMLElement),
    selectionState: required("selection-state", HTMLElement),
    fillColor: required("fill-color", HTMLInputElement),
    fillOpacity: required("fill-opacity", HTMLInputElement),
    fillOpacityOutput: required("fill-opacity-output", HTMLOutputElement),
    lineColor: required("line-color", HTMLInputElement),
    lineWidth: required("line-width", HTMLInputElement),
    lineWidthOutput: required("line-width-output", HTMLOutputElement),
  };
}

function required<T extends HTMLElement>(
  id: string,
  constructor: { new (): T },
): T {
  const element = document.getElementById(id);
  if (!(element instanceof constructor)) {
    throw new Error(`Expected #${id} to be ${constructor.name}.`);
  }
  return element;
}

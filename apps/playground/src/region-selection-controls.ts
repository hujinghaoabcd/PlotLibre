import type {
  MapLibreSelectionRegionSnapshot,
  PlotLibre,
} from "@plotlibre/maplibre";

/**
 * Adds explicit one-shot region-selection controls without coupling the main
 * Playground application class to MapLibre-specific pointer state.
 */
export function installRegionSelectionPlayground(plot: PlotLibre): () => void {
  const toolbar = document.querySelector<HTMLElement>(".toolbar");
  const insertionPoint = document.getElementById("undo-button");
  const status = document.getElementById("status-text");
  if (!toolbar || !insertionPoint || !status) {
    throw new Error("Region selection Playground anchors are unavailable.");
  }

  const divider = document.createElement("span");
  divider.className = "toolbar-divider";
  divider.setAttribute("aria-hidden", "true");

  const boxButton = createButton(
    "box-select-button",
    "框选",
    "开始一次矩形区域选择",
  );
  const lassoButton = createButton(
    "lasso-select-button",
    "套索",
    "开始一次自由套索选择",
  );
  const cancelButton = createButton(
    "cancel-region-button",
    "取消区域",
    "取消当前框选或套索",
  );
  cancelButton.disabled = true;

  toolbar.insertBefore(divider, insertionPoint);
  toolbar.insertBefore(boxButton, insertionPoint);
  toolbar.insertBefore(lassoButton, insertionPoint);
  toolbar.insertBefore(cancelButton, insertionPoint);

  let previousStatus = plot.regionSelectionSnapshot.status;

  const setStatus = (message: string, state: string): void => {
    status.textContent = message;
    status.dataset.state = state;
  };

  const refresh = (snapshot: MapLibreSelectionRegionSnapshot): void => {
    const active = snapshot.status !== "idle";
    boxButton.dataset.state = snapshot.kind === "box" && active ? "active" : "idle";
    lassoButton.dataset.state = snapshot.kind === "lasso" && active ? "active" : "idle";
    cancelButton.disabled = !active;

    switch (snapshot.status) {
      case "armed":
        setStatus(
          snapshot.kind === "box"
            ? "框选已就绪：在地图拖出矩形。Shift 添加，Ctrl/Cmd 切换，Alt 移除。"
            : "套索已就绪：在地图按住并沿目标外缘拖动。Shift 添加，Ctrl/Cmd 切换，Alt 移除。",
          "drawing",
        );
        break;
      case "active":
        setStatus(
          snapshot.kind === "box"
            ? "正在框选；释放鼠标后按语义几何精确判定。Escape 取消。"
            : "正在套索；释放鼠标后校验简单环并精确判定。Escape 取消。",
          "drawing",
        );
        break;
      case "rejected":
        setStatus(
          `区域选择被拒绝：${snapshot.rejection?.message ?? "区域无效"}。可直接重新拖动或按 Escape 取消。`,
          "error",
        );
        break;
      case "idle":
        if (previousStatus !== "idle") {
          const count = plot.selectedIds.length;
          setStatus(
            count === 0
              ? "区域选择完成，当前未选中对象。"
              : `区域选择完成，已选择 ${count} 个对象，Primary 为 ${plot.selectedId ?? "无"}。`,
            count > 0 ? "selected" : "ready",
          );
        }
        break;
    }
    previousStatus = snapshot.status;
  };

  boxButton.addEventListener("click", () => {
    refresh(plot.startBoxSelection());
  });
  lassoButton.addEventListener("click", () => {
    refresh(plot.startLassoSelection());
  });
  cancelButton.addEventListener("click", () => {
    const cancelled = plot.cancelRegionSelection();
    setStatus(
      cancelled ? "已取消区域选择。" : "当前没有正在进行的区域选择。",
      "ready",
    );
    refresh(plot.regionSelectionSnapshot);
  });

  const unsubscribe = plot.regionSelection.subscribe(refresh);
  refresh(plot.regionSelectionSnapshot);

  return () => {
    unsubscribe();
    divider.remove();
    boxButton.remove();
    lassoButton.remove();
    cancelButton.remove();
  };
}

function createButton(
  testId: string,
  label: string,
  ariaLabel: string,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.id = testId;
  button.dataset.testid = testId;
  button.type = "button";
  button.textContent = label;
  button.setAttribute("aria-label", ariaLabel);
  return button;
}

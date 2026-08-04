import type {
  MapLibreSelectionTransformSnapshot,
  PlotLibre,
} from "@plotlibre/maplibre";

/**
 * Adds explicit one-shot whole-selection rotation and positive-uniform-scale
 * controls without coupling PlaygroundApp to MapLibre pointer state.
 */
export function installSelectionTransformPlayground(plot: PlotLibre): () => void {
  const toolbar = document.querySelector<HTMLElement>(".toolbar");
  const insertionPoint = document.getElementById("undo-button");
  const status = document.getElementById("status-text");
  if (!toolbar || !insertionPoint || !status) {
    throw new Error("Selection transform Playground anchors are unavailable.");
  }

  const divider = document.createElement("span");
  divider.className = "toolbar-divider";
  divider.setAttribute("aria-hidden", "true");

  const rotateButton = createButton(
    "rotate-selection-button",
    "旋转",
    "开始一次选中对象整体旋转",
  );
  const scaleButton = createButton(
    "scale-selection-button",
    "缩放",
    "开始一次选中对象正比例整体缩放",
  );
  const cancelButton = createButton(
    "cancel-transform-button",
    "取消变换",
    "取消当前旋转或缩放模式",
  );
  cancelButton.disabled = true;

  toolbar.insertBefore(divider, insertionPoint);
  toolbar.insertBefore(rotateButton, insertionPoint);
  toolbar.insertBefore(scaleButton, insertionPoint);
  toolbar.insertBefore(cancelButton, insertionPoint);

  let previousStatus = plot.selectionTransformSnapshot.status;

  const setStatus = (message: string, state: string): void => {
    status.textContent = message;
    status.dataset.state = state;
  };

  const refresh = (snapshot: MapLibreSelectionTransformSnapshot): void => {
    const active = snapshot.status !== "idle";
    rotateButton.dataset.state =
      snapshot.kind === "rotate" && active ? "active" : "idle";
    scaleButton.dataset.state =
      snapshot.kind === "scale" && active ? "active" : "idle";
    cancelButton.disabled = !active;

    switch (snapshot.status) {
      case "armed":
        setStatus(
          snapshot.kind === "rotate"
            ? "整体旋转已就绪：拖动紫色旋转手柄。正角度为顺时针，Escape 取消。"
            : "整体缩放已就绪：拖动蓝色缩放手柄。允许范围为 0.01–100，Escape 取消。",
          "drawing",
        );
        break;
      case "active":
        setStatus(
          snapshot.kind === "rotate"
            ? `正在整体旋转：${(snapshot.clockwiseDegrees ?? 0).toFixed(1)}°。释放后原子提交。`
            : `正在整体缩放：×${(snapshot.scaleFactor ?? 1).toFixed(3)}。释放后原子提交。`,
          "drawing",
        );
        break;
      case "rejected":
        setStatus(
          `整体变换被拒绝：${snapshot.rejection?.message ?? "变换无效"}。可直接重新拖动手柄或按 Escape 取消。`,
          "error",
        );
        break;
      case "idle":
        if (previousStatus !== "idle") {
          const count = plot.selectedIds.length;
          setStatus(
            count === 0
              ? "整体变换已结束，当前未选中对象。"
              : `整体变换已结束，仍选中 ${count} 个对象，Primary 为 ${plot.selectedId ?? "无"}。`,
            count > 0 ? "selected" : "ready",
          );
        }
        break;
    }
    previousStatus = snapshot.status;
  };

  rotateButton.addEventListener("click", () => {
    refresh(plot.startSelectionRotation());
  });
  scaleButton.addEventListener("click", () => {
    refresh(plot.startSelectionScale());
  });
  cancelButton.addEventListener("click", () => {
    const cancelled = plot.cancelSelectionTransform();
    setStatus(
      cancelled ? "已取消整体变换。" : "当前没有正在进行的整体变换。",
      "ready",
    );
    refresh(plot.selectionTransformSnapshot);
  });

  const unsubscribe = plot.selectionTransform.subscribe(refresh);
  refresh(plot.selectionTransformSnapshot);

  return () => {
    unsubscribe();
    divider.remove();
    rotateButton.remove();
    scaleButton.remove();
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

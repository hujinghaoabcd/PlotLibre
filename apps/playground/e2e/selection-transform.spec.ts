import { expect, test, type Page } from "@playwright/test";

interface TransformHandleGeometry {
  readonly mapX: number;
  readonly mapY: number;
  readonly pivotX: number;
  readonly pivotY: number;
  readonly handleX: number;
  readonly handleY: number;
}

async function openEmptyPlayground(page: Page): Promise<void> {
  await page.goto("/PlotLibre/?e2e=1");
  await expect(page.getByTestId("status-text")).toContainText("准备就绪");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await expect(page.getByTestId("rotate-selection-button")).toBeVisible();
  await expect(page.getByTestId("scale-selection-button")).toBeVisible();
}

async function seedTransformSelection(page: Page): Promise<void> {
  await page.evaluate(() => {
    const playground = window.__plotlibrePlayground;
    if (!playground) throw new Error("Playground API is unavailable.");
    const { plot } = playground;
    plot.clear();
    plot.create({
      id: "transform-a",
      plotType: "arrow.straight",
      controlPoints: [
        [118.755, 32.035],
        [118.79, 32.065],
      ],
      parameters: { widthRatio: 0.11, minimumWidthMeters: 12 },
      style: { fillColor: "#1565c0", fillOpacity: 0.72 },
      metadata: { group: "left" },
    });
    plot.create({
      id: "transform-b",
      plotType: "area.gathering-place",
      controlPoints: [
        [118.805, 32.035],
        [118.83, 32.08],
        [118.855, 32.035],
      ],
      parameters: { sampleCount: 36 },
      style: { fillColor: "#ef6c00", fillOpacity: 0.55 },
      metadata: { group: "right" },
    });
    plot.selection.replace(["transform-a", "transform-b"]);
    plot.history.clear();
  });

  await expect
    .poll(() =>
      page.evaluate(() => {
        const plot = window.__plotlibrePlayground?.plot;
        return plot
          ? {
              selectedIds: plot.selectedIds,
              primaryId: plot.selectedId,
              history: plot.history.undoDepth,
            }
          : undefined;
      }),
    )
    .toEqual({
      selectedIds: ["transform-a", "transform-b"],
      primaryId: "transform-b",
      history: 0,
    });
}

async function transformHandleGeometry(
  page: Page,
  kind: "rotate" | "scale",
): Promise<TransformHandleGeometry> {
  const handle = page.locator(
    `[data-plotlibre-selection-transform-handle="${kind}"]`,
  );
  await expect(handle).toBeVisible();
  return page.evaluate((transformKind) => {
    const mapElement = document.getElementById("map");
    const root = document.querySelector<HTMLElement>(
      '[data-plotlibre-selection-transform="true"]',
    );
    const pivot = root?.querySelector<SVGCircleElement>(
      'circle:not([data-plotlibre-selection-transform-handle])',
    );
    const handleElement = root?.querySelector<SVGCircleElement>(
      `[data-plotlibre-selection-transform-handle="${transformKind}"]`,
    );
    if (!mapElement || !root || !pivot || !handleElement) {
      throw new Error("Selection transform overlay geometry is unavailable.");
    }
    const mapBox = mapElement.getBoundingClientRect();
    const numberAttribute = (element: SVGCircleElement, name: string): number => {
      const value = Number(element.getAttribute(name));
      if (!Number.isFinite(value)) throw new Error(`Invalid ${name} attribute.`);
      return value;
    };
    return {
      mapX: mapBox.left,
      mapY: mapBox.top,
      pivotX: numberAttribute(pivot, "cx"),
      pivotY: numberAttribute(pivot, "cy"),
      handleX: numberAttribute(handleElement, "cx"),
      handleY: numberAttribute(handleElement, "cy"),
    };
  }, kind);
}

async function dragTransformHandle(
  page: Page,
  geometry: TransformHandleGeometry,
  targetX: number,
  targetY: number,
): Promise<void> {
  await page.mouse.move(
    geometry.mapX + geometry.handleX,
    geometry.mapY + geometry.handleY,
  );
  await page.mouse.down();
  await page.mouse.move(
    geometry.mapX + targetX,
    geometry.mapY + targetY,
    { steps: 8 },
  );
  await page.mouse.up();
}

async function capturedState(page: Page) {
  return page.evaluate(() => {
    const plot = window.__plotlibrePlayground?.plot;
    if (!plot) throw new Error("Playground API is unavailable.");
    return {
      features: ["transform-a", "transform-b"].map((id) => {
        const feature = plot.store.get(id);
        return {
          id,
          controlPoints: feature.controlPoints,
          parameters: feature.parameters,
          style: feature.style,
          metadata: feature.metadata,
          revision: feature.revision,
        };
      }),
      order: plot.store.list().map((feature) => feature.id),
      selectedIds: plot.selectedIds,
      primaryId: plot.selectedId,
      undoDepth: plot.history.undoDepth,
      redoDepth: plot.history.redoDepth,
    };
  });
}

test("explicit rotation commits one atomic multi-selection command and undo/redo is exact", async ({
  page,
}) => {
  await openEmptyPlayground(page);
  await seedTransformSelection(page);
  const before = await capturedState(page);

  await page.getByTestId("rotate-selection-button").click();
  await expect(page.getByTestId("status-text")).toContainText("整体旋转已就绪");
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__plotlibrePlayground?.plot.selectionTransformSnapshot.status,
      ),
    )
    .toBe("armed");

  const geometry = await transformHandleGeometry(page, "rotate");
  const deltaX = geometry.handleX - geometry.pivotX;
  const deltaY = geometry.handleY - geometry.pivotY;
  const targetX = geometry.pivotX - deltaY;
  const targetY = geometry.pivotY + deltaX;

  await page.mouse.move(
    geometry.mapX + geometry.handleX,
    geometry.mapY + geometry.handleY,
  );
  await page.mouse.down();
  await page.mouse.move(
    geometry.mapX + targetX,
    geometry.mapY + targetY,
    { steps: 8 },
  );

  await expect
    .poll(() =>
      page.evaluate(() => {
        const plot = window.__plotlibrePlayground?.plot;
        return plot
          ? {
              status: plot.selectionTransformSnapshot.status,
              revisions: [
                plot.store.get("transform-a").revision,
                plot.store.get("transform-b").revision,
              ],
              history: plot.history.undoDepth,
            }
          : undefined;
      }),
    )
    .toEqual({ status: "active", revisions: [0, 0], history: 0 });
  await page.mouse.up();

  const after = await capturedState(page);
  expect(after.undoDepth).toBe(1);
  expect(after.redoDepth).toBe(0);
  expect(after.order).toEqual(before.order);
  expect(after.selectedIds).toEqual(before.selectedIds);
  expect(after.primaryId).toBe(before.primaryId);
  expect(after.features.map((feature) => feature.revision)).toEqual([1, 1]);
  expect(after.features[0]?.controlPoints).not.toEqual(
    before.features[0]?.controlPoints,
  );
  expect(after.features[1]?.controlPoints).not.toEqual(
    before.features[1]?.controlPoints,
  );
  expect(after.features.map((feature) => feature.parameters)).toEqual(
    before.features.map((feature) => feature.parameters),
  );
  expect(after.features.map((feature) => feature.style)).toEqual(
    before.features.map((feature) => feature.style),
  );
  expect(after.features.map((feature) => feature.metadata)).toEqual(
    before.features.map((feature) => feature.metadata),
  );
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__plotlibrePlayground?.plot.selectionTransformSnapshot.status,
      ),
    )
    .toBe("idle");

  await page.evaluate(() => window.__plotlibrePlayground?.plot.undo());
  expect(await capturedState(page)).toEqual({
    ...before,
    undoDepth: 0,
    redoDepth: 1,
  });

  await page.evaluate(() => window.__plotlibrePlayground?.plot.redo());
  expect(await capturedState(page)).toEqual(after);
});

test("rejected scale preserves Store and retries directly in the same explicit mode", async ({
  page,
}) => {
  await openEmptyPlayground(page);
  await seedTransformSelection(page);
  const before = await capturedState(page);

  await page.getByTestId("scale-selection-button").click();
  await expect(page.getByTestId("status-text")).toContainText("整体缩放已就绪");
  let geometry = await transformHandleGeometry(page, "scale");

  await dragTransformHandle(
    page,
    geometry,
    geometry.pivotX,
    geometry.pivotY,
  );

  await expect
    .poll(() =>
      page.evaluate(() => {
        const plot = window.__plotlibrePlayground?.plot;
        return plot
          ? {
              status: plot.selectionTransformSnapshot.status,
              code: plot.selectionTransformRejection?.code,
              history: plot.history.undoDepth,
            }
          : undefined;
      }),
    )
    .toEqual({
      status: "rejected",
      code: "SELECTION_TRANSFORM_SCALE_OUT_OF_RANGE",
      history: 0,
    });
  expect(await capturedState(page)).toEqual(before);
  await expect(page.getByTestId("status-text")).toContainText("整体变换被拒绝");

  geometry = await transformHandleGeometry(page, "scale");
  const factor = 1.5;
  await dragTransformHandle(
    page,
    geometry,
    geometry.pivotX + factor * (geometry.handleX - geometry.pivotX),
    geometry.pivotY + factor * (geometry.handleY - geometry.pivotY),
  );

  const after = await capturedState(page);
  expect(after.undoDepth).toBe(1);
  expect(after.order).toEqual(before.order);
  expect(after.selectedIds).toEqual(before.selectedIds);
  expect(after.primaryId).toBe(before.primaryId);
  expect(after.features.map((feature) => feature.revision)).toEqual([1, 1]);
  expect(after.features.map((feature) => feature.parameters)).toEqual(
    before.features.map((feature) => feature.parameters),
  );
  expect(after.features.map((feature) => feature.style)).toEqual(
    before.features.map((feature) => feature.style),
  );
  expect(after.features.map((feature) => feature.metadata)).toEqual(
    before.features.map((feature) => feature.metadata),
  );
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__plotlibrePlayground?.plot.selectionTransformSnapshot.status,
      ),
    )
    .toBe("idle");
});

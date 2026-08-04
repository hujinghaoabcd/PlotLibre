import { expect, test, type Page } from "@playwright/test";

interface ProjectedBodies {
  readonly a: { readonly x: number; readonly y: number };
  readonly b: { readonly x: number; readonly y: number };
}

async function openEmptyPlayground(page: Page): Promise<void> {
  await page.goto("/PlotLibre/?e2e=1");
  await expect(page.getByTestId("status-text")).toContainText("准备就绪");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
}

async function canvasBox(page: Page) {
  const box = await page.locator(".maplibregl-canvas").boundingBox();
  if (!box) throw new Error("MapLibre canvas does not have a bounding box.");
  return box;
}

async function seedTwoArrows(page: Page): Promise<ProjectedBodies> {
  const projected = await page.evaluate(() => {
    const playground = window.__plotlibrePlayground;
    if (!playground) throw new Error("Playground API is unavailable.");
    const { plot, map } = playground;
    plot.create({
      id: "selection-a",
      plotType: "arrow.straight",
      controlPoints: [
        [118.76, 32.045],
        [118.795, 32.075],
      ],
    });
    plot.create({
      id: "selection-b",
      plotType: "arrow.straight",
      controlPoints: [
        [118.81, 32.045],
        [118.845, 32.075],
      ],
    });
    const a = map.project([118.7775, 32.06]);
    const b = map.project([118.8275, 32.06]);
    return {
      a: { x: a.x, y: a.y },
      b: { x: b.x, y: b.y },
    };
  });

  await expect
    .poll(async () =>
      page.evaluate(() => {
        const playground = window.__plotlibrePlayground;
        return playground?.map.querySourceFeatures("plotlibre-committed").length ?? 0;
      }),
    )
    .toBeGreaterThanOrEqual(4);
  return projected;
}

async function selectBoth(
  page: Page,
  projected: ProjectedBodies,
): Promise<void> {
  const box = await canvasBox(page);
  await page.mouse.click(box.x + projected.a.x, box.y + projected.a.y);
  await page.keyboard.down("Shift");
  await page.mouse.click(box.x + projected.b.x, box.y + projected.b.y);
  await page.keyboard.up("Shift");

  await expect
    .poll(async () =>
      page.evaluate(() => {
        const playground = window.__plotlibrePlayground;
        return playground?.plot.selectedIds ?? [];
      }),
    )
    .toEqual(["selection-a", "selection-b"]);
}

test("Shift selection translates as one undoable body-drag transaction", async ({
  page,
}) => {
  await openEmptyPlayground(page);
  const projected = await seedTwoArrows(page);
  await selectBoth(page, projected);
  const box = await canvasBox(page);

  const before = await page.evaluate(() => {
    const playground = window.__plotlibrePlayground;
    if (!playground) throw new Error("Playground API is unavailable.");
    return {
      a: playground.plot.store.get("selection-a").controlPoints,
      b: playground.plot.store.get("selection-b").controlPoints,
      undoDepth: playground.plot.history.undoDepth,
    };
  });

  await page.mouse.move(box.x + projected.a.x, box.y + projected.a.y);
  await page.mouse.down();
  await page.mouse.move(
    box.x + projected.a.x + 42,
    box.y + projected.a.y - 24,
    { steps: 6 },
  );

  await expect
    .poll(async () =>
      page.evaluate(() => {
        const playground = window.__plotlibrePlayground;
        if (!playground) return false;
        return (
          playground.plot.translation.isTranslating &&
          playground.map.querySourceFeatures("plotlibre-selection").length > 0 &&
          playground.plot.store.get("selection-a").revision === 0 &&
          playground.plot.store.get("selection-b").revision === 0
        );
      }),
    )
    .toBe(true);

  await page.mouse.up();
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const playground = window.__plotlibrePlayground;
        if (!playground) return undefined;
        return {
          revisions: [
            playground.plot.store.get("selection-a").revision,
            playground.plot.store.get("selection-b").revision,
          ],
          selectedIds: playground.plot.selectedIds,
          primaryId: playground.plot.selectedId,
          undoDepth: playground.plot.history.undoDepth,
        };
      }),
    )
    .toEqual({
      revisions: [1, 1],
      selectedIds: ["selection-b", "selection-a"],
      primaryId: "selection-a",
      undoDepth: before.undoDepth + 1,
    });

  const moved = await page.evaluate(() => {
    const playground = window.__plotlibrePlayground;
    if (!playground) throw new Error("Playground API is unavailable.");
    return {
      a: playground.plot.store.get("selection-a").controlPoints,
      b: playground.plot.store.get("selection-b").controlPoints,
    };
  });
  expect(moved.a).not.toEqual(before.a);
  expect(moved.b).not.toEqual(before.b);

  await page.evaluate(() => window.__plotlibrePlayground?.plot.undo());
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const playground = window.__plotlibrePlayground;
        if (!playground) return undefined;
        return {
          a: playground.plot.store.get("selection-a").controlPoints,
          b: playground.plot.store.get("selection-b").controlPoints,
          selectedIds: playground.plot.selectedIds,
        };
      }),
    )
    .toEqual({
      a: before.a,
      b: before.b,
      selectedIds: ["selection-b", "selection-a"],
    });

  await page.evaluate(() => window.__plotlibrePlayground?.plot.redo());
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const playground = window.__plotlibrePlayground;
        if (!playground) return undefined;
        return {
          a: playground.plot.store.get("selection-a").controlPoints,
          b: playground.plot.store.get("selection-b").controlPoints,
        };
      }),
    )
    .toEqual(moved);

  const depthBeforeCancel = await page.evaluate(
    () => window.__plotlibrePlayground?.plot.history.undoDepth,
  );
  await page.mouse.move(
    box.x + projected.a.x + 42,
    box.y + projected.a.y - 24,
  );
  await page.mouse.down();
  await page.mouse.move(
    box.x + projected.a.x + 70,
    box.y + projected.a.y - 45,
    { steps: 4 },
  );
  await page.keyboard.press("Escape");
  await page.mouse.up();

  await expect
    .poll(async () =>
      page.evaluate(() => {
        const playground = window.__plotlibrePlayground;
        if (!playground) return undefined;
        return {
          translating: playground.plot.translation.isTranslating,
          undoDepth: playground.plot.history.undoDepth,
          a: playground.plot.store.get("selection-a").controlPoints,
          b: playground.plot.store.get("selection-b").controlPoints,
          selectedIds: playground.plot.selectedIds,
        };
      }),
    )
    .toEqual({
      translating: false,
      undoDepth: depthBeforeCancel,
      a: moved.a,
      b: moved.b,
      selectedIds: ["selection-b", "selection-a"],
    });
});

test("Delete removes the complete selection and undo restores order and primary", async ({
  page,
}) => {
  await openEmptyPlayground(page);
  const projected = await seedTwoArrows(page);
  await selectBoth(page, projected);

  await page.keyboard.press("Delete");
  await expect(page.getByTestId("plot-count")).toHaveText("0 个标绘");
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const playground = window.__plotlibrePlayground;
        if (!playground) return undefined;
        return {
          ids: playground.plot.store.list().map((feature) => feature.id),
          selectedIds: playground.plot.selectedIds,
        };
      }),
    )
    .toEqual({ ids: [], selectedIds: [] });

  await page.evaluate(() => window.__plotlibrePlayground?.plot.undo());
  await expect(page.getByTestId("plot-count")).toHaveText("2 个标绘");
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const playground = window.__plotlibrePlayground;
        if (!playground) return undefined;
        return {
          ids: playground.plot.store.list().map((feature) => feature.id),
          selectedIds: playground.plot.selectedIds,
          primaryId: playground.plot.selectedId,
        };
      }),
    )
    .toEqual({
      ids: ["selection-a", "selection-b"],
      selectedIds: ["selection-a", "selection-b"],
      primaryId: "selection-b",
    });

  await page.evaluate(() => window.__plotlibrePlayground?.plot.redo());
  await expect(page.getByTestId("plot-count")).toHaveText("0 个标绘");
});

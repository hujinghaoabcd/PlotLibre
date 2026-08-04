import { expect, test, type Page } from "@playwright/test";

interface ScreenBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

async function openEmptyPlayground(page: Page): Promise<void> {
  await page.goto("/PlotLibre/?e2e=1");
  await expect(page.getByTestId("status-text")).toContainText("准备就绪");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await expect(page.getByTestId("box-select-button")).toBeVisible();
  await expect(page.getByTestId("lasso-select-button")).toBeVisible();
}

async function canvasBox(page: Page) {
  const box = await page.locator(".maplibregl-canvas").boundingBox();
  if (!box) throw new Error("MapLibre canvas does not have a bounding box.");
  return box;
}

async function seedRegionArrows(page: Page): Promise<ScreenBounds> {
  await page.evaluate(() => {
    const playground = window.__plotlibrePlayground;
    if (!playground) throw new Error("Playground API is unavailable.");
    const { plot } = playground;
    plot.clear();
    plot.create({
      id: "region-a",
      plotType: "arrow.straight",
      controlPoints: [
        [118.75, 32.035],
        [118.78, 32.06],
      ],
    });
    plot.create({
      id: "region-b",
      plotType: "arrow.straight",
      controlPoints: [
        [118.80, 32.035],
        [118.83, 32.06],
      ],
    });
    plot.create({
      id: "region-c",
      plotType: "arrow.straight",
      controlPoints: [
        [118.865, 32.105],
        [118.895, 32.13],
      ],
    });
    plot.history.clear();
  });

  await expect
    .poll(async () =>
      page.evaluate(() => {
        const playground = window.__plotlibrePlayground;
        return playground?.map.querySourceFeatures("plotlibre-committed").length ?? 0;
      }),
    )
    .toBeGreaterThanOrEqual(6);

  return page.evaluate(() => {
    const playground = window.__plotlibrePlayground;
    if (!playground) throw new Error("Playground API is unavailable.");
    const points = ["region-a", "region-b"].flatMap((id) =>
      playground.plot.store.get(id).controlPoints.map((coordinate) =>
        playground.map.project([coordinate[0], coordinate[1]]),
      ),
    );
    return {
      minX: Math.min(...points.map((point) => point.x)) - 14,
      minY: Math.min(...points.map((point) => point.y)) - 14,
      maxX: Math.max(...points.map((point) => point.x)) + 14,
      maxY: Math.max(...points.map((point) => point.y)) + 14,
    };
  });
}

async function dragBox(page: Page, bounds: ScreenBounds): Promise<void> {
  const canvas = await canvasBox(page);
  await page.mouse.move(canvas.x + bounds.minX, canvas.y + bounds.minY);
  await page.mouse.down();
  await page.mouse.move(canvas.x + bounds.maxX, canvas.y + bounds.maxY, {
    steps: 6,
  });
  await expect(
    page.locator('[data-plotlibre-selection-region="true"]'),
  ).toBeVisible();
  await page.mouse.up();
}

async function dragLasso(
  page: Page,
  points: readonly (readonly [number, number])[],
  steps = 3,
): Promise<void> {
  const canvas = await canvasBox(page);
  const [first, ...rest] = points;
  if (!first) throw new Error("Lasso requires at least one point.");
  await page.mouse.move(canvas.x + first[0], canvas.y + first[1]);
  await page.mouse.down();
  for (const point of rest) {
    await page.mouse.move(canvas.x + point[0], canvas.y + point[1], {
      steps,
    });
  }
  await page.mouse.up();
}

test("explicit box control replaces selection using exact semantic hits", async ({
  page,
}) => {
  await openEmptyPlayground(page);
  const bounds = await seedRegionArrows(page);
  await page.evaluate(() => window.__plotlibrePlayground?.plot.select("region-c"));

  await page.getByTestId("box-select-button").click();
  await expect(page.getByTestId("status-text")).toContainText("框选已就绪");
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__plotlibrePlayground?.plot.regionSelectionSnapshot.status,
      ),
    )
    .toBe("armed");

  await dragBox(page, bounds);

  await expect
    .poll(() =>
      page.evaluate(() => {
        const plot = window.__plotlibrePlayground?.plot;
        return plot
          ? {
              selectedIds: plot.selectedIds,
              primaryId: plot.selectedId,
              status: plot.regionSelectionSnapshot.status,
            }
          : undefined;
      }),
    )
    .toEqual({
      selectedIds: ["region-a", "region-b"],
      primaryId: "region-b",
      status: "idle",
    });
  await expect(page.getByTestId("status-text")).toContainText("已选择 2 个对象");
  await expect(
    page.locator('[data-plotlibre-selection-region="true"]'),
  ).toBeHidden();
});

test("invalid lasso retries directly and replaces in Store order", async ({
  page,
}) => {
  await openEmptyPlayground(page);
  const bounds = await seedRegionArrows(page);
  await page.evaluate(() => window.__plotlibrePlayground?.plot.select("region-c"));

  await page.getByTestId("lasso-select-button").click();
  await expect(page.getByTestId("status-text")).toContainText("套索已就绪");

  const invalidX = bounds.minX + 10;
  const invalidY = bounds.minY + 10;
  await dragLasso(page, [
    [invalidX, invalidY],
    [invalidX + 6, invalidY],
    [invalidX, invalidY + 4],
    [invalidX, invalidY],
  ]);

  await expect
    .poll(() =>
      page.evaluate(() => {
        const plot = window.__plotlibrePlayground?.plot;
        return plot
          ? {
              status: plot.regionSelectionSnapshot.status,
              code: plot.regionSelectionRejection?.code,
              selectedIds: plot.selectedIds,
            }
          : undefined;
      }),
    )
    .toEqual({
      status: "rejected",
      code: "SELECTION_REGION_TOO_SMALL",
      selectedIds: ["region-c"],
    });
  await expect(page.getByTestId("status-text")).toContainText("区域选择被拒绝");

  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  await dragLasso(
    page,
    [
      [bounds.minX - width * 0.35, bounds.maxY + height * 0.35],
      [bounds.maxX + width * 0.35, bounds.maxY + height * 0.35],
      [centerX, bounds.minY - height * 0.8],
    ],
    1,
  );

  await expect
    .poll(() =>
      page.evaluate(() => {
        const plot = window.__plotlibrePlayground?.plot;
        return plot
          ? {
              selectedIds: plot.selectedIds,
              primaryId: plot.selectedId,
              status: plot.regionSelectionSnapshot.status,
              rejection: plot.regionSelectionRejection,
            }
          : undefined;
      }),
    )
    .toEqual({
      selectedIds: ["region-a", "region-b"],
      primaryId: "region-b",
      status: "idle",
      rejection: undefined,
    });
  await expect(page.getByTestId("status-text")).toContainText("已选择 2 个对象");
});

import { expect, test, type Page } from "@playwright/test";

type AreaType = "area.closed-curve" | "area.gathering-place";

async function openPlayground(page: Page): Promise<void> {
  await page.goto("/PlotLibre/?e2e=1&squad=1&paths=1&areas=1");
  await expect(page.getByTestId("status-text")).toContainText("准备就绪");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
}

async function canvasBox(page: Page) {
  const box = await page.locator(".maplibregl-canvas").boundingBox();
  if (!box) throw new Error("MapLibre canvas does not have a bounding box.");
  return box;
}

async function begin(page: Page, plotType: AreaType): Promise<void> {
  await page.getByTestId("symbol-select").selectOption(plotType);
  await page.getByTestId("draw-button").click();
}

async function expectDraftVisible(page: Page, plotType: AreaType): Promise<void> {
  await expect
    .poll(
      async () =>
        page.evaluate((expectedType) => {
          const playground = window.__plotlibrePlayground;
          if (!playground) return { source: false, rendered: false };
          const source = playground.map.querySourceFeatures("plotlibre-draft");
          const rendered = playground.map.queryRenderedFeatures(undefined, {
            layers: ["plotlibre-draft-fill", "plotlibre-draft-line"],
          });
          return {
            source: source.some(
              (feature) => feature.properties?.plotType === expectedType,
            ),
            rendered: rendered.some(
              (feature) => feature.properties?.plotType === expectedType,
            ),
          };
        }, plotType),
      { timeout: 10_000 },
    )
    .toEqual({ source: true, rendered: true });
}

async function expectCommittedVisible(
  page: Page,
  plotType: AreaType,
): Promise<void> {
  await expect(page.getByTestId("plot-count")).toHaveText("1 个标绘");
  await expect
    .poll(
      async () =>
        page.evaluate((expectedType) => {
          const playground = window.__plotlibrePlayground;
          if (!playground) return false;
          const source = playground.map.querySourceFeatures("plotlibre-committed");
          const rendered = playground.map.queryRenderedFeatures(undefined, {
            layers: ["plotlibre-fill", "plotlibre-line"],
          });
          return (
            source.some(
              (feature) => feature.properties?.plotType === expectedType,
            ) &&
            rendered.some(
              (feature) => feature.properties?.plotType === expectedType,
            )
          );
        }, plotType),
      { timeout: 10_000 },
    )
    .toBe(true);
}

test("closed action area group joins the selector and complete sample set", async ({
  page,
}) => {
  await openPlayground(page);
  await expect(page.getByTestId("symbol-select").locator("option")).toHaveCount(16);
  await expect(
    page
      .getByTestId("symbol-select")
      .locator('option[value="area.closed-curve"]'),
  ).toHaveText("闭合曲线区域");
  await expect(
    page
      .getByTestId("symbol-select")
      .locator('option[value="area.gathering-place"]'),
  ).toHaveText("集结地");

  await page.getByTestId("sample-button").click();
  await expect(page.getByTestId("plot-count")).toHaveText("16 个标绘");
  const types = await page.evaluate(() =>
    window.__plotlibrePlayground?.plot.store
      .list()
      .map((feature) => feature.plotType) ?? [],
  );
  expect(types).toContain("area.closed-curve");
  expect(types).toContain("area.gathering-place");
});

test("closed curve previews at three candidates and completes on double-click", async ({
  page,
}) => {
  await openPlayground(page);
  const box = await canvasBox(page);
  const plotType = "area.closed-curve" as const;
  await begin(page, plotType);

  const first = { x: box.x + box.width * 0.32, y: box.y + box.height * 0.65 };
  const second = { x: box.x + box.width * 0.50, y: box.y + box.height * 0.30 };
  const third = { x: box.x + box.width * 0.72, y: box.y + box.height * 0.62 };
  await page.mouse.click(first.x, first.y);
  await page.mouse.click(second.x, second.y);
  await page.mouse.move(third.x, third.y);
  await expectDraftVisible(page, plotType);
  await page.mouse.dblclick(third.x, third.y, { delay: 60 });
  await expectCommittedVisible(page, plotType);

  const controls = await page.evaluate(() =>
    window.__plotlibrePlayground?.plot.store.list()[0]?.controlPoints ?? [],
  );
  expect(controls).toHaveLength(3);
});

test("gathering place previews with the third pointer and auto-completes", async ({
  page,
}) => {
  await openPlayground(page);
  const box = await canvasBox(page);
  const plotType = "area.gathering-place" as const;
  await begin(page, plotType);

  const flankA = { x: box.x + box.width * 0.34, y: box.y + box.height * 0.68 };
  const crown = { x: box.x + box.width * 0.50, y: box.y + box.height * 0.28 };
  const flankB = { x: box.x + box.width * 0.68, y: box.y + box.height * 0.68 };
  await page.mouse.click(flankA.x, flankA.y);
  await page.mouse.click(crown.x, crown.y);
  await page.mouse.move(flankB.x, flankB.y);
  await expectDraftVisible(page, plotType);
  await page.mouse.click(flankB.x, flankB.y);
  await expectCommittedVisible(page, plotType);

  const controls = await page.evaluate(() =>
    window.__plotlibrePlayground?.plot.store.list()[0]?.controlPoints ?? [],
  );
  expect(controls).toHaveLength(3);
});

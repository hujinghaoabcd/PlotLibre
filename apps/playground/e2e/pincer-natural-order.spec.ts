import { expect, test } from "@playwright/test";

test("pincer completes when objectives are clicked in natural perimeter order", async ({
  page,
}) => {
  await page.goto("/PlotLibre/?e2e=1");
  await expect(page.getByTestId("status-text")).toContainText("准备就绪");
  const canvas = page.locator(".maplibregl-canvas");
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("MapLibre canvas does not have a bounding box.");

  await page.getByTestId("symbol-select").selectOption("arrow.pincer");
  await page.getByTestId("draw-button").click();

  const tailA = { x: box.x + box.width * 0.38, y: box.y + box.height * 0.75 };
  const tailB = { x: box.x + box.width * 0.62, y: box.y + box.height * 0.75 };
  const rightObjective = {
    x: box.x + box.width * 0.75,
    y: box.y + box.height * 0.28,
  };
  const leftObjective = {
    x: box.x + box.width * 0.25,
    y: box.y + box.height * 0.28,
  };
  const junction = {
    x: box.x + box.width * 0.50,
    y: box.y + box.height * 0.62,
  };

  await page.mouse.click(tailA.x, tailA.y);
  await page.mouse.click(tailB.x, tailB.y);
  await page.mouse.click(rightObjective.x, rightObjective.y);
  await page.mouse.click(leftObjective.x, leftObjective.y);
  await page.mouse.move(junction.x, junction.y);

  await expect
    .poll(async () =>
      page.evaluate(() => {
        const playground = window.__plotlibrePlayground;
        if (!playground) return false;
        return playground.map
          .querySourceFeatures("plotlibre-draft")
          .some((feature) => feature.properties?.plotType === "arrow.pincer");
      }),
    )
    .toBe(true);

  await page.mouse.click(junction.x, junction.y);
  await expect(page.getByTestId("plot-count")).toHaveText("1 个标绘");

  await expect
    .poll(async () =>
      page.evaluate(() => {
        const playground = window.__plotlibrePlayground;
        if (!playground) return undefined;
        const selectedId = playground.plot.interaction.selectedId;
        if (!selectedId) return undefined;
        const feature = playground.plot.store.get(selectedId);
        const rendered = playground.map.queryRenderedFeatures(undefined, {
          layers: ["plotlibre-fill", "plotlibre-line"],
        });
        return {
          plotType: feature.plotType,
          version: feature.definitionVersion,
          pointCount: feature.controlPoints.length,
          objectivesCanonical:
            (feature.controlPoints[2]?.[0] ?? Number.POSITIVE_INFINITY) <
            (feature.controlPoints[3]?.[0] ?? Number.NEGATIVE_INFINITY),
          rendered: rendered.some(
            (candidate) => candidate.properties?.plotType === "arrow.pincer",
          ),
        };
      }),
    )
    .toEqual({
      plotType: "arrow.pincer",
      version: "1.1.0",
      pointCount: 5,
      objectivesCanonical: true,
      rendered: true,
    });
});

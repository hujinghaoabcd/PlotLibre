import { expect, test } from "@playwright/test";

test("sector shows a transient radial guide without committing it", async ({ page }) => {
  await page.goto(
    "/PlotLibre/?e2e=1&squad=1&paths=1&areas=1&circular=1",
  );
  await expect(page.getByTestId("status-text")).toContainText("准备就绪");
  const canvas = page.locator(".maplibregl-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("MapLibre canvas does not have a bounding box.");

  await page.getByTestId("symbol-select").selectOption("area.sector");
  await page.getByTestId("draw-button").click();
  const center = { x: box.x + box.width * 0.46, y: box.y + box.height * 0.48 };
  const start = { x: box.x + box.width * 0.68, y: box.y + box.height * 0.48 };
  const bearing = { x: box.x + box.width * 0.46, y: box.y + box.height * 0.76 };
  await page.mouse.click(center.x, center.y);
  await page.mouse.click(start.x, start.y);
  await page.mouse.move(bearing.x, bearing.y);

  await expect
    .poll(() =>
      page.evaluate(() => {
        const playground = window.__plotlibrePlayground;
        if (!playground) return false;
        return playground.map
          .querySourceFeatures("plotlibre-draft")
          .some(
            (feature) =>
              feature.properties?.plotType === "area.sector" &&
              feature.properties?.handleKind === "semantic-guide" &&
              feature.geometry.type === "LineString",
          );
      }),
    )
    .toBe(true);

  await page.mouse.click(bearing.x, bearing.y);
  await expect(page.getByTestId("plot-count")).toHaveText("1 个标绘");
  await expect
    .poll(() =>
      page.evaluate(() => {
        const playground = window.__plotlibrePlayground;
        if (!playground) return { handleGuide: false, committedGuide: true };
        return {
          handleGuide: playground.map
            .querySourceFeatures("plotlibre-handles")
            .some(
              (feature) =>
                feature.properties?.handleKind === "semantic-guide" &&
                feature.geometry.type === "LineString",
            ),
          committedGuide: playground.map
            .querySourceFeatures("plotlibre-committed")
            .some(
              (feature) =>
                feature.properties?.handleKind === "semantic-guide",
            ),
        };
      }),
    )
    .toEqual({ handleGuide: true, committedGuide: false });

  await expect
    .poll(() =>
      page.evaluate(() => {
        const playground = window.__plotlibrePlayground;
        if (!playground) return false;
        return playground.map.queryRenderedFeatures(undefined, {
          layers: ["plotlibre-handle-guide"],
        }).length > 0;
      }),
      { timeout: 10_000 },
    )
    .toBe(true);
});

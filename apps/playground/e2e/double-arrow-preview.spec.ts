import { expect, test } from "@playwright/test";

test("double arrow shows a draft after a centerline third click", async ({
  page,
}) => {
  await page.goto("/PlotLibre/?e2e=1");
  await expect(page.getByTestId("status-text")).toContainText("准备就绪");

  const canvas = page.locator(".maplibregl-canvas");
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("MapLibre canvas does not have a bounding box.");

  await page.getByTestId("symbol-select").selectOption("arrow.double");
  await page.getByTestId("draw-button").click();

  await page.mouse.click(box.x + box.width * 0.42, box.y + box.height * 0.74);
  await page.mouse.click(box.x + box.width * 0.58, box.y + box.height * 0.74);
  await page.mouse.click(box.x + box.width * 0.50, box.y + box.height * 0.32);

  await expect
    .poll(async () =>
      page.evaluate(() => {
        const playground = window.__plotlibrePlayground;
        if (!playground) return { hasDraft: false, committed: 0 };
        return {
          // querySourceFeatures may return duplicate tile copies. Verify
          // semantic presence rather than a raw tile-feature count.
          hasDraft:
            playground.map.querySourceFeatures("plotlibre-draft").length > 0,
          committed: playground.plot.store.size,
        };
      }),
    )
    .toEqual({ hasDraft: true, committed: 0 });
});

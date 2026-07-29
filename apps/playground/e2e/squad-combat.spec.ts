import { expect, test } from "@playwright/test";

test("squad combat joins the selector and full sample set", async ({ page }) => {
  await page.goto("/PlotLibre/?e2e=1&squad=1");
  await expect(page.getByTestId("status-text")).toContainText("准备就绪");
  await expect(page.getByTestId("symbol-select").locator("option")).toHaveCount(10);
  await expect(
    page.getByTestId("symbol-select").locator('option[value="arrow.squad-combat"]'),
  ).toHaveText("分队战斗箭头");

  await page.getByTestId("sample-button").click();
  await expect(page.getByTestId("plot-count")).toHaveText("10 个标绘");
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__plotlibrePlayground?.plot.store
          .list()
          .some((feature) => feature.plotType === "arrow.squad-combat") ?? false,
      ),
    )
    .toBe(true);
});

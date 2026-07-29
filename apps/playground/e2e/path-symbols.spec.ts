import { expect, test } from "@playwright/test";

test("route and corridor join the selector and full sample set", async ({ page }) => {
  await page.goto("/PlotLibre/?e2e=1&squad=1&paths=1");
  await expect(page.getByTestId("status-text")).toContainText("准备就绪");
  await expect(page.getByTestId("symbol-select").locator("option")).toHaveCount(12);
  await expect(
    page.getByTestId("symbol-select").locator('option[value="arrow.route"]'),
  ).toHaveText("路线箭头");
  await expect(
    page.getByTestId("symbol-select").locator('option[value="arrow.corridor"]'),
  ).toHaveText("走廊箭头");

  await page.getByTestId("sample-button").click();
  await expect(page.getByTestId("plot-count")).toHaveText("12 个标绘");
  const types = await page.evaluate(() =>
    window.__plotlibrePlayground?.plot.store
      .list()
      .map((feature) => feature.plotType) ?? [],
  );
  expect(types).toContain("arrow.route");
  expect(types).toContain("arrow.corridor");
});

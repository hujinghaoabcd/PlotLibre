import { expect, test } from "@playwright/test";

test("pincer explains an invalid fifth point and recovers after movement", async ({
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
  const invalidJunction = {
    x: box.x + box.width * 0.50,
    y: box.y + box.height * 0.10,
  };
  const validJunction = {
    x: box.x + box.width * 0.50,
    y: box.y + box.height * 0.62,
  };

  await page.mouse.click(tailA.x, tailA.y);
  await page.mouse.click(tailB.x, tailB.y);
  await page.mouse.click(rightObjective.x, rightObjective.y);
  await page.mouse.click(leftObjective.x, leftObjective.y);
  await page.mouse.move(invalidJunction.x, invalidJunction.y);
  await page.mouse.click(invalidJunction.x, invalidJunction.y);

  await expect(page.getByTestId("plot-count")).toHaveText("0 个标绘");
  await expect(page.getByTestId("status-text")).toContainText("第五点未完成");
  await expect(page.getByTestId("status-text")).toContainText(
    "前后位置超出允许范围",
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__plotlibrePlayground?.plot.interaction.drawRejection?.issues[0]
            ?.code,
      ),
    )
    .toBe("PINCER_JUNCTION_OUTSIDE_ZONE");

  await page.mouse.move(validJunction.x, validJunction.y);
  await expect(page.getByTestId("status-text")).not.toContainText("第五点未完成");
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__plotlibrePlayground?.plot.interaction.drawRejection,
      ),
    )
    .toBeUndefined();

  await page.mouse.click(validJunction.x, validJunction.y);
  await expect(page.getByTestId("plot-count")).toHaveText("1 个标绘");
});

import { expect, test, type Page } from "@playwright/test";

type ArrowType =
  | "arrow.straight"
  | "arrow.fine"
  | "arrow.fine.tailed"
  | "arrow.assault-direction"
  | "arrow.curved"
  | "arrow.attack"
  | "arrow.attack.tailed"
  | "arrow.double";

async function openPlayground(page: Page): Promise<void> {
  await page.goto("/PlotLibre/?e2e=1");
  await expect(page.getByTestId("status-text")).toContainText("准备就绪");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
}

async function canvasBox(page: Page) {
  const box = await page.locator(".maplibregl-canvas").boundingBox();
  if (!box) throw new Error("MapLibre canvas does not have a bounding box.");
  return box;
}

async function expectDraftVisible(page: Page, plotType: ArrowType): Promise<void> {
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
  plotType: ArrowType,
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

async function begin(page: Page, plotType: ArrowType): Promise<void> {
  await page.getByTestId("symbol-select").selectOption(plotType);
  await page.getByTestId("draw-button").click();
}

test("all public arrow types show a draft and a committed rendering", async ({
  page,
}) => {
  const twoPointTypes = [
    "arrow.straight",
    "arrow.fine",
    "arrow.fine.tailed",
    "arrow.assault-direction",
  ] as const;

  for (const plotType of twoPointTypes) {
    await openPlayground(page);
    const box = await canvasBox(page);
    await begin(page, plotType);
    const start = { x: box.x + box.width * 0.30, y: box.y + box.height * 0.68 };
    const end = { x: box.x + box.width * 0.70, y: box.y + box.height * 0.34 };
    await page.mouse.click(start.x, start.y);
    await page.mouse.move(end.x, end.y);
    await expectDraftVisible(page, plotType);
    await page.mouse.click(end.x, end.y);
    await expectCommittedVisible(page, plotType);
    await page.reload();
  }

  await openPlayground(page);
  {
    const plotType = "arrow.curved" as const;
    const box = await canvasBox(page);
    await begin(page, plotType);
    const tail = { x: box.x + box.width * 0.25, y: box.y + box.height * 0.70 };
    const middle = { x: box.x + box.width * 0.48, y: box.y + box.height * 0.50 };
    const tip = { x: box.x + box.width * 0.76, y: box.y + box.height * 0.32 };
    await page.mouse.click(tail.x, tail.y);
    await page.mouse.click(middle.x, middle.y);
    await page.mouse.move(tip.x, tip.y);
    await expectDraftVisible(page, plotType);
    await page.mouse.dblclick(tip.x, tip.y, { delay: 60 });
    await expectCommittedVisible(page, plotType);
  }

  for (const plotType of ["arrow.attack", "arrow.attack.tailed"] as const) {
    await page.reload();
    await openPlayground(page);
    const box = await canvasBox(page);
    await begin(page, plotType);
    const tailA = { x: box.x + box.width * 0.40, y: box.y + box.height * 0.72 };
    const tailB = { x: box.x + box.width * 0.58, y: box.y + box.height * 0.72 };
    const tip = { x: box.x + box.width * 0.49, y: box.y + box.height * 0.30 };
    await page.mouse.click(tailA.x, tailA.y);
    await page.mouse.click(tailB.x, tailB.y);
    await page.mouse.move(tip.x, tip.y);
    await expectDraftVisible(page, plotType);
    await page.mouse.dblclick(tip.x, tip.y, { delay: 60 });
    await expectCommittedVisible(page, plotType);
  }

  await page.reload();
  await openPlayground(page);
  {
    const plotType = "arrow.double" as const;
    const box = await canvasBox(page);
    await begin(page, plotType);
    const tailA = { x: box.x + box.width * 0.42, y: box.y + box.height * 0.74 };
    const tailB = { x: box.x + box.width * 0.58, y: box.y + box.height * 0.74 };
    const objectiveA = {
      x: box.x + box.width * 0.30,
      y: box.y + box.height * 0.32,
    };
    const objectiveB = {
      x: box.x + box.width * 0.70,
      y: box.y + box.height * 0.32,
    };
    await page.mouse.click(tailA.x, tailA.y);
    await page.mouse.click(tailB.x, tailB.y);
    await page.mouse.click(objectiveA.x, objectiveA.y);
    await expectDraftVisible(page, plotType);
    await page.mouse.move(objectiveB.x, objectiveB.y);
    await expectDraftVisible(page, plotType);
    await page.mouse.click(objectiveB.x, objectiveB.y);
    await expectCommittedVisible(page, plotType);
  }
});

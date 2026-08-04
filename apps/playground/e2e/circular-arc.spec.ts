import { expect, test, type Page } from "@playwright/test";

type CircularType =
  | "line.circular-arc"
  | "area.circular-segment"
  | "area.sector";

async function openPlayground(page: Page): Promise<void> {
  await page.goto(
    "/PlotLibre/?e2e=1&squad=1&paths=1&areas=1&circular=1",
  );
  await expect(page.getByTestId("status-text")).toContainText("准备就绪");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
}

async function canvasBox(page: Page) {
  const box = await page.locator(".maplibregl-canvas").boundingBox();
  if (!box) throw new Error("MapLibre canvas does not have a bounding box.");
  return box;
}

async function begin(page: Page, plotType: CircularType): Promise<void> {
  await page.getByTestId("symbol-select").selectOption(plotType);
  await page.getByTestId("draw-button").click();
}

async function expectDraftVisible(
  page: Page,
  plotType: CircularType,
  expectedLayer: "line" | "fill",
): Promise<void> {
  await expect
    .poll(
      async () =>
        page.evaluate(
          ({ expectedType, layer }) => {
            const playground = window.__plotlibrePlayground;
            if (!playground) return { source: false, rendered: false };
            const source = playground.map.querySourceFeatures("plotlibre-draft");
            const rendered = playground.map.queryRenderedFeatures(undefined, {
              layers: [
                layer === "line"
                  ? "plotlibre-draft-line"
                  : "plotlibre-draft-fill",
              ],
            });
            return {
              source: source.some(
                (feature) => feature.properties?.plotType === expectedType,
              ),
              rendered: rendered.some(
                (feature) => feature.properties?.plotType === expectedType,
              ),
            };
          },
          { expectedType: plotType, layer: expectedLayer },
        ),
      { timeout: 10_000 },
    )
    .toEqual({ source: true, rendered: true });
}

async function expectCommittedVisible(
  page: Page,
  plotType: CircularType,
  expectedLayer: "line" | "fill",
): Promise<void> {
  await expect(page.getByTestId("plot-count")).toHaveText("1 个标绘");
  await expect
    .poll(
      async () =>
        page.evaluate(
          ({ expectedType, layer }) => {
            const playground = window.__plotlibrePlayground;
            if (!playground) return false;
            const source = playground.map.querySourceFeatures("plotlibre-committed");
            const rendered = playground.map.queryRenderedFeatures(undefined, {
              layers: [
                layer === "line" ? "plotlibre-line" : "plotlibre-fill",
              ],
            });
            return (
              source.some(
                (feature) => feature.properties?.plotType === expectedType,
              ) &&
              rendered.some(
                (feature) => feature.properties?.plotType === expectedType,
              )
            );
          },
          { expectedType: plotType, layer: expectedLayer },
        ),
      { timeout: 10_000 },
    )
    .toBe(true);
}

test("circular family joins the selector and nineteen-symbol sample catalog", async ({
  page,
}) => {
  await openPlayground(page);
  await expect(page.getByTestId("symbol-select").locator("option")).toHaveCount(19);
  await expect(
    page
      .getByTestId("symbol-select")
      .locator('option[value="line.circular-arc"]'),
  ).toHaveText("三点圆弧");
  await expect(
    page
      .getByTestId("symbol-select")
      .locator('option[value="area.circular-segment"]'),
  ).toHaveText("圆弓形区域");
  await expect(
    page.getByTestId("symbol-select").locator('option[value="area.sector"]'),
  ).toHaveText("扇形区域");

  await page.getByTestId("sample-button").click();
  await expect(page.getByTestId("plot-count")).toHaveText("19 个标绘");
  const types = await page.evaluate(() =>
    window.__plotlibrePlayground?.plot.store
      .list()
      .map((feature) => feature.plotType) ?? [],
  );
  expect(types).toContain("line.circular-arc");
  expect(types).toContain("area.circular-segment");
  expect(types).toContain("area.sector");
});

test("three-point circular arc previews and auto-completes as a rendered line", async ({
  page,
}) => {
  await openPlayground(page);
  const box = await canvasBox(page);
  const plotType = "line.circular-arc" as const;
  await begin(page, plotType);

  const start = { x: box.x + box.width * 0.30, y: box.y + box.height * 0.64 };
  const through = { x: box.x + box.width * 0.50, y: box.y + box.height * 0.30 };
  const end = { x: box.x + box.width * 0.72, y: box.y + box.height * 0.64 };
  await page.mouse.click(start.x, start.y);
  await page.mouse.click(through.x, through.y);
  await page.mouse.move(end.x, end.y);
  await expectDraftVisible(page, plotType, "line");
  await page.mouse.click(end.x, end.y);
  await expectCommittedVisible(page, plotType, "line");

  const result = await page.evaluate(() => {
    const playground = window.__plotlibrePlayground;
    if (!playground) throw new Error("Playground API is unavailable.");
    const feature = playground.plot.store.list()[0];
    if (!feature) throw new Error("Circular arc was not committed.");
    const bundle = playground.plot.registry.generate(feature);
    return {
      controls: feature.controlPoints.length,
      fills: bundle.fills.length,
      lines: bundle.lines.length,
      geometry: bundle.lines[0]?.geometry.type,
    };
  });
  expect(result).toEqual({ controls: 3, fills: 0, lines: 1, geometry: "LineString" });
});

test("circular segment previews and auto-completes as an arc-and-chord area", async ({
  page,
}) => {
  await openPlayground(page);
  const box = await canvasBox(page);
  const plotType = "area.circular-segment" as const;
  await begin(page, plotType);

  const start = { x: box.x + box.width * 0.30, y: box.y + box.height * 0.66 };
  const through = { x: box.x + box.width * 0.50, y: box.y + box.height * 0.26 };
  const end = { x: box.x + box.width * 0.72, y: box.y + box.height * 0.66 };
  await page.mouse.click(start.x, start.y);
  await page.mouse.click(through.x, through.y);
  await page.mouse.move(end.x, end.y);
  await expectDraftVisible(page, plotType, "fill");
  await page.mouse.click(end.x, end.y);
  await expectCommittedVisible(page, plotType, "fill");

  const result = await page.evaluate(() => {
    const playground = window.__plotlibrePlayground;
    if (!playground) throw new Error("Playground API is unavailable.");
    const feature = playground.plot.store.list()[0];
    if (!feature) throw new Error("Circular segment was not committed.");
    const bundle = playground.plot.registry.generate(feature);
    return {
      controls: feature.controlPoints.length,
      fills: bundle.fills.length,
      geometry: bundle.fills[0]?.geometry.type,
    };
  });
  expect(result).toEqual({ controls: 3, fills: 1, geometry: "Polygon" });
});

test("sector keeps the third point as a bearing handle and derives the endpoint", async ({
  page,
}) => {
  await openPlayground(page);
  const box = await canvasBox(page);
  const plotType = "area.sector" as const;
  await begin(page, plotType);

  const center = { x: box.x + box.width * 0.46, y: box.y + box.height * 0.50 };
  const start = { x: box.x + box.width * 0.68, y: box.y + box.height * 0.50 };
  const bearing = { x: box.x + box.width * 0.46, y: box.y + box.height * 0.78 };
  await page.mouse.click(center.x, center.y);
  await page.mouse.click(start.x, start.y);
  await page.mouse.move(bearing.x, bearing.y);
  await expectDraftVisible(page, plotType, "fill");
  await page.mouse.click(bearing.x, bearing.y);
  await expectCommittedVisible(page, plotType, "fill");

  const result = await page.evaluate(() => {
    const playground = window.__plotlibrePlayground;
    if (!playground) throw new Error("Playground API is unavailable.");
    const feature = playground.plot.store.list()[0];
    if (!feature) throw new Error("Sector was not committed.");
    const bundle = playground.plot.registry.generate(feature);
    const polygon = bundle.fills[0]?.geometry;
    const ring = polygon?.type === "Polygon" ? polygon.coordinates[0] ?? [] : [];
    const bearingControl = feature.controlPoints[2];
    const bearingOnRing = ring.some(
      (coordinate) =>
        bearingControl !== undefined &&
        Math.abs(coordinate[0] - bearingControl[0]) < 1e-10 &&
        Math.abs(coordinate[1] - bearingControl[1]) < 1e-10,
    );
    return {
      controls: feature.controlPoints.length,
      direction: feature.parameters.sweepDirection,
      bearingOnRing,
      geometry: polygon?.type,
    };
  });
  expect(result).toEqual({
    controls: 3,
    direction: "clockwise",
    bearingOnRing: false,
    geometry: "Polygon",
  });
});

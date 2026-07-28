import { expect, test, type Page } from "@playwright/test";

type TwoPointArrowType =
  | "arrow.straight"
  | "arrow.fine"
  | "arrow.fine.tailed"
  | "arrow.assault-direction";

async function openPlayground(page: Page): Promise<void> {
  await page.goto("/PlotLibre/?e2e=1");
  await expect(page.getByTestId("status-text")).toContainText("准备就绪");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
}

async function drawArrow(
  page: Page,
  plotType: TwoPointArrowType = "arrow.straight",
): Promise<void> {
  const canvas = page.locator(".maplibregl-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("MapLibre canvas does not have a bounding box.");

  await page.getByTestId("symbol-select").selectOption(plotType);
  await page.getByTestId("draw-button").click();
  await page.mouse.click(box.x + box.width * 0.32, box.y + box.height * 0.65);
  await page.mouse.move(box.x + box.width * 0.68, box.y + box.height * 0.35);
  await page.mouse.click(box.x + box.width * 0.68, box.y + box.height * 0.35);

  await expect(page.getByTestId("plot-count")).toHaveText("1 个标绘");
  await expect(page.getByTestId("selected-id")).not.toHaveText("未选择");
}

async function expectSelectedRenderedType(
  page: Page,
  plotType: TwoPointArrowType,
): Promise<void> {
  await expect
    .poll(
      async () =>
        page.evaluate((expectedType) => {
          const playground = window.__plotlibrePlayground;
          if (!playground) throw new Error("Playground API is unavailable.");
          const selectedId = playground.plot.interaction.selectedId;
          if (!selectedId) return undefined;
          const selected = playground.plot.store.get(selectedId);
          const rendered = playground.map.queryRenderedFeatures(undefined, {
            layers: ["plotlibre-fill", "plotlibre-line"],
          });
          return {
            plotType: selected.plotType,
            controlPointCount: selected.controlPoints.length,
            rendered: rendered.some(
              (feature) => feature.properties?.plotType === expectedType,
            ),
          };
        }, plotType),
      { timeout: 10_000 },
    )
    .toEqual({
      plotType,
      controlPointCount: 2,
      rendered: true,
    });
}

test("loads from the GitHub Pages project path", async ({ page }) => {
  await openPlayground(page);
  await expect(page).toHaveTitle("PlotLibre Playground");
  await expect(page.getByTestId("plot-count")).toHaveText("0 个标绘");
  await expect(page.getByTestId("symbol-select")).toHaveValue("arrow.straight");
  await expect(page.getByTestId("symbol-select").locator("option")).toHaveCount(4);
});

test("starts immediately when the optional basemap is disabled", async ({ page }) => {
  await page.goto("/PlotLibre/?basemap=none");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await expect(page.getByTestId("plot-count")).toHaveText("4 个标绘");
  await expect(page.getByTestId("status-text")).not.toContainText("正在初始化");

  const sampleTypes = await page.evaluate(() => {
    const playground = window.__plotlibrePlayground;
    if (!playground) throw new Error("Playground API is unavailable.");
    return playground.plot.store.list().map((feature) => feature.plotType);
  });
  expect(sampleTypes).toContain("arrow.straight");
  expect(sampleTypes).toContain("arrow.fine");
  expect(sampleTypes).toContain("arrow.fine.tailed");
  expect(sampleTypes).toContain("arrow.assault-direction");
});

test("renders all sample arrow types through committed layers", async ({ page }) => {
  await page.goto("/PlotLibre/?basemap=none");
  await expect(page.getByTestId("plot-count")).toHaveText("4 个标绘");

  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const playground = window.__plotlibrePlayground;
          if (!playground) throw new Error("Playground API is unavailable.");

          const map = playground.map;
          const sourceFeatures = map.querySourceFeatures("plotlibre-committed");
          const renderedFeatures = map.queryRenderedFeatures(undefined, {
            layers: ["plotlibre-fill", "plotlibre-line"],
          });
          const sourceRoles = sourceFeatures.map(
            (feature) => feature.properties?.role,
          );
          const renderedRoles = renderedFeatures.map(
            (feature) => feature.properties?.role,
          );
          const sourcePlotTypes = sourceFeatures.map(
            (feature) => feature.properties?.plotType,
          );

          return {
            sourceExists: map.getSource("plotlibre-committed") !== undefined,
            fillLayerExists: map.getLayer("plotlibre-fill") !== undefined,
            lineLayerExists: map.getLayer("plotlibre-line") !== undefined,
            fillLayerVisible:
              (map.getLayoutProperty("plotlibre-fill", "visibility") ??
                "visible") === "visible",
            lineLayerVisible:
              (map.getLayoutProperty("plotlibre-line", "visibility") ??
                "visible") === "visible",
            sourceHasExpectedFeatures: sourceFeatures.length >= 8,
            sourceHasFill: sourceRoles.includes("fill"),
            sourceHasOutline: sourceRoles.includes("outline"),
            sourceHasStraight: sourcePlotTypes.includes("arrow.straight"),
            sourceHasFine: sourcePlotTypes.includes("arrow.fine"),
            sourceHasTailedFine: sourcePlotTypes.includes("arrow.fine.tailed"),
            sourceHasAssault: sourcePlotTypes.includes("arrow.assault-direction"),
            canvasHasRenderedFeatures: renderedFeatures.length > 0,
            canvasHasFill: renderedRoles.includes("fill"),
            canvasHasOutline: renderedRoles.includes("outline"),
          };
        }),
      { timeout: 10_000 },
    )
    .toEqual({
      sourceExists: true,
      fillLayerExists: true,
      lineLayerExists: true,
      fillLayerVisible: true,
      lineLayerVisible: true,
      sourceHasExpectedFeatures: true,
      sourceHasFill: true,
      sourceHasOutline: true,
      sourceHasStraight: true,
      sourceHasFine: true,
      sourceHasTailedFine: true,
      sourceHasAssault: true,
      canvasHasRenderedFeatures: true,
      canvasHasFill: true,
      canvasHasOutline: true,
    });
});

test("draws a straight arrow and supports undo and redo", async ({ page }) => {
  await openPlayground(page);
  await drawArrow(page);

  await page.getByTestId("undo-button").click();
  await expect(page.getByTestId("plot-count")).toHaveText("0 个标绘");

  await page.getByTestId("redo-button").click();
  await expect(page.getByTestId("plot-count")).toHaveText("1 个标绘");
});

test("draws and renders a fine arrow from the symbol selector", async ({ page }) => {
  await openPlayground(page);
  await drawArrow(page, "arrow.fine");
  await expectSelectedRenderedType(page, "arrow.fine");
});

test("draws and renders a tailed fine arrow from the symbol selector", async ({
  page,
}) => {
  await openPlayground(page);
  await drawArrow(page, "arrow.fine.tailed");
  await expectSelectedRenderedType(page, "arrow.fine.tailed");

  const derivedRingLength = await page.evaluate(() => {
    const playground = window.__plotlibrePlayground;
    if (!playground) throw new Error("Playground API is unavailable.");
    const selectedId = playground.plot.interaction.selectedId;
    if (!selectedId) throw new Error("No plot is selected.");
    const selected = playground.plot.store.get(selectedId);
    const bundle = playground.plot.registry.generate(selected);
    const geometry = bundle.fills[0]?.geometry;
    return geometry?.type === "Polygon" ? geometry.coordinates[0]?.length : 0;
  });
  expect(derivedRingLength).toBe(9);
});

test("draws and renders an assault direction from the symbol selector", async ({
  page,
}) => {
  await openPlayground(page);
  await drawArrow(page, "arrow.assault-direction");
  await expectSelectedRenderedType(page, "arrow.assault-direction");

  const derived = await page.evaluate(() => {
    const playground = window.__plotlibrePlayground;
    if (!playground) throw new Error("Playground API is unavailable.");
    const selectedId = playground.plot.interaction.selectedId;
    if (!selectedId) throw new Error("No plot is selected.");
    const selected = playground.plot.store.get(selectedId);
    const bundle = playground.plot.registry.generate(selected);
    const geometry = bundle.fills[0]?.geometry;
    return {
      ringLength:
        geometry?.type === "Polygon" ? geometry.coordinates[0]?.length : 0,
      bodyWidthRatio: selected.parameters.bodyWidthRatio,
      headAngleDegrees: selected.parameters.headAngleDegrees,
    };
  });
  expect(derived).toEqual({
    ringLength: 8,
    bodyWidthRatio: 0.18,
    headAngleDegrees: 42,
  });
});

test("updates the selected style and deletes the plot", async ({ page }) => {
  await openPlayground(page);
  await drawArrow(page);

  await page.getByTestId("fill-color").evaluate((element) => {
    const input = element as HTMLInputElement;
    input.value = "#00aa88";
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });

  const fillColor = await page.evaluate(() => {
    const playground = window.__plotlibrePlayground;
    if (!playground) throw new Error("Playground API is unavailable.");
    const selectedId = playground.plot.interaction.selectedId;
    if (!selectedId) throw new Error("No plot is selected.");
    return playground.plot.store.get(selectedId).style.fillColor;
  });
  expect(fillColor).toBe("#00aa88");

  await page.getByTestId("delete-button").click();
  await expect(page.getByTestId("plot-count")).toHaveText("0 个标绘");
});

test("exports and imports PlotJSON", async ({ page }) => {
  await openPlayground(page);
  await drawArrow(page);

  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("export-button").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("plotlibre-playground.plotjson.json");

  await page.getByTestId("clear-button").click();
  await expect(page.getByTestId("plot-count")).toHaveText("0 个标绘");

  const documentData = {
    type: "PlotLibreDocument",
    schemaVersion: "1.0.0",
    id: "e2e-import",
    name: "E2E Import",
    features: [
      {
        id: "imported-arrow",
        plotType: "arrow.straight",
        definitionVersion: "1.0.0",
        controlPoints: [
          [118.76, 32.04],
          [118.84, 32.1],
        ],
        parameters: {
          tailWidthRatio: 0.08,
          headLengthRatio: 0.28,
          headWidthRatio: 2.4,
          neckWidthRatio: 0.8,
          minimumWidthMeters: 1,
          maximumWidthMeters: 100000,
        },
        style: {
          fillColor: "#d32f2f",
          fillOpacity: 0.45,
          lineColor: "#8e0000",
          lineOpacity: 1,
          lineWidth: 2,
        },
        metadata: {},
        revision: 0,
      },
    ],
    metadata: {},
  };

  await page.locator("#import-input").setInputFiles({
    name: "import.plotjson.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(documentData)),
  });

  await expect(page.getByTestId("plot-count")).toHaveText("1 个标绘");
  await expect(page.getByTestId("status-text")).toContainText("E2E Import");
});

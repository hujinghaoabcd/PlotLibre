import { expect, test, type Page } from "@playwright/test";

type TwoPointArrowType =
  | "arrow.straight"
  | "arrow.fine"
  | "arrow.fine.tailed"
  | "arrow.assault-direction";

type ArrowType = TwoPointArrowType | "arrow.curved" | "arrow.attack";

interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

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

async function drawTwoPointArrow(
  page: Page,
  plotType: TwoPointArrowType = "arrow.straight",
): Promise<void> {
  const box = await canvasBox(page);
  await page.getByTestId("symbol-select").selectOption(plotType);
  await page.getByTestId("draw-button").click();
  await page.mouse.click(box.x + box.width * 0.32, box.y + box.height * 0.65);
  await page.mouse.move(box.x + box.width * 0.68, box.y + box.height * 0.35);
  await page.mouse.click(box.x + box.width * 0.68, box.y + box.height * 0.35);
  await expect(page.getByTestId("plot-count")).toHaveText("1 个标绘");
}

async function beginMultiPoint(page: Page, plotType: "arrow.curved" | "arrow.attack") {
  await page.getByTestId("symbol-select").selectOption(plotType);
  await page.getByTestId("draw-button").click();
  expect(
    await page.evaluate(() => {
      const playground = window.__plotlibrePlayground;
      if (!playground) throw new Error("Playground API is unavailable.");
      return !playground.map.doubleClickZoom.isEnabled();
    }),
  ).toBe(true);
}

async function waitForDraft(page: Page): Promise<void> {
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const playground = window.__plotlibrePlayground;
        if (!playground) return 0;
        return playground.map.querySourceFeatures("plotlibre-draft").length;
      }),
    )
    .toBeGreaterThan(0);
}

async function drawCurvedArrow(page: Page): Promise<void> {
  const box = await canvasBox(page);
  await beginMultiPoint(page, "arrow.curved");
  const first = { x: box.x + box.width * 0.28, y: box.y + box.height * 0.68 };
  const middle = { x: box.x + box.width * 0.48, y: box.y + box.height * 0.52 };
  const tip = { x: box.x + box.width * 0.75, y: box.y + box.height * 0.35 };
  await page.mouse.click(first.x, first.y);
  await page.mouse.click(middle.x, middle.y);
  await page.mouse.move(tip.x, tip.y);
  await waitForDraft(page);
  await page.mouse.dblclick(tip.x, tip.y, { delay: 60 });
  await expect(page.getByTestId("plot-count")).toHaveText("1 个标绘");
}

async function drawAttackArrow(page: Page): Promise<void> {
  const box = await canvasBox(page);
  await beginMultiPoint(page, "arrow.attack");
  const tailA = { x: box.x + box.width * 0.31, y: box.y + box.height * 0.7 };
  const tailB = { x: box.x + box.width * 0.37, y: box.y + box.height * 0.65 };
  const spine = { x: box.x + box.width * 0.55, y: box.y + box.height * 0.5 };
  const tip = { x: box.x + box.width * 0.76, y: box.y + box.height * 0.32 };
  await page.mouse.click(tailA.x, tailA.y);
  await page.mouse.click(tailB.x, tailB.y);
  await page.mouse.move(spine.x, spine.y);
  await waitForDraft(page);
  await page.mouse.click(spine.x, spine.y);
  await page.mouse.move(tip.x, tip.y);
  await waitForDraft(page);
  await page.mouse.dblclick(tip.x, tip.y, { delay: 60 });
  await expect(page.getByTestId("plot-count")).toHaveText("1 个标绘");
}

async function expectSelectedRenderedType(
  page: Page,
  plotType: ArrowType,
  controlPointCount = 2,
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
    .toEqual({ plotType, controlPointCount, rendered: true });
}

async function uniqueHandleCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const playground = window.__plotlibrePlayground;
    if (!playground) throw new Error("Playground API is unavailable.");
    const selectedId = playground.plot.interaction.selectedId;
    if (!selectedId) return 0;
    return new Set(
      playground.map
        .querySourceFeatures("plotlibre-handles")
        .filter((feature) => feature.properties?.plotId === selectedId)
        .map((feature) => feature.properties?.handleIndex)
        .filter((value): value is number => typeof value === "number"),
    ).size;
  });
}

async function projectControl(page: Page, index: number) {
  return page.evaluate((controlIndex) => {
    const playground = window.__plotlibrePlayground;
    if (!playground) throw new Error("Playground API is unavailable.");
    const selectedId = playground.plot.interaction.selectedId;
    if (!selectedId) throw new Error("No plot is selected.");
    const selected = playground.plot.store.get(selectedId);
    const control = selected.controlPoints[controlIndex];
    if (!control) throw new Error(`Missing control ${controlIndex}.`);
    const point = playground.map.project([control[0], control[1]]);
    return { selectedId, control, x: point.x, y: point.y };
  }, index);
}

async function dragControl(
  page: Page,
  projected: Awaited<ReturnType<typeof projectControl>>,
  delta: ScreenPoint,
): Promise<void> {
  const box = await canvasBox(page);
  await page.mouse.move(box.x + projected.x, box.y + projected.y);
  await page.mouse.down();
  await page.mouse.move(
    box.x + projected.x + delta.x,
    box.y + projected.y + delta.y,
    { steps: 4 },
  );
  await page.mouse.up();
}

test("loads six symbols from the GitHub Pages project path", async ({ page }) => {
  await openPlayground(page);
  await expect(page).toHaveTitle("PlotLibre Playground");
  await expect(page.getByTestId("plot-count")).toHaveText("0 个标绘");
  await expect(page.getByTestId("symbol-select").locator("option")).toHaveCount(6);
});

test("loads all six Nanjing samples without the optional basemap", async ({ page }) => {
  await page.goto("/PlotLibre/?basemap=none");
  await expect(page.getByTestId("plot-count")).toHaveText("6 个标绘");
  const types = await page.evaluate(() => {
    const playground = window.__plotlibrePlayground;
    if (!playground) throw new Error("Playground API is unavailable.");
    return playground.plot.store.list().map((feature) => feature.plotType);
  });
  for (const expected of [
    "arrow.straight",
    "arrow.fine",
    "arrow.fine.tailed",
    "arrow.assault-direction",
    "arrow.curved",
    "arrow.attack",
  ]) {
    expect(types).toContain(expected);
  }
});

test("renders all six sample types through committed layers", async ({ page }) => {
  await page.goto("/PlotLibre/?basemap=none");
  await expect(page.getByTestId("plot-count")).toHaveText("6 个标绘");
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const playground = window.__plotlibrePlayground;
        if (!playground) throw new Error("Playground API is unavailable.");
        const source = playground.map.querySourceFeatures("plotlibre-committed");
        const rendered = playground.map.queryRenderedFeatures(undefined, {
          layers: ["plotlibre-fill", "plotlibre-line"],
        });
        const types = new Set(source.map((feature) => feature.properties?.plotType));
        return {
          featureCount: source.length >= 12,
          straight: types.has("arrow.straight"),
          fine: types.has("arrow.fine"),
          tailed: types.has("arrow.fine.tailed"),
          assault: types.has("arrow.assault-direction"),
          curved: types.has("arrow.curved"),
          attack: types.has("arrow.attack"),
          rendered: rendered.length > 0,
        };
      }),
    )
    .toEqual({
      featureCount: true,
      straight: true,
      fine: true,
      tailed: true,
      assault: true,
      curved: true,
      attack: true,
      rendered: true,
    });
});

test("draws a straight arrow and supports undo and redo", async ({ page }) => {
  await openPlayground(page);
  await drawTwoPointArrow(page);
  await page.getByTestId("undo-button").click();
  await expect(page.getByTestId("plot-count")).toHaveText("0 个标绘");
  await page.getByTestId("redo-button").click();
  await expect(page.getByTestId("plot-count")).toHaveText("1 个标绘");
});

test("draws all specialized two-point arrows", async ({ page }) => {
  for (const type of [
    "arrow.fine",
    "arrow.fine.tailed",
    "arrow.assault-direction",
  ] as const) {
    await openPlayground(page);
    await drawTwoPointArrow(page, type);
    await expectSelectedRenderedType(page, type);
    await page.reload();
  }
});

test("draws and edits a curved arrow", async ({ page }) => {
  await openPlayground(page);
  await drawCurvedArrow(page);
  await expectSelectedRenderedType(page, "arrow.curved", 3);
  expect(await uniqueHandleCount(page)).toBe(3);
  const middle = await projectControl(page, 1);
  await dragControl(page, middle, { x: 25, y: -15 });
  const edited = await page.evaluate(({ selectedId, control }) => {
    const playground = window.__plotlibrePlayground;
    if (!playground) throw new Error("Playground API is unavailable.");
    const feature = playground.plot.store.get(selectedId);
    return {
      changed: feature.controlPoints[1]?.[0] !== control[0] || feature.controlPoints[1]?.[1] !== control[1],
      revision: feature.revision,
      zoom: playground.map.doubleClickZoom.isEnabled(),
    };
  }, middle);
  expect(edited).toEqual({ changed: true, revision: 1, zoom: true });
  await page.getByTestId("undo-button").click();
  expect(
    await page.evaluate(({ selectedId }) => {
      const playground = window.__plotlibrePlayground;
      if (!playground) throw new Error("Playground API is unavailable.");
      return playground.plot.store.get(selectedId).controlPoints[1];
    }, middle),
  ).toEqual(middle.control);
});

test("draws an attack arrow with exact tail controls and restored zoom", async ({ page }) => {
  await openPlayground(page);
  await drawAttackArrow(page);
  await expectSelectedRenderedType(page, "arrow.attack", 4);
  expect(await uniqueHandleCount(page)).toBe(4);
  const semantic = await page.evaluate(() => {
    const playground = window.__plotlibrePlayground;
    if (!playground) throw new Error("Playground API is unavailable.");
    const selectedId = playground.plot.interaction.selectedId;
    if (!selectedId) throw new Error("No plot is selected.");
    const feature = playground.plot.store.get(selectedId);
    const bundle = playground.plot.registry.generate(feature);
    const geometry = bundle.fills[0]?.geometry;
    return {
      bodyBulgeRatio: feature.parameters.bodyBulgeRatio,
      ringLength: geometry?.type === "Polygon" ? geometry.coordinates[0]?.length : 0,
      zoom: playground.map.doubleClickZoom.isEnabled(),
      tailsDistinct:
        feature.controlPoints[0]?.[0] !== feature.controlPoints[1]?.[0] ||
        feature.controlPoints[0]?.[1] !== feature.controlPoints[1]?.[1],
    };
  });
  expect(semantic.bodyBulgeRatio).toBe(1.08);
  expect(semantic.ringLength).toBeGreaterThan(20);
  expect(semantic.zoom).toBe(true);
  expect(semantic.tailsDistinct).toBe(true);
});

test("edits an attack tail edge in one undoable command", async ({ page }) => {
  await openPlayground(page);
  await drawAttackArrow(page);
  const tail = await projectControl(page, 0);
  await dragControl(page, tail, { x: -18, y: 10 });
  const edited = await page.evaluate(({ selectedId, control }) => {
    const playground = window.__plotlibrePlayground;
    if (!playground) throw new Error("Playground API is unavailable.");
    const feature = playground.plot.store.get(selectedId);
    return {
      changed: feature.controlPoints[0]?.[0] !== control[0] || feature.controlPoints[0]?.[1] !== control[1],
      revision: feature.revision,
      undoDepth: playground.plot.history.undoDepth,
    };
  }, tail);
  expect(edited).toEqual({ changed: true, revision: 1, undoDepth: 2 });
  await page.getByTestId("undo-button").click();
  expect(
    await page.evaluate(({ selectedId }) => {
      const playground = window.__plotlibrePlayground;
      if (!playground) throw new Error("Playground API is unavailable.");
      return playground.plot.store.get(selectedId).controlPoints[0];
    }, tail),
  ).toEqual(tail.control);
});

test("updates style and deletes a selected plot", async ({ page }) => {
  await openPlayground(page);
  await drawTwoPointArrow(page);
  await page.getByTestId("fill-color").evaluate((element) => {
    const input = element as HTMLInputElement;
    input.value = "#00aa88";
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(
    await page.evaluate(() => {
      const playground = window.__plotlibrePlayground;
      if (!playground) throw new Error("Playground API is unavailable.");
      const selectedId = playground.plot.interaction.selectedId;
      if (!selectedId) throw new Error("No plot is selected.");
      return playground.plot.store.get(selectedId).style.fillColor;
    }),
  ).toBe("#00aa88");
  await page.getByTestId("delete-button").click();
  await expect(page.getByTestId("plot-count")).toHaveText("0 个标绘");
});

test("exports and imports PlotJSON", async ({ page }) => {
  await openPlayground(page);
  await drawTwoPointArrow(page);
  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("export-button").click();
  expect((await downloadPromise).suggestedFilename()).toBe(
    "plotlibre-playground.plotjson.json",
  );
  await page.getByTestId("clear-button").click();
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
        controlPoints: [[118.76, 32.04], [118.84, 32.1]],
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

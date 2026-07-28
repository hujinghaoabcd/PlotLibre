import { expect, test } from "@playwright/test";

test("serves the MapLibre 6 worker as a real JavaScript module", async ({
  request,
}) => {
  const response = await request.get(
    "/PlotLibre/assets/maplibre-gl-worker.mjs",
  );
  const contentType = response.headers()["content-type"] ?? "";
  const body = await response.text();

  expect(response.ok()).toBe(true);
  expect(contentType).toContain("javascript");
  expect(body.toLowerCase()).not.toContain("<!doctype html");
  expect(body.length).toBeGreaterThan(100_000);
});

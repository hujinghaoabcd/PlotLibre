import { expect, test } from "@playwright/test";

const WORKER_MODULES = [
  {
    path: "/PlotLibre/assets/maplibre-gl-worker.mjs",
    minimumSize: 10_000,
    expectedImport: "maplibre-gl-shared.mjs",
  },
  {
    path: "/PlotLibre/assets/maplibre-gl-shared.mjs",
    minimumSize: 100_000,
  },
] as const;

for (const module of WORKER_MODULES) {
  test(`serves ${module.path.split("/").at(-1)} as JavaScript`, async ({
    request,
  }) => {
    const response = await request.get(module.path);
    const contentType = response.headers()["content-type"] ?? "";
    const body = await response.text();

    expect(response.ok()).toBe(true);
    expect(contentType).toContain("javascript");
    expect(body.toLowerCase()).not.toContain("<!doctype html");
    expect(body.length).toBeGreaterThan(module.minimumSize);
    if ("expectedImport" in module) {
      expect(body).toContain(module.expectedImport);
    }
  });
}

import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const configDirectory = dirname(fileURLToPath(import.meta.url));

async function prepareMapLibreWorker(): Promise<void> {
  const mapLibreEntry = fileURLToPath(import.meta.resolve("maplibre-gl"));
  const workerSource = resolve(
    dirname(mapLibreEntry),
    "maplibre-gl-worker.mjs",
  );
  const workerDirectory = resolve(configDirectory, "public", "assets");
  const workerTarget = resolve(workerDirectory, "maplibre-gl-worker.mjs");

  await mkdir(workerDirectory, { recursive: true });
  await copyFile(workerSource, workerTarget);
}

export default defineConfig(async () => {
  await prepareMapLibreWorker();

  return {
    base: "/PlotLibre/",
    server: {
      host: "127.0.0.1",
      port: 5173,
    },
    preview: {
      host: "127.0.0.1",
      port: 4173,
    },
    build: {
      outDir: "dist",
      sourcemap: true,
      emptyOutDir: true,
    },
  };
});

import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const configDirectory = dirname(fileURLToPath(import.meta.url));
const MAPLIBRE_WORKER_MODULES = [
  "maplibre-gl-worker.mjs",
  "maplibre-gl-shared.mjs",
] as const;

async function prepareMapLibreWorkerModules(): Promise<void> {
  const mapLibreEntry = fileURLToPath(import.meta.resolve("maplibre-gl"));
  const mapLibreDirectory = dirname(mapLibreEntry);
  const targetDirectory = resolve(configDirectory, "public", "assets");

  await mkdir(targetDirectory, { recursive: true });
  await Promise.all(
    MAPLIBRE_WORKER_MODULES.map((fileName) =>
      copyFile(
        resolve(mapLibreDirectory, fileName),
        resolve(targetDirectory, fileName),
      ),
    ),
  );
}

export default defineConfig(async () => {
  await prepareMapLibreWorkerModules();

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

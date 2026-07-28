import { rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const packageName of ["core", "geometry", "symbols", "maplibre"]) {
  await rm(resolve(root, "packages", packageName, "dist"), {
    recursive: true,
    force: true,
  });
}
await rm(resolve(root, "node_modules", "@plotlibre"), {
  recursive: true,
  force: true,
});

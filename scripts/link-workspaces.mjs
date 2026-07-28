import { mkdir, rm, symlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const scopeDirectory = resolve(root, "node_modules", "@plotlibre");
const packages = ["core", "geometry", "symbols", "maplibre"];

await mkdir(scopeDirectory, { recursive: true });

for (const packageName of packages) {
  const link = resolve(scopeDirectory, packageName);
  const target = resolve(root, "packages", packageName);
  await rm(link, { recursive: true, force: true });
  await symlink(target, link, "dir");
}

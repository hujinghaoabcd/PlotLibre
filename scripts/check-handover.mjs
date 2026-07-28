import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const latestPath = resolve(root, "docs", "handover", "LATEST.md");
await access(latestPath);
const content = await readFile(latestPath, "utf8");

const requiredHeadings = [
  "# PlotLibre Development Handover",
  "## Current state",
  "## Completed in this milestone",
  "## Validation",
  "## Next tasks",
  "## Risks and decisions",
];

const missing = requiredHeadings.filter((heading) => !content.includes(heading));
if (missing.length > 0) {
  throw new Error(`LATEST.md is missing required headings: ${missing.join(", ")}`);
}

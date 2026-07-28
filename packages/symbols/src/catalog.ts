import type { PlotDefinition } from "@plotlibre/core";
import { fineArrowDefinition } from "./fine-arrow.js";
import { straightArrowDefinition } from "./straight-arrow.js";
import { tailedFineArrowDefinition } from "./tailed-fine-arrow.js";

export const arrowSymbols: readonly PlotDefinition[] = [
  straightArrowDefinition,
  fineArrowDefinition,
  tailedFineArrowDefinition,
];

export const builtInSymbols: readonly PlotDefinition[] = [...arrowSymbols];

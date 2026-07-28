import type { PlotDefinition } from "@plotlibre/core";
import { fineArrowDefinition } from "./fine-arrow.js";
import { straightArrowDefinition } from "./straight-arrow.js";

export const arrowSymbols: readonly PlotDefinition[] = [
  straightArrowDefinition,
  fineArrowDefinition,
];

export const builtInSymbols: readonly PlotDefinition[] = [...arrowSymbols];

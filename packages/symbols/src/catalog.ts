import type { PlotDefinition } from "@plotlibre/core";
import { straightArrowDefinition } from "./straight-arrow.js";

export const arrowSymbols: readonly PlotDefinition[] = [
  straightArrowDefinition,
];

export const builtInSymbols: readonly PlotDefinition[] = [...arrowSymbols];

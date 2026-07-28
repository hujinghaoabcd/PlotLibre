import type { PlotDefinition } from "@plotlibre/core";
import { assaultDirectionDefinition } from "./assault-direction.js";
import { fineArrowDefinition } from "./fine-arrow.js";
import { straightArrowDefinition } from "./straight-arrow.js";
import { tailedFineArrowDefinition } from "./tailed-fine-arrow.js";

export const arrowSymbols: readonly PlotDefinition[] = [
  straightArrowDefinition,
  fineArrowDefinition,
  tailedFineArrowDefinition,
  assaultDirectionDefinition,
];

export const builtInSymbols: readonly PlotDefinition[] = [...arrowSymbols];

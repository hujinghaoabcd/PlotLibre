import type { PlotDefinition } from "@plotlibre/core";
import { assaultDirectionDefinition } from "./assault-direction.js";
import { attackArrowDefinition } from "./attack-arrow.js";
import { curvedArrowDefinition } from "./curved-arrow.js";
import { fineArrowDefinition } from "./fine-arrow.js";
import { straightArrowDefinition } from "./straight-arrow.js";
import { tailedFineArrowDefinition } from "./tailed-fine-arrow.js";

export const arrowSymbols: readonly PlotDefinition[] = [
  straightArrowDefinition,
  fineArrowDefinition,
  tailedFineArrowDefinition,
  assaultDirectionDefinition,
  curvedArrowDefinition,
  attackArrowDefinition,
];

export const builtInSymbols: readonly PlotDefinition[] = [...arrowSymbols];

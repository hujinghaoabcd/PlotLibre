import type { PlotDefinition } from "@plotlibre/core";
import { assaultDirectionDefinition } from "./assault-direction.js";
import { attackArrowDefinition } from "./attack-arrow.js";
import { curvedArrowDefinition } from "./curved-arrow.js";
import { doubleArrowDefinition } from "./double-arrow.js";
import { fineArrowDefinition } from "./fine-arrow.js";
import { pincerArrowDefinition } from "./pincer-arrow.js";
import { squadCombatArrowDefinition } from "./squad-combat.js";
import { straightArrowDefinition } from "./straight-arrow.js";
import { tailedAttackArrowDefinition } from "./tailed-attack-arrow.js";
import { tailedFineArrowDefinition } from "./tailed-fine-arrow.js";

export const arrowSymbols: readonly PlotDefinition[] = [
  straightArrowDefinition,
  fineArrowDefinition,
  tailedFineArrowDefinition,
  assaultDirectionDefinition,
  curvedArrowDefinition,
  attackArrowDefinition,
  tailedAttackArrowDefinition,
  doubleArrowDefinition,
  pincerArrowDefinition,
  squadCombatArrowDefinition,
];

export const builtInSymbols: readonly PlotDefinition[] = [...arrowSymbols];

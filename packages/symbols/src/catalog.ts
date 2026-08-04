import type { PlotDefinition } from "@plotlibre/core";
import { assaultDirectionDefinition } from "./assault-direction.js";
import { attackArrowDefinition } from "./attack-arrow.js";
import { circularArcDefinition } from "./circular-arc.js";
import { circularSegmentDefinition } from "./circular-segment.js";
import { closedCurveDefinition } from "./closed-curve.js";
import { corridorArrowDefinition } from "./corridor.js";
import { curvedArrowDefinition } from "./curved-arrow.js";
import { doubleArrowDefinition } from "./double-arrow.js";
import { fineArrowDefinition } from "./fine-arrow.js";
import { gatheringPlaceDefinition } from "./gathering-place.js";
import { pincerArrowDefinition } from "./pincer-arrow.js";
import { routeArrowDefinition } from "./route-arrow.js";
import { bidirectionalRouteArrowDefinition } from "./route-bidirectional.js";
import { doubleHeadRouteArrowDefinition } from "./route-double-head.js";
import { sectorDefinition } from "./sector.js";
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
  routeArrowDefinition,
  corridorArrowDefinition,
  bidirectionalRouteArrowDefinition,
  doubleHeadRouteArrowDefinition,
];

export const lineSymbols: readonly PlotDefinition[] = [
  circularArcDefinition,
];

export const areaSymbols: readonly PlotDefinition[] = [
  closedCurveDefinition,
  gatheringPlaceDefinition,
  circularSegmentDefinition,
  sectorDefinition,
];

export const builtInSymbols: readonly PlotDefinition[] = [
  ...arrowSymbols,
  ...lineSymbols,
  ...areaSymbols,
];

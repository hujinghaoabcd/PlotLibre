import type { Position } from "@plotlibre/core";
import {
  buildAttackArrowRing,
  resolveAttackArrowParameters,
  type AttackArrowParameters,
  type ResolvedAttackArrowParameters,
} from "./attack-arrow.js";
import { sampleCatmullRom } from "./curves.js";
import { createLocalProjection } from "./local-projection.js";
import { cleanPolyline, measurePolyline } from "./polyline.js";
import {
  add,
  leftNormal,
  normalize,
  scale,
  subtract,
} from "./vector.js";

/**
 * Semantic controls are a centre path rather than authored tail edges:
 *
 * 0      tail centre
 * 1..n-2 path controls
 * n-1    exact objective/tip
 */
export interface SquadCombatParameters extends AttackArrowParameters {
  readonly tailWidthPathRatio?: number;
}

export interface ResolvedSquadCombatParameters
  extends ResolvedAttackArrowParameters {
  readonly tailWidthPathRatio: number;
}

export const DEFAULT_SQUAD_COMBAT_PARAMETERS: ResolvedSquadCombatParameters = {
  headLengthRatio: 0.18,
  maximumHeadLengthTailRatio: 2.2,
  headHalfWidthTailRatio: 0.82,
  neckHalfWidthTailRatio: 0.28,
  bodyBulgeRatio: 1.02,
  bodyBulgePosition: 0.32,
  tension: 0.12,
  segmentsPerSpan: 16,
  miterLimit: 3,
  minimumTailWidthMeters: 1,
  maximumTailWidthMeters: 100_000,
  tailWidthPathRatio: 0.04,
};

export function resolveSquadCombatParameters(
  parameters: SquadCombatParameters = {},
): ResolvedSquadCombatParameters {
  const merged = {
    ...DEFAULT_SQUAD_COMBAT_PARAMETERS,
    ...parameters,
  };
  const attack = resolveAttackArrowParameters(merged);
  if (
    !Number.isFinite(merged.tailWidthPathRatio) ||
    merged.tailWidthPathRatio < 0.01 ||
    merged.tailWidthPathRatio > 0.15
  ) {
    throw new RangeError("tailWidthPathRatio must be between 0.01 and 0.15.");
  }
  return {
    ...attack,
    tailWidthPathRatio: merged.tailWidthPathRatio,
  };
}

/**
 * Converts the authored centre path into the existing attack-arrow frame input.
 * The two tail edges are derived symmetrically in local metres and are never
 * returned as semantic controls by the public Definition.
 */
export function deriveSquadCombatAttackControls(
  controlPoints: readonly Position[],
  parameters: SquadCombatParameters = {},
): readonly Position[] {
  const resolved = resolveSquadCombatParameters(parameters);
  return deriveResolvedAttackControls(controlPoints, resolved);
}

export function buildSquadCombatRing(
  controlPoints: readonly Position[],
  parameters: SquadCombatParameters = {},
): readonly Position[] {
  const resolved = resolveSquadCombatParameters(parameters);
  const attackControls = deriveResolvedAttackControls(controlPoints, resolved);
  return buildAttackArrowRing(attackControls, resolved);
}

function deriveResolvedAttackControls(
  controlPoints: readonly Position[],
  resolved: ResolvedSquadCombatParameters,
): readonly Position[] {
  if (controlPoints.length < 2) {
    throw new RangeError("Squad combat arrow requires at least two control points.");
  }

  const semanticTailCenter = controlPoints[0]!;
  const projection = createLocalProjection(semanticTailCenter);
  const localControls = cleanPolyline(
    controlPoints.map((position) => projection.project(position)),
    1e-6,
  );
  if (localControls.length < 2) {
    throw new RangeError(
      "Squad combat arrow requires a distinct direction after the tail centre.",
    );
  }

  const sampledPath = sampleCatmullRom(localControls, {
    tension: resolved.tension,
    segmentsPerSpan: resolved.segmentsPerSpan,
  });
  const pathLength = measurePolyline(sampledPath, 1e-6).totalLength;
  const tailWidth = pathLength * resolved.tailWidthPathRatio;
  if (tailWidth < resolved.minimumTailWidthMeters) {
    throw new RangeError(
      `Squad combat derived tail width must be at least ${resolved.minimumTailWidthMeters} meters.`,
    );
  }
  if (tailWidth > resolved.maximumTailWidthMeters) {
    throw new RangeError(
      `Squad combat derived tail width must not exceed ${resolved.maximumTailWidthMeters} meters.`,
    );
  }

  const initialDirection = normalize(
    subtract(localControls[1]!, localControls[0]!),
  );
  const normal = leftNormal(initialDirection);
  const halfTailWidth = tailWidth / 2;
  const tailLeft = add(localControls[0]!, scale(normal, halfTailWidth));
  const tailRight = add(localControls[0]!, scale(normal, -halfTailWidth));

  return [
    projection.unproject(tailLeft),
    projection.unproject(tailRight),
    ...controlPoints.slice(1).map(clonePosition),
  ];
}

function clonePosition([longitude, latitude]: Position): Position {
  return [longitude, latitude];
}

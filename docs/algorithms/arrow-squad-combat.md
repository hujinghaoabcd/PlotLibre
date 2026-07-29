# `arrow.squad-combat` Algorithm Record

## Semantic model

The public Definition stores a centre action path:

```text
controlPoints[0]      = tail centre
controlPoints[1..n-2] = optional path controls
controlPoints[n-1]    = exact objective/tip
```

Minimum controls: `2`. Maximum controls: `64`. A two-control path produces a straight squad-combat arrow. Additional controls shape the centre path. Double-click or Enter completes the authored path.

The derived tail edges are not semantic controls and never enter Store, handles, History or PlotJSON.

## Independent construction

1. Create a local-metre projection centred on the authored tail centre.
2. Clean consecutive duplicate path controls.
3. Sample the centre path with the existing Catmull–Rom primitive.
4. Measure sampled path length.
5. Derive tail width as `pathLength × tailWidthPathRatio`.
6. Derive two temporary tail edges symmetrically around the tail centre and perpendicular to the first path segment.
7. Pass those temporary tail edges plus the authored remaining path into the verified attack-arrow frame/body/head construction.
8. Validate finite coordinates, ring closure, winding and simple topology.
9. Return one Polygon ring while preserving the exact authored objective/tip.

This is structurally distinct from `arrow.attack`: attack-arrow users explicitly author both tail edges, whereas squad-combat users author one centre path and the tail is derived.

## Parameters

```text
headLengthRatio                 0.18
maximumHeadLengthTailRatio      2.2
headHalfWidthTailRatio          0.82
neckHalfWidthTailRatio          0.28
bodyBulgeRatio                  1.02
bodyBulgePosition               0.32
tension                         0.12
segmentsPerSpan                 16
miterLimit                      3
minimumTailWidthMeters          1
maximumTailWidthMeters          100000
tailWidthPathRatio              0.04
```

`tailWidthPathRatio` is constrained to `[0.01, 0.15]`. The narrower default is calibrated for the existing strict simple-ring policy on curved paths; topology checks are not relaxed.

## Validation policy

Reject:

- fewer than two controls;
- coincident/degenerate centre paths;
- non-finite or invalid parameters;
- derived tail width outside configured metre bounds;
- arrow-head or body construction failure;
- self-intersecting output rings.

The public Definition reports `INVALID_SQUAD_COMBAT_GEOMETRY` and full geometry generation remains a prerequisite for Store mutation.

## Clean-room provenance

Observable behavior and terminology were reviewed from:

```text
repository: sakitam-fdd/ol-plot
revision:   c919e60b4edeaeca53c08f9552f793b2ae9537f0
file:       packages/ol-plot/src/geometry/Arrow/SquadCombat.ts
license:    MIT
```

Only observable semantics were used: squad combat is an attack-arrow-family symbol with a centre path and derived tail width. PlotLibre's projection, sampling, width calibration, topology policy, semantic contract and implementation were written independently. No source code was copied.

# `arrow.double` Clean-Room Algorithm Record

日期：2026-07-29  
Milestone：005H  
Definition：`arrow.double` 1.0.0

## Purpose

This document records the independent PlotLibre geometry used to turn four semantic controls into one connected double-arrow Polygon. It complements the approved semantic contract in `docs/design/arrow-double-semantic-design.md`.

## Public behavior research

Before implementation, public behavior was reviewed at:

```text
repository: sakitam-fdd/ol-plot
revision:   c919e60b4edeaeca53c08f9552f793b2ae9537f0
file:       packages/ol-plot/src/geometry/Arrow/DoubleArrow.ts
```

Only externally observable behavior was retained:

- DoubleArrow is a dedicated Polygon type;
- normal drawing uses four controls;
- two objectives are explicit at completion;
- left/right construction is determined geometrically;
- an intermediate three-point state may preview a counterpart.

PlotLibre does not copy source code, formulas, constants, helper layout, control-point arrays, class structure or parameter names from that implementation.

## Canonical semantic input

```text
control 0 = tail edge A
control 1 = tail edge B
control 2 = objective A
control 3 = objective B
```

The tail and objective pairs are unordered. Authored order survives PlotJSON, while rendering resolves canonical left/right identities from a derived local frame.

## Local frame

The projection origin is the geographic midpoint of the two tail controls. All construction is performed in local metres.

```text
T = midpoint(tail pair)
O = midpoint(objective pair)
D = normalize(O - T)
N = leftNormal(D)
B = lerp(T, O, branchPositionRatio)
```

Lateral projection on `N` resolves tail-left/tail-right and objective-left/objective-right. Consequently, swapping either authored pair does not change generated geometry.

## Shared body and branch

The output is one compound geometry, not two complete arrows joined afterward.

The shared tail body is constructed from:

- the two exact semantic tail edges;
- a derived body-bulge station between `T` and `B`;
- a derived lateral half-width controlled by `bodyBulgeRatio`;
- two wing-start points offset from `B`.

The branch is never serialized as a fifth control.

## Coupled wing centerlines

Each wing uses three derived/semantic stations:

```text
wing start near B
→ derived outward curvature control
→ exact semantic objective
```

The centerline is sampled with the existing PlotLibre Catmull–Rom/Hermite primitive. Both wings share one tension and segment-count contract.

The objective remains the exact arrow tip. Sampled curve points are derived geometry and are not handles or PlotJSON controls.

## Two heads and trimmed shafts

Each wing uses the existing reusable `buildArrowHead()` primitive. Head length is bounded by:

- local wing length;
- semantic tail width;
- a maximum fraction of wing length.

The shaft is trimmed to the head neck, then offset with a width profile from the branch-side width to the neck width.

A curved miter can place the final derived offset point slightly ahead of the neck plane. PlotLibre removes any boundary point with positive forward projection beyond that plane before joining the head. This prevents the shaft boundary from crossing a triangular head edge while preserving strict simple-ring validation.

## Shared inner bridge

The two inner wing boundaries are connected by one concave shared bridge point:

```text
bridge = B - D * tailWidth * innerBridgeRatio
```

The bridge must remain ahead of the tail frame. It is a derived construction vertex, not a semantic control.

## Ring order

The final boundary is assembled as:

```text
tailLeft
→ left body bulge
→ left outer wing
→ left head
→ left inner wing
→ shared inner bridge
→ right inner wing
→ right head
→ right outer wing
→ right body bulge
→ tailRight
→ tailLeft
```

The ring is normalized to counterclockwise winding and rejected if it self-intersects.

## Parameter contract

```text
branchPositionRatio
headLengthRatio
maximumHeadLengthTailRatio
headHalfWidthTailRatio
neckHalfWidthTailRatio
bodyBulgeRatio
innerBridgeRatio
tension
segmentsPerSpan
miterLimit
minimumTailWidthMeters
maximumTailWidthMeters
```

All parameters are finite, explicit, validated, serializable and included in Definition defaults.

## Validation

Generation rejects:

- any control count other than four;
- coincident or out-of-range tail edges;
- coincident objectives;
- tail or objective pairs that fail to span the primary direction;
- objectives too close to form distinct heads;
- either objective behind the derived forward tail plane;
- invalid head/body/bridge parameters;
- bridge placement too close to or behind the tail;
- non-finite, degenerate or self-intersecting output.

`doubleArrowDefinition.validate()` executes complete geometry generation before Store or History mutation and reports `INVALID_DOUBLE_ARROW_GEOMETRY` on failure.

## Golden and invariant coverage

The deterministic equatorial golden fixture uses:

```text
tail pair:       (-0.001, 0), (0.001, 0)
objective pair:  (-0.004, 0.012), (0.004, 0.012)
```

Required tests cover:

- deterministic 86-coordinate ring;
- exact two tail edges and exact two tips;
- tail-pair, objective-pair and both-pairs swap invariance;
- finite, closed, counterclockwise and simple output;
- branch, bridge and head parameter isolation;
- invalid-count, coincident and behind-tail rejection;
- Registry roles and PlotJSON four-control round trip;
- fixed-four MapLibre preview/completion;
- objective-handle edit, one replace command and undo.

## Scope boundary

This implementation does not add a fifth branch control, persist a three-point mirror, union two attack arrows, or introduce pincer, route, corridor or squad-combat symbols.

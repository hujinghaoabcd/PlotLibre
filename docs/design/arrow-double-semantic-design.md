# `arrow.double` Semantic Design

日期：2026-07-29  
Milestone：005H  
状态：semantic design approved; geometry not yet implemented

## 1. Goal

`arrow.double` is a single semantic tactical graphic with:

- one shared tail/base;
- one shared branching body;
- two exact objectives/tips;
- two derived arrow heads;
- one closed simple Polygon.

It is not two independent arrows grouped into one feature.

## 2. Clean-room behavior research

Public behavior was reviewed at the following ol-plot revision:

```text
repository: sakitam-fdd/ol-plot
revision:   c919e60b4edeaeca53c08f9552f793b2ae9537f0
file:       packages/ol-plot/src/geometry/Arrow/DoubleArrow.ts
```

Observed public behavior only:

- the public plot type is a dedicated DoubleArrow Polygon;
- interactive drawing is fixed at four points;
- a three-point intermediate state may derive a temporary counterpart;
- a four-point state contains two explicit objective controls;
- left/right construction is selected from geometry rather than a fixed click-side label;
- restored data may contain an additional connection control, although normal drawing stops at four;
- public Playground documentation describes DoubleArrow as a maximum-four-point symbol.

PlotLibre does not copy the reference formulas, constants, helper calls, point lists or class layout.

## 3. PlotLibre canonical control model

Version 1.0 uses exactly four semantic controls:

```text
controlPoints[0] = tail edge A
controlPoints[1] = tail edge B
controlPoints[2] = objective A
controlPoints[3] = objective B
```

Control schema:

```text
minPoints = 4
maxPoints = 4
completeOnDoubleClick = false
allowPointInsertion = false
allowPointRemoval = false
```

Interaction consequence:

```text
click tail edge A
→ click tail edge B
→ click first objective
→ pointer candidate shows complete four-point draft
→ click second objective auto-completes
```

No double-click is required for normal drawing. `MultiPointDrawSession` remains Definition-driven and completes at the fixed maximum.

## 4. Deliberate differences from public reference behavior

### No persisted three-point symmetry fallback

A three-point state does not represent a complete PlotLibre feature. A mirrored second objective would be hidden derived semantic state and would make editing/export ambiguous.

The fourth pointer candidate may preview the complete symbol, but both objectives must be explicit before Store mutation.

### No fifth connection control in PlotJSON 1.0

The shared branch/connection point is derived from the four controls and parameters. It is not a fifth semantic control.

This keeps:

- drawing fixed at four clicks;
- all persisted controls directly user-authored;
- branch behavior deterministic and parameterized;
- the interaction adapter free from symbol-specific completion rules.

A future schema version may add an explicit branch-control mode only through an intentional migration.

## 5. Pair semantics and input-order independence

The two tail controls form an unordered semantic pair. The two objective controls form another unordered semantic pair.

Derived frame:

```text
T = midpoint(tail edge A, tail edge B)
O = midpoint(objective A, objective B)
D = normalize(O - T)
N = left perpendicular of D
```

Canonical ordering:

- resolve `tailLeft` and `tailRight` from lateral projection on `N`;
- resolve `objectiveLeft` and `objectiveRight` from lateral projection on `N`;
- swapping controls 0/1 must not change generated geometry;
- swapping controls 2/3 must not change generated geometry;
- swapping both pairs must not change generated geometry.

PlotJSON preserves authored control order, but rendering is pair-order invariant.

## 6. Exact semantic guarantees

The generated ring must contain exactly:

- both semantic tail-edge positions;
- both semantic objective positions as the two arrow tips.

All four controls render semantic handles.

The following remain derived and never become handles or PlotJSON controls:

- tail center;
- objective midpoint;
- forward axis;
- branch center;
- wing curve samples;
- body offset vertices;
- head shoulders and necks;
- inner bridge/saddle vertices;
- final Polygon vertices.

## 7. Proposed `DoubleArrowFrame`

The implementation should introduce a reusable pure frame before the public ring generator.

```text
DoubleArrowFrame
├─ projection
├─ semantic tail edges
├─ semantic objectives
├─ canonical left/right identities
├─ tail center and tail width
├─ objective midpoint and objective separation
├─ primary direction
├─ derived branch center
├─ left wing centerline
├─ right wing centerline
├─ left head frame
└─ right head frame
```

The frame must not depend on MapLibre, Store, interaction or DOM.

## 8. Derived branch policy

The branch center is parameterized on the segment from tail center to objective midpoint:

```text
B = lerp(T, O, branchPositionRatio)
```

Initial parameter contract:

```text
branchPositionRatio
    branch progress from tail center toward objective midpoint
```

Target validation range:

```text
0.15 <= branchPositionRatio <= 0.70
```

The final default is selected by golden-fixture calibration, not copied from a reference implementation.

The branch center is a derived construction point. A later parameter handle may edit `branchPositionRatio` without changing control-point count.

## 9. Wing and body model

The symbol uses two coupled wing centerlines:

```text
left wing:  shared tail/body region → branch center → objectiveLeft
right wing: shared tail/body region → branch center → objectiveRight
```

The final ring is one connected boundary:

```text
tailLeft
→ left outer body
→ left head
→ left inner body
→ shared inner bridge
→ right inner body
→ right head
→ right outer body
→ tailRight
→ tailLeft
```

The shared inner bridge is derived from both wings and the branch frame. It cannot be implemented by unioning two complete attack-arrow Polygons.

## 10. Parameter families

005H implementation should define a small explicit parameter set:

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

Rules:

- head size is constrained by local wing length and semantic tail width;
- both heads share one parameter contract in version 1.0;
- body and inner bridge parameters must be independent;
- numerical defaults are calibrated from PlotLibre golden fixtures;
- parameters must be finite, validated and serializable.

## 11. Validation policy

Definition validation must include complete geometry generation before command execution.

Reject when:

- fewer or more than four controls are supplied;
- tail edges coincide or exceed width limits;
- objective tips coincide;
- tail center and objective midpoint coincide;
- tail baseline fails to span the primary direction;
- objective separation is nearly parallel to the primary direction;
- either objective is not sufficiently ahead of the tail frame;
- either wing is too short for a valid head;
- branch position leaves insufficient body or head space;
- derived ring contains non-finite coordinates;
- ring is not closed or counterclockwise after normalization;
- ring self-intersects;
- one head overlaps the other head or crosses the opposite wing;
- inner bridge crosses an outer boundary.

Proposed Definition issue code:

```text
INVALID_DOUBLE_ARROW_GEOMETRY
```

Invalid pointer and handle previews remain outside Store and History.

## 12. Geometry invariants

Required invariants:

1. deterministic output;
2. finite coordinates;
3. exact two tail edges;
4. exact two objective tips;
5. pair-order invariance;
6. closed counterclockwise simple ring;
7. one connected Polygon and no holes;
8. both heads present and distinct;
9. branch center remains derived;
10. no generated vertex is serialized as a semantic control.

## 13. Testing plan

### Pure geometry

- deterministic golden fixture;
- exact tail edges and both tips;
- tail pair swap invariance;
- objective pair swap invariance;
- both-pairs swap invariance;
- symmetric case;
- asymmetric objectives;
- branch parameter isolation;
- inner bridge parameter isolation;
- head parameter isolation;
- minimum/maximum width guards;
- coincident and near-collinear rejection;
- one objective behind tail rejection;
- crossing objectives/topology rejection;
- antimeridian pair-order behavior;
- finite/closed/CCW/simple ring.

### Definition and PlotJSON

- built-in Registry registration;
- fill/outline/hit-area roles;
- `INVALID_DOUBLE_ARROW_GEOMETRY`;
- exact four-control round trip;
- derived branch absent from PlotJSON;
- parameter round trip.

### Interaction and MapLibre

- selector and sample count increase from seven to eight;
- after three committed clicks, fourth pointer candidate produces draft;
- fourth click auto-completes without double-click;
- all four semantic handles appear;
- dragging either objective updates exactly one tip;
- one drag creates one history command;
- undo restores the objective;
- committed Source contains `arrow.double`;
- fill/line Layers return actual rendered features;
- style reload restores geometry and handles;
- existing 90 Node and 12 Chromium regressions remain green.

## 14. Public API target

```text
DOUBLE_ARROW_TYPE = "arrow.double"
DoubleArrowParameters
ResolvedDoubleArrowParameters
DEFAULT_DOUBLE_ARROW_PARAMETERS
resolveDoubleArrowParameters()
buildDoubleArrowFrame()
buildDoubleArrowRing()
doubleArrowDefinition
```

Target Definition version:

```text
1.0.0
```

Target workspace baseline after implementation:

```text
0.0.12
```

## 15. Scope exclusions

Milestone 005H does not implement:

- pincer arrows;
- route or corridor symbols;
- squad-combat symbols;
- multi-head variants beyond exactly two heads;
- explicit fifth branch control;
- automatic three-point persistence;
- parameter handles;
- committed control insertion/removal;
- snapping or constraints;
- Core Store/History transaction redesign.

## 16. Implementation order

1. add independent clean-room algorithm record;
2. implement `DoubleArrowFrame`;
3. implement two coupled wing centerlines and heads;
4. implement shared inner bridge and one ring;
5. add validation and golden tests;
6. add Definition/Registry/PlotJSON;
7. add eight-symbol Playground and Chromium coverage;
8. update public docs and handover;
9. merge only after Node 20.19/22 and Chromium are green.

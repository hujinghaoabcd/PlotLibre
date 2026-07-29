# `arrow.pincer` Semantic Design

日期：2026-07-29  
Milestone：006A  
状态：proposed semantic design; implementation blocked pending design review

## 1. Goal

`arrow.pincer` is a single semantic compound tactical graphic with:

- two paired arms;
- two exact outer-tail controls;
- two exact objective/tip controls;
- one exact authored inner junction shared by both arms;
- two derived arrow heads;
- one closed simple Polygon.

It is not:

- an alias of `arrow.double`;
- two independently persisted attack arrows;
- a four-control symbol with a hidden derived fifth control;
- a style-only variant of an existing definition.

The defining semantic distinction is that the relationship between each outer tail and its objective is authored and persistent, while the shared inner junction is also authored rather than derived.

## 2. Clean-room behavior research

Public behavior was reviewed without copying formulas, constants, helper calls, point arrays or class structure.

### Reference A

```text
repository: zhous1993/cesium-symbol
revision:   806689995419ec2c67569e7ac29e166d081b1b5f
file:       package/arrow/pincerArrow.ts
```

Observed public behavior only:

- the public type is a dedicated PincerArrow Polygon;
- four controls are sufficient for its normal drawing path;
- a three-control state may derive a temporary counterpart objective;
- with four controls, the shared connection defaults to the midpoint of the first pair;
- restored or extended data may provide a fifth explicit connection control;
- the first and second objectives are assigned to opposite arms according to geometric orientation.

No repository license file was found at the inspected revision, and its root package metadata does not declare a license. PlotLibre therefore treats this source strictly as an observable-behavior reference and does not reuse implementation code.

### Reference B

```text
repository: yyx626/cesium-demo
revision:   b65c2c766bb5fe8782fa36b2b68768e0a42348cc
file:       src/lib/CreatePincerArrow.js
```

Observed public behavior only:

- the UI names the result `PincerArrow`;
- drawing accepts up to five anchors;
- completion is explicit rather than tied to the fourth point;
- the rendering path delegates to a function named `doubleArrow`, illustrating that public ecosystems often conflate the two names and algorithms.

PlotLibre deliberately rejects that aliasing model. A pincer definition must have its own canonical semantic contract even when low-level geometric primitives are shared.

## 3. Deliberate distinction from `arrow.double`

| Contract | `arrow.double` | `arrow.pincer` |
|---|---|---|
| Authored controls | exactly 4 | exactly 5 |
| Tail semantics | unordered tail-edge pair | paired outer tails A/B |
| Objective semantics | unordered objective pair | objective A paired to tail A; objective B paired to tail B |
| Shared connection | derived branch/body region | exact authored inner junction |
| Independent objective swap | geometry invariant | changes arm pairing and therefore geometry |
| Whole-arm A/B swap | geometry invariant | geometry invariant |
| Shared forward body | required | prohibited as the defining topology |
| Canonical topology | shared body branching into two heads | two arms coupled through one explicit inner junction and one outer base edge |

A pincer implementation may reuse pure projection, curve, head-frame, ring-validation and offset primitives. It must not reuse `DoubleArrowFrame` as its semantic frame or call the double-arrow public generator and relabel the result.

## 4. PlotLibre canonical control model

Version 1.0 uses exactly five semantic controls:

```text
controlPoints[0] = outer tail A
controlPoints[1] = outer tail B
controlPoints[2] = objective/tip A
controlPoints[3] = objective/tip B
controlPoints[4] = shared inner junction
```

Arm pairing is explicit:

```text
arm A = outer tail A → shared inner junction → objective A
arm B = outer tail B → shared inner junction → objective B
```

The inner junction is not a generic branch-center parameter. It is an exact authored semantic location on the final inner boundary where the two arm interiors meet.

Control schema:

```text
minPoints = 5
maxPoints = 5
completeOnDoubleClick = false
allowPointInsertion = false
allowPointRemoval = false
```

## 5. Interaction contract

Normal drawing order:

```text
click outer tail A
→ click outer tail B
→ click objective A
→ click objective B
→ pointer candidate controls the shared inner junction
→ click the junction to auto-complete at the fixed maximum
```

Consequences:

- `MultiPointDrawSession` is selected from the Definition schema;
- the fifth click is the only normal completion event;
- Enter with fewer than five authored controls does not complete;
- double-click is not required;
- no symbol-ID branch is added to the interaction adapter;
- before a valid five-control Polygon exists, the shared semantic-guide fallback keeps the authored path and points visible;
- invalid fifth-point candidates keep the session active and replaceable;
- no derived control can satisfy completion.

The initial implementation does not derive a hidden symmetric objective or hidden junction. All five canonical controls must be user-authored before Store mutation.

## 6. Pair semantics and order behavior

The two arms are an ordered pairing, not two independently unordered sets.

Authored identity:

```text
A = (control 0, control 2)
B = (control 1, control 3)
J = control 4
```

Required order behavior:

- swapping controls 0 and 1 alone changes the tail-to-objective pairing and may change geometry;
- swapping controls 2 and 3 alone changes the tail-to-objective pairing and may change geometry;
- simultaneously swapping `(0 ↔ 1)` and `(2 ↔ 3)` must not change normalized generated geometry;
- control 4 remains the same under whole-arm exchange;
- PlotJSON preserves authored order exactly.

The generator may internally resolve visual left/right identities from geometry, but it must preserve the authored A/B arm pairing.

## 7. Exact semantic guarantees

The generated ring must contain exactly:

- outer tail A;
- outer tail B;
- objective A as head tip A;
- objective B as head tip B;
- the shared inner junction as the inner saddle/apex joining the two arm interiors.

All five controls render semantic handles.

The following remain derived and never become PlotJSON controls or ordinary handles:

- tail midpoint;
- objective midpoint;
- global forward and lateral axes;
- arm centerline samples;
- outer and inner curve samples;
- head shoulders and necks;
- junction-adjacent shoulder points;
- body offset vertices;
- outer base-edge samples;
- final Polygon vertices other than the five exact semantic positions.

## 8. Proposed `PincerArrowFrame`

The implementation should introduce an independent pure frame:

```text
PincerArrowFrame
├─ local projection
├─ authored arm A controls
├─ authored arm B controls
├─ exact shared inner junction
├─ global tail/objective centers
├─ global forward/lateral frame
├─ visual left/right arm resolution
├─ arm A semantic centerline/frame
├─ arm B semantic centerline/frame
├─ arm A head frame
├─ arm B head frame
├─ junction tangent frame
└─ outer base frame
```

The frame must not depend on MapLibre, Store, interaction or DOM.

`PincerArrowFrame` may consume reusable pure primitives, but it must not be a renamed `DoubleArrowFrame` and must not infer an unordered objective pair.

## 9. Geometry model

Each arm is constructed from its own authored pairing and the shared junction:

```text
arm A guide: outer tail A → junction neighborhood → objective A
arm B guide: outer tail B → junction neighborhood → objective B
```

The junction is shared semantic state, but each arm keeps an independent tangent and width evolution.

The final Polygon ring is one coherent boundary:

```text
outer tail A
→ arm A outer boundary
→ head A
→ arm A inner boundary
→ exact shared inner junction
→ arm B inner boundary
→ head B
→ arm B outer boundary
→ outer tail B
→ outer base edge
→ outer tail A
```

Rules:

- the junction appears exactly once in the normalized ring before closure;
- the two heads are distinct;
- the two inner boundaries meet only at the authored junction;
- the outer base edge closes the compound symbol without creating a third shared forward body;
- the final output is one Polygon with no holes;
- unioning or concatenating two complete attack-arrow Polygons is prohibited;
- offset points beyond either head neck plane are trimmed before ring assembly.

## 10. Junction policy

The junction is authored, but not unrestricted.

Derived global frame:

```text
T = midpoint(outer tail A, outer tail B)
O = midpoint(objective A, objective B)
D = normalize(O - T)
N = left perpendicular of D
```

Validation computes:

```text
junction forward progress = dot(J - T, D) / |O - T|
junction lateral offset  = dot(J - T, N)
```

Initial implementation must calibrate an admissible junction region from PlotLibre fixtures. The policy must enforce all of the following without silently moving the authored point:

- J is separated from both outer tails;
- J remains in the tail/junction zone rather than beyond either objective;
- both semantic tail spans `(tail A, J)` and `(J, tail B)` support valid widths;
- J leaves enough path length for both heads;
- J does not force inner boundaries to cross;
- J is preserved exactly when valid and rejected when invalid.

The implementation may expose warning ranges later, but version 1.0 must fail closed rather than clamp or replace the authored junction.

## 11. Parameter families

The implementation should define a small explicit parameter set independent of the double-arrow branch contract:

```text
headLengthRatio
maximumHeadLengthTailRatio
headHalfWidthTailRatio
neckHalfWidthTailRatio
armBulgeRatio
outerTension
innerTension
junctionShoulderRatio
segmentsPerSpan
miterLimit
minimumTailSpanMeters
maximumTailSpanMeters
```

Rules:

- both heads share one version-1.0 parameter contract;
- local head size is constrained by the corresponding arm length and semantic tail span;
- `junctionShoulderRatio` changes only the transition adjacent to J and never moves J;
- outer and inner tension are independently testable;
- there is no `branchPositionRatio` in version 1.0 because the junction is authored;
- there is no `innerBridgeRatio` alias copied from `arrow.double`;
- all parameters are finite, validated and serializable;
- numerical defaults are calibrated from PlotLibre fixtures rather than copied from references.

## 12. Validation policy

Definition validation must include complete Registry generation before Store mutation.

Reject when:

- the control count is not exactly five;
- any control is non-finite;
- the outer tails coincide;
- the objectives coincide;
- the junction coincides with either outer tail or either objective;
- either semantic tail span is below the minimum width;
- either semantic tail span exceeds the maximum width;
- the global tail and objective centers coincide;
- either paired arm is too short for a valid head;
- objective A is not sufficiently forward of its local tail/junction frame;
- objective B is not sufficiently forward of its local tail/junction frame;
- the authored pairing forces the two arm centerlines to cross away from J;
- J lies outside the admissible junction region;
- J lies beyond a head neck plane;
- one head overlaps the other head or crosses the opposite arm;
- an inner boundary crosses the opposite inner or outer boundary;
- the outer base edge crosses either arm;
- the ring contains non-finite coordinates;
- the ring is not closed after normalization;
- the ring self-intersects;
- the normalized ring cannot be made counterclockwise without changing semantic topology.

Proposed Definition issue code:

```text
INVALID_PINCER_ARROW_GEOMETRY
```

Invalid pointer and handle previews remain outside Store and History. Before the first valid full Polygon, semantic-guide rendering remains visible.

## 13. Geometry invariants

Required invariants:

1. deterministic output;
2. finite coordinates;
3. exact five semantic controls represented by the geometry/handle contract;
4. exact two objective tips;
5. exact authored inner junction;
6. authored A/B pairing preserved;
7. simultaneous whole-arm swap invariance;
8. no requirement for independent tail-pair or objective-pair swap invariance;
9. closed counterclockwise simple ring;
10. one connected Polygon and no holes;
11. two heads present and distinct;
12. no shared forward body equivalent to `arrow.double`;
13. no derived vertex serialized as semantic state;
14. local-metre construction for short symbols;
15. antimeridian behavior follows the project coordinate-mode policy.

## 14. PlotJSON 1.0 contract

Canonical representation:

```json
{
  "plotType": "arrow.pincer",
  "definitionVersion": "1.0.0",
  "controlPoints": [
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0]
  ],
  "parameters": {},
  "style": {},
  "metadata": {}
}
```

Semantic meaning is positional and versioned:

```text
0 outer tail A
1 outer tail B
2 objective A
3 objective B
4 shared inner junction
```

Migration boundaries:

- four-control `arrow.double` data cannot be relabeled as `arrow.pincer`;
- a derived midpoint cannot be silently persisted as control 4;
- legacy five-point data requires an explicit adapter only when its point roles are known;
- changing arm pairing semantics requires a future Definition version and migration;
- generated curve, head, body and junction-shoulder vertices never enter PlotJSON.

## 15. Testing plan

### Pure geometry

- deterministic golden fixture;
- exact outer tails, objectives and junction;
- simultaneous whole-arm swap invariance;
- proof that independent objective swap changes the paired geometry;
- symmetric arms;
- asymmetric arm lengths;
- off-center valid junction;
- junction parameter isolation;
- outer-tension isolation;
- inner-tension isolation;
- head-parameter isolation;
- minimum/maximum semantic tail-span guards;
- coincident-control rejection;
- junction-outside-zone rejection;
- one objective behind its paired tail rejection;
- crossed authored pairing rejection;
- head overlap rejection;
- antimeridian behavior;
- finite/closed/CCW/simple ring.

### Definition and PlotJSON

- built-in Registry registration;
- fill/outline/hit-area roles;
- `INVALID_PINCER_ARROW_GEOMETRY`;
- exact five-control round trip;
- exact A/B authored order round trip;
- junction present in PlotJSON;
- derived geometry absent from PlotJSON;
- parameter round trip;
- four-control data rejection.

### Interaction and MapLibre

- selector and sample count increase from eight to nine;
- after four authored clicks, the fifth pointer candidate produces a full draft when valid;
- before five valid controls, semantic-guide output remains visible;
- invalid fifth-point completion leaves drawing active;
- fifth valid click auto-completes without double-click;
- all five semantic handles appear;
- dragging the junction changes both arm interiors while preserving both exact tips;
- dragging objective A changes only arm A tip semantics;
- one drag creates one history command;
- undo restores the authored control;
- committed Source contains `arrow.pincer`;
- fill/line Layers return actual rendered features;
- style reload restores geometry and handles;
- the all-arrow visibility matrix expands to nine public Arrow types;
- the existing 107 Node and 15 Chromium regressions remain green.

Final implementation counts must be recorded after tests are added; this design does not invent a fixed future count.

## 16. Public API target

```text
PINCER_ARROW_TYPE = "arrow.pincer"
PincerArrowParameters
ResolvedPincerArrowParameters
DEFAULT_PINCER_ARROW_PARAMETERS
resolvePincerArrowParameters()
buildPincerArrowFrame()
buildPincerArrowRing()
pincerArrowDefinition
```

Target Definition version:

```text
1.0.0
```

Target workspace baseline after implementation:

```text
0.0.13
```

The version bump occurs only in the implementation slice, not in this design-only milestone.

## 17. Scope exclusions

Milestone 006A does not implement:

- pincer geometry or a public Definition;
- a Playground selector or sample;
- a four-control compatibility shortcut;
- hidden objective mirroring;
- hidden junction derivation;
- conversion from `arrow.double` by relabeling;
- independent per-head style parameters;
- more than two arms or heads;
- committed point insertion/removal;
- parameter handles;
- snapping or constraints;
- route, corridor, squad-combat or other new symbols;
- Store/History transaction redesign.

## 18. Implementation order after design approval

1. add a clean-room algorithm record at `docs/algorithms/arrow-pincer.md`;
2. add independent parameter resolution and validation;
3. implement pure `PincerArrowFrame`;
4. implement paired arm centerlines and head frames;
5. implement the exact junction and one coherent ring;
6. add topology, pairing, invariance and golden tests;
7. add Definition/Registry/PlotJSON coverage;
8. add generic five-click interaction tests;
9. add the ninth Playground option and sample;
10. expand Chromium visibility and edit coverage;
11. update README, AGENTS and handover;
12. merge only after Node 20.19/22, handover and Chromium are green.

## 19. Design review checklist

Implementation remains blocked until review accepts all of the following:

- exactly five authored controls;
- positional roles `tail A, tail B, objective A, objective B, junction`;
- explicit A-to-A and B-to-B arm pairing;
- simultaneous whole-arm swap invariance only;
- fixed-five fifth-click completion;
- exact junction retained in PlotJSON and on the inner boundary;
- one coherent Polygon with no holes;
- no `arrow.double` alias or `DoubleArrowFrame` reuse;
- fail-closed topology and completion behavior;
- version-1.0 migration boundaries.
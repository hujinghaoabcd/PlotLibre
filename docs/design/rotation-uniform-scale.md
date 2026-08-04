# Milestone 007C — Rotation and Positive Uniform Scale Design

Status: design freeze candidate. Runtime is prohibited on `agent/007c-rotation-scale-design`.

Base:

```text
main:               349a09160ac2e17883e2270123d371c164ef28c2
workspace:          0.0.22
public symbols:     19
Node tests:         264
Chromium tests:     32
MapLibre Sources:   4
MapLibre Layers:    10
007B-P:             merged through PR #45/#46
```

## 1. Scope

007C adds two whole-selection transforms over canonical authored controls:

```text
rotation
positive uniform scale
```

The complete selected set uses one shared local-metre frame, one fixed pivot, one transient preview and one atomic `BatchEditCommand` on successful completion.

Included:

- deterministic selection-level pivot;
- local-metre clockwise rotation;
- positive uniform scale in `[0.01, 100]`;
- engine-independent transform frame and pure feature transforms;
- explicit one-shot rotate and scale modes;
- DOM/SVG transform frame and handles;
- cumulative angle tracking across ±180°;
- last-valid preview and structured rejection;
- all-member Registry generation preflight;
- exact undo/redo through existing atomic batch infrastructure;
- Node, adapter and Chromium acceptance plans.

Excluded:

- reflection or negative scale;
- non-uniform x/y scale;
- skew;
- pivot dragging or persisted custom pivot;
- rotation/scale snapping;
- numeric transform fields;
- touch-specific transform gestures;
- groups, locks, visibility or z-order;
- PlotJSON schema changes;
- Definition parameter-transform hooks;
- new public symbols.

## 2. Canonical-state invariant

007C transforms only authored control coordinates.

It must not directly edit or persist:

```text
rendered LineString/Polygon vertices
samples
selection or transform overlays
local projection frames
pivot
angle/scale gesture state
MapLibre screen coordinates
```

On completion each changed feature preserves:

```text
id
plotType
parameters
style
metadata
```

and receives exactly:

```text
controlPoints = transformed authored controls
revision = original revision + 1
```

Selection membership and Primary remain unchanged after execute, undo and redo.

## 3. Parameter policy

Version 1 does not transform Definition parameters.

This is deliberate because the current catalog includes relative parameters and absolute ground limits such as `minimumWidthMeters` and `maximumWidthMeters`. Scaling authored controls can therefore change path length while an absolute cap remains unchanged.

Binding rule:

```text
parameters/style/metadata are byte-for-byte semantic copies
Registry.generate decides whether the transformed candidate is valid
```

007C does **not** promise strict geometric similarity for a Definition whose absolute parameter clamp becomes active. A future pure, versioned `transformParameters` hook requires its own design and migration review. Hidden parameter-name heuristics are prohibited.

## 4. Supported coordinate domain

Version 1 is local-metre only.

Before a transform mode becomes armed, collect all selected authored controls and reject when:

- selection is empty;
- a selected Store id is missing;
- a coordinate is non-finite or outside WGS84 latitude bounds;
- the longitude set cannot form one unambiguous non-antimeridian local interval;
- absolute latitude or total extent exceeds the existing local-coordinate policy;
- local projection or inverse projection is non-finite;
- no finite transform frame can be derived.

The runtime must share one explicit local-coordinate policy with translation. It must not silently choose per-feature frames, geodesic rotation or fallback planar degrees.

## 5. Order-independent local frame

Input order, selection acquisition order and feature order must not change the pivot or transformed coordinates.

Frame derivation:

1. flatten every authored control from the selected features;
2. validate WGS84 and one non-antimeridian longitude interval;
3. derive an order-independent geographic seed from the interval midpoint and latitude range midpoint;
4. create one local projection at that seed;
5. project every authored control to local metres;
6. compute the local authored-control axis-aligned bounds;
7. define the pivot as the bounds center;
8. inverse-project the pivot only for adapter presentation.

Local frame:

```ts
interface SelectionTransformFrame {
  readonly origin: Position;
  readonly pivotMeters: { readonly x: number; readonly y: number };
  readonly pivot: Position;
  readonly boundsMeters: {
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
  };
}
```

The frame is transient and recomputed at every explicit-mode start. It is never serialized.

## 6. Pivot

The fixed pivot is the center of the complete selection-level authored-control bounding box in the shared local frame:

```text
pivotX = (minX + maxX) / 2
pivotY = (minY + maxY) / 2
```

It is not:

- the Primary feature center;
- a rendered geometry centroid;
- an average weighted by feature or sample count;
- a screen-space bounds center;
- a persisted user object.

The pivot remains fixed for the whole gesture, including rejected movement and retry.

A selection in which every authored control is coincident produces a degenerate transform frame. Rotation and scale modes reject arming with `SELECTION_TRANSFORM_FRAME_DEGENERATE`; translation remains independent.

## 7. Rotation mathematics

Local axes are:

```text
+x east
+y north
```

User-positive angle is clockwise. For a positive clockwise angle `θ` in radians around pivot `(px, py)`:

```text
dx = x - px
dy = y - py

x' = px + cos(θ) * dx + sin(θ) * dy
y' = py - sin(θ) * dx + cos(θ) * dy
```

Properties:

- `θ = 0` is a no-op;
- `θ = 90°` maps north of pivot to east of pivot;
- distances to pivot are preserved within numeric tolerance;
- feature order does not affect output;
- every selected feature uses the same pivot and angle.

Preview reporting normalizes angle to:

```text
(-180°, 180°]
```

The active session must also keep an unwrapped cumulative angle. It accumulates signed successive pointer-vector deltas so dragging through ±180° does not jump by approximately 360°.

No angle snapping exists in 007C.

## 8. Rotation pointer mapping

The adapter captures pointer positions through `map.unproject()` and converts them into the fixed local frame.

At pointerdown:

```text
startVector = local(pointerStart) - pivotMeters
```

At pointermove:

```text
currentVector = local(pointerCurrent) - pivotMeters
increment = signed clockwise angle(previousVector, currentVector)
cumulativeAngle += increment
```

Requirements:

- projected/unprojected values must be finite;
- the start vector must have non-zero local length and at least a 4 CSS-pixel screen distance from the projected pivot;
- a current vector that collapses to the pivot rejects that preview but preserves the last valid preview;
- map bearing and pitch do not change the canonical local-metre transform definition;
- screen movement remains an adapter input, never canonical state.

## 9. Positive uniform scale mathematics

Scale factor is positive and uniform:

```text
0.01 <= scaleFactor <= 100
```

For factor `s` around pivot `(px, py)`:

```text
x' = px + s * (x - px)
y' = py + s * (y - py)
```

The pointer-derived factor is:

```text
s = distance(local(pointerCurrent), pivotMeters)
  / distance(local(pointerStart), pivotMeters)
```

Binding rules:

- start distance must be finite and non-zero;
- factor outside `[0.01, 100]` rejects; it is not silently clamped;
- crossing the pivot does not create reflection because factor uses positive radial distance;
- all selected authored controls use the same factor;
- screen-size style values are unchanged;
- parameters remain unchanged under Section 3;
- no scale snapping exists in 007C.

## 10. No-op thresholds

A completed gesture creates no command when:

```text
abs(cumulativeAngleRadians) <= 1e-9
abs(scaleFactor - 1) <= 1e-9
```

The runtime must compare transformed authored coordinates against originals as a final safeguard. If no feature changes effectively, restore ordinary selection rendering and exit without Store or History mutation.

## 11. Pure engine-independent API direction

Required interaction package direction:

```ts
deriveSelectionTransformFrame(features, policy)
rotatePlotFeaturesLocal(features, frame, clockwiseRadians)
scalePlotFeaturesLocal(features, frame, scaleFactor)
```

Candidate session types:

```ts
type SelectionTransformKind = "rotate" | "scale";
type SelectionTransformStatus = "idle" | "armed" | "active" | "rejected";

interface SelectionTransformSnapshot {
  readonly status: SelectionTransformStatus;
  readonly kind?: SelectionTransformKind;
  readonly selectedIds: readonly string[];
  readonly pivot?: Position;
  readonly clockwiseDegrees?: number;
  readonly scaleFactor?: number;
  readonly rejection?: SelectionTransformRejection;
  readonly revision: number;
}
```

The pure layer must not depend on MapLibre, DOM, mouse events or screen pixels.

## 12. Explicit one-shot modes

007C transform entry is explicit:

```text
start rotation mode
start positive uniform scale mode
```

Candidate public API:

```text
plot.selectionTransform
plot.selectionTransformSnapshot
plot.selectionTransformRejection
plot.startSelectionRotation()
plot.startSelectionScale()
plot.cancelSelectionTransform()
```

Mode behavior:

- starting one transform mode cancels region mode without selection mutation;
- starting box/lasso mode cancels transform mode without selection mutation;
- mode start derives and freezes the transform frame;
- Primary semantic handles/guides are hidden while transform mode is armed or active;
- selection overlays remain visible;
- successful completion exits to idle;
- invalid pointerup preserves selection, exposes rejection and leaves the explicit mode armed for direct retry;
- explicit cancel exits to idle and restores ordinary Primary handles/guides.

007C does not infer rotation or scale from ordinary selected-body dragging.

## 13. Transform overlay and handles

Transform presentation uses one absolutely positioned DOM/SVG overlay attached to the map container. It adds no MapLibre Source or Layer.

Overlay contents:

- projected local-frame quadrilateral;
- projected pivot marker;
- one scale handle at the projected local `maxX/maxY` corner;
- one rotation handle connected by a guide from the visual top-edge midpoint;
- transient numeric label for clockwise degrees or scale factor.

Presentation rules:

```text
CSS-pixel coordinates
pointer-events:none on guides
interactive pointer target only on active-mode handle
aria-hidden for decorative paths
removed on mode exit/destroy
recomputed on camera render while armed and not dragging
```

Rotation handle position is a 28 CSS-pixel visual offset away from the pivot side of the projected top-edge midpoint. The offset is visual only. On pointerdown, `map.unproject()` converts its actual screen position into the canonical local start vector.

For a frame whose projected width or height is below 24 CSS pixels, visual bounds may expand to a 24-pixel minimum for usable handles. Visual expansion must not change canonical pivot, local bounds or transformed controls.

## 14. Gesture ownership

Priority:

```text
active drawing
> authored-handle drag
> active selection transform
> active region gesture
> armed selection-transform handle
> armed explicit region mode
> neutral Shift-empty box
> selected-body translation
> click selection
> camera gesture
```

Rules:

- a transform starts only from its explicit active-mode handle;
- pointerdown outside the transform handle cancels the explicit mode, then the event is allowed to follow normal selection/camera behavior only on the next event; it must not both cancel and start another gesture;
- body translation is disabled while transform mode is armed;
- region and transform gestures cannot be active simultaneously;
- authored semantic handles retain priority before explicit transform mode is entered;
- modifier keys have no transform meaning in 007C;
- MapLibre dragPan is disabled only during the active transform drag and restored exactly once.

## 15. Preview, preflight and commit

At every valid pointer movement:

```text
original selected features
→ pure local transform of authored controls
→ create candidate revision = original + 1
→ Registry.canonicalize every candidate
→ Registry.generate every candidate
→ all valid: render complete transient preview
→ any failure: preserve last-valid complete preview + rejection
```

Partial preview and partial commit are prohibited.

On valid pointerup with effective movement:

```text
one BatchEditCommand
execute.replace = complete transformed selection
undo.replace = exact originals
afterSelection = beforeSelection
orderedIds = unchanged document order
```

Undo restores exact original feature values, revisions, Store order, selection order and Primary. Redo restores exact captured transformed values and revisions; it does not recompute the transform.

## 16. Rejection codes

Stable initial codes:

```text
SELECTION_TRANSFORM_SELECTION_EMPTY
SELECTION_TRANSFORM_FEATURE_MISSING
SELECTION_TRANSFORM_COORDINATE_FRAME_UNSUPPORTED
SELECTION_TRANSFORM_FRAME_DEGENERATE
SELECTION_TRANSFORM_POINTER_INVALID
SELECTION_TRANSFORM_POINTER_RADIUS_TOO_SMALL
SELECTION_TRANSFORM_SCALE_OUT_OF_RANGE
SELECTION_TRANSFORM_CANDIDATE_GENERATION_FAILED
SELECTION_TRANSFORM_TRANSACTION_INVALID
```

Rejection includes all affected feature ids when applicable. A rejected preview never enters Store or History.

## 17. Lifecycle cancellation

Cancel active or armed transform without Store/History mutation on:

```text
Escape
pointercancel
unexpected lost pointer capture
style.load
resize
camera movement start during active drag
Store change
external selection revision change
draw/import/clear/undo/redo
destroy
```

Camera render while merely armed may reproject the overlay. Camera movement while actively dragging cancels to avoid mixing a changing camera transform with one pointer gesture.

Intentional `releasePointerCapture()` may emit `lostpointercapture`; once owned pointer state is cleared, that event must not erase a newly created rejected state.

## 18. Renderer boundary

007C adds no geographic Source or Layer. The baseline remains:

```text
4 Sources
10 Layers
```

The transformed feature preview may reuse the existing transient selection/draft rendering path, but transform frame, pivot, handles and labels remain DOM/SVG UI.

Style reload rebuilds committed, selection, draft and semantic-handle resources from canonical state, while active transform mode is cancelled.

## 19. Test matrix

### Pure math

- order-independent frame and pivot;
- clockwise 90°/180°/270° cardinal fixtures;
- distance preservation under rotation;
- scale factors `0.01`, `1`, `100`;
- factor below/above range rejection;
- no reflection after pointer crosses pivot;
- angle unwrapping across ±180°;
- no-op thresholds;
- valid WGS84 output;
- antimeridian/high-latitude/large-extent rejection;
- all properties except controls/revision preserved.

### Registry and commands

- all 19 public Definitions rotate through Registry preflight;
- all 19 public Definitions scale where generated candidates remain valid;
- absolute parameter limits remain unchanged and documented;
- one invalid member rejects complete preview/commit;
- one transform creates one BatchEditCommand;
- exact revision +1, undo and redo;
- Store/document and selection order unchanged;
- no History entry for no-op/rejection/cancel.

### MapLibre adapter

- explicit mode entry and mutual exclusion with box/lasso;
- only active transform handle begins gesture;
- DOM/SVG overlay and minimum visual frame;
- projected pivot/frame update while armed;
- dragPan and pointer capture restore exactly once;
- camera/style/resize/Store/selection lifecycle cancellation;
- invalid scale or pointer radius leaves retry armed;
- successful completion exits mode;
- Primary handles hide/restore correctly.

### Chromium

- rotate a multi-selection clockwise and undo/redo exact controls;
- uniformly scale a mixed selection and retain parameters/style/metadata;
- rejected out-of-range scale changes nothing and retries;
- region-select → rotate/scale → delete → undo remains coherent;
- all historical 32 flows remain green.

## 20. Performance boundary

Transform cost scales with selected feature count and generated geometry complexity. Runtime work must add reproducible fixtures for at least:

```text
1
100
1,000 selected features
```

Record candidate generation, total preview preparation, commit preparation and memory observations. Do not add a latency SLA on the design branch.

## 21. Clean-room references

Fixed references remain:

```text
Terra Draw@26d7ec91f071ab5d2bdeab774d14763746cd798b — MIT
MapLibre-Geoman@b177748cac826fc820ff7ea068186f8eb6e0fc3c — MIT
Mapbox GL Draw@cb0ca464872d8468f0b912a2321f2e0503718c52 — ISC-style
MapLibre GL JS@v6.0.0 — BSD-3-Clause
```

Observed only public mode separation, transform-handle presentation, cancellation and event behavior. Code reuse: `none`.

## 22. Runtime implementation order

After this design is merged and post-merge state is synchronized, create a new runtime branch from final `main`:

1. shared local frame and pure rotation/scale functions;
2. engine-independent transform session and rejections;
3. all-Definition Registry smoke fixtures;
4. MapLibre explicit-mode controller;
5. DOM/SVG frame and handles;
6. preview/commit integration with BatchEditCommand;
7. public API and Playground controls;
8. Chromium flows and measured transform benchmark;
9. immutable runtime handover and exact-head merge.

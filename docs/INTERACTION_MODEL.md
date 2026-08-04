# PlotLibre Interaction Model

## 1. Boundary

```text
core
  ↑
interaction
  ↑
maplibre
  ↑
MapLibre GL JS / DOM
```

Interaction owns drawing sessions, ordered selection, atomic batch commands, local transforms and screen-region algorithms. MapLibre owns browser events, map projection/unprojection, rendered queries, pointer/camera lifecycle and derived overlays. Core never depends on DOM or MapLibre.

## 2. Canonical state

```text
PlotDefinition + authored controls + parameters + style + metadata
```

Generated geometry, local frames, pivots, selection/region/transform overlays, previews and guides are derived. One successful document gesture creates one command over canonical state.

## 3. Existing editing

- ordered selection with Primary-last semantics;
- click replace/add/toggle/subtract;
- atomic `PlotStore.applyTransaction()`;
- exact `BatchEditCommand` execute/undo/redo;
- batch delete;
- whole-selection local-metre translation;
- screen-space box/lasso selection;
- DOM/SVG region overlay;
- 4 MapLibre Sources / 10 Layers.

Selection and region gestures remain outside PlotJSON and History.

## 4. 007C transform state

Candidate engine-independent state:

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

Transform state is transient and excluded from PlotJSON, Store and History.

## 5. Shared local frame

At explicit-mode start:

```text
selected authored controls
→ validate one supported local domain
→ order-independent geographic seed
→ one local projection
→ local authored-control AABB
→ fixed AABB-center pivot
```

The pivot is shared by all selected features and fixed for the gesture. It is not a screen bounds center or rendered centroid.

## 6. Rotation

User-positive rotation is clockwise in local east/north axes:

```text
x' = px + cosθ(x-px) + sinθ(y-py)
y' = py - sinθ(x-px) + cosθ(y-py)
```

The adapter uses `map.unproject()` to convert pointer positions into the fixed local frame. Successive signed vector deltas are accumulated so crossing ±180° does not jump. Display angle normalizes to `(-180°,180°]`.

## 7. Positive uniform scale

```text
k = current local radius / start local radius
x' = px + k(x-px)
y' = py + k(y-py)
0.01 <= k <= 100
```

Out-of-range factors reject instead of clamping. Pointer crossing pivot cannot reflect because `k` is positive radial distance.

## 8. Parameter boundary

007C v1 transforms authored controls only. Parameters, style and metadata remain unchanged.

Absolute ground caps such as `minimumWidthMeters` and `maximumWidthMeters` can prevent strict rendered similarity after scale. Registry generation remains authoritative. Parameter-transform hooks and heuristics are deferred.

## 9. Explicit modes

Candidate API:

```text
plot.selectionTransform
plot.selectionTransformSnapshot
plot.selectionTransformRejection
plot.startSelectionRotation()
plot.startSelectionScale()
plot.cancelSelectionTransform()
```

- transform modes are explicit one-shot modes;
- starting transform cancels region mode without selection mutation;
- starting region mode cancels transform mode;
- Primary handles/guides hide while transform is armed/active;
- selection overlays remain;
- success exits;
- invalid completion remains armed for retry;
- cancel restores ordinary selection presentation.

## 10. Transform overlay

Use an absolutely positioned DOM/SVG overlay; add no Source or Layer.

Contents:

```text
projected local-frame quadrilateral
pivot marker
scale handle at projected maxX/maxY corner
rotation handle 28 CSS px outside visual top edge
angle or factor label
```

A 24 CSS-pixel minimum visual frame is allowed for usability but cannot alter canonical pivot or transform math.

## 11. Gesture priority

```text
active drawing
> authored-handle drag
> active selection transform
> active region gesture
> armed transform handle
> armed region mode
> neutral Shift-empty box
> selected-body translation
> click selection
> camera gesture
```

Transform begins only from the active explicit-mode handle. Body translation is disabled while transform mode is armed. Region and transform cannot be active together. Modifiers have no 007C transform meaning.

## 12. Preview and atomic commit

```text
original selected features
→ pure authored-control transform
→ revision +1 candidates
→ canonicalize every candidate
→ Registry.generate every candidate
→ complete success: render complete preview
→ any failure: preserve last-valid complete preview + rejection
```

Partial preview/commit is prohibited.

Valid effective pointerup:

```text
one BatchEditCommand
execute.replace = changed transformed features
undo.replace = exact originals
document order unchanged
selection snapshot unchanged
```

Undo/redo replay exact captured revisions and controls. No command for no-op, rejection or cancel.

## 13. Rejections

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

## 14. Lifecycle

Cancel without mutation on Escape, pointercancel, unexpected lost capture, style load, resize, camera movement during active drag, Store change, external selection revision, document lifecycle operation or destroy.

While armed but not dragging, camera render may reproject the overlay. DragPan is disabled only during active transform and restored once. Intentional pointer release cannot let `lostpointercapture` erase a newly created rejected state.

## 15. Current evidence

```text
main:              349a09160ac2e17883e2270123d371c164ef28c2
workspace:         0.0.22
Node tests:        264
Chromium tests:    32
Sources/Layers:    4 / 10
007B-P:            PR #45/#46 merged
current branch:    agent/007c-rotation-scale-design
runtime:           prohibited
```

Authoritative 007C records:

```text
docs/design/rotation-uniform-scale.md
docs/algorithms/selection-local-transform.md
```

## 16. Runtime acceptance direction

- pure frame/rotation/scale math and angle unwrap;
- WGS84/local-frame rejection;
- all 19 Definitions Registry smoke;
- parameter/property preservation;
- all-member failure atomicity;
- exact BatchEditCommand undo/redo;
- explicit DOM/SVG handles and mode exclusion;
- multi-selection rotate and scale Chromium flows;
- region-select → transform → delete → undo;
- measured `1/100/1,000` selected-feature transform fixtures;
- all historical 264 Node / 32 Chromium regressions.

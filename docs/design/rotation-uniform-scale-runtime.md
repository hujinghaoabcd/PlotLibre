# Milestone 007C — Rotation and Positive Uniform Scale Runtime

Status: runtime implementation on Draft PR #49.  
Frozen design authority: `docs/design/rotation-uniform-scale.md`.  
Algorithm authority: `docs/algorithms/selection-local-transform.md`.

This document records how the frozen 007C contract is implemented. It does not change the design boundary.

## 1. Runtime layers

```text
@plotlibre/interaction
  selection-local-transform.ts
  selection-transform-session.ts
  selection-transform-command.ts

@plotlibre/maplibre
  selection-transform-interaction.ts
  selection-transform-overlay.ts
  plotlibre.ts public facade

@plotlibre/playground
  selection-transform-controls.ts
  selection-transform.spec.ts
```

The interaction package owns canonical frame derivation, pure authored-control transforms, session state, Registry preflight and atomic-command construction. The MapLibre package owns screen projection, pointer normalization, gesture ownership, DOM/SVG presentation and lifecycle cancellation. Playground only invokes the public facade and reports state.

No DOM, MapLibre object or screen coordinate enters canonical feature state.

## 2. Pure authored-control transform

The complete ordered selection is flattened into one order-independent local-metre frame. The fixed pivot is the center of the authored-control local AABB.

Public pure functions:

```ts
deriveSelectionTransformFrame(features, policy)
rotatePlotFeaturesLocal(features, frame, clockwiseRadians)
scalePlotFeaturesLocal(features, frame, scaleFactor)
```

Rotation uses positive clockwise radians. Scale is positive and uniform with the closed accepted range `[0.01, 100]`. Every candidate preserves:

```text
id
plotType
definitionVersion
parameters
style
metadata
```

Only authored controls change, and each effectively changed feature receives exact `revision + 1`.

Unsupported coordinate frames, non-finite output and degenerate selections fail closed.

## 3. Session and last-valid preview

`SelectionTransformSession` freezes the frame and originals at explicit-mode start. Pointer values are converted to the same local frame.

Rotation accumulates successive signed clockwise deltas instead of subtracting two normalized angles, so crossing ±180° remains continuous. Scale uses positive radial distance, so crossing the pivot cannot reflect.

At each valid move:

```text
originals
→ pure transform
→ revision +1 candidates
→ Registry.canonicalize all
→ Registry.generate all
→ replace complete last-valid preview
```

If one member fails, the session exposes a structured rejection and retains the previous complete preview. Partial preview is prohibited. Invalid pointerup remains in explicit mode for direct retry.

No-op thresholds are checked both mathematically and against effective authored-control changes. No-op completion creates no command.

## 4. Atomic commit

`createSelectionTransformCommand()` validates the captured Store features and selection snapshot immediately before command creation. Missing, changed or reordered selected state rejects rather than committing stale candidates.

A valid effective completion creates one `BatchEditCommand`:

```text
execute.replace = complete transformed selection
undo.replace = exact originals
beforeSelection = captured selection
afterSelection = captured selection
document order = unchanged
```

Execute, undo and redo use exact captured values; they never recompute the transform. Preview, rejection, cancel and no-op do not enter Store or History.

## 5. MapLibre controller

`MapLibreSelectionTransformInteraction` provides explicit one-shot modes:

```ts
plot.startSelectionRotation()
plot.startSelectionScale()
plot.cancelSelectionTransform()
```

Public state:

```ts
plot.selectionTransform
plot.selectionTransformSnapshot
plot.selectionTransformRejection
```

Starting a transform cancels drawing, region selection and selected-body translation. Starting drawing or region selection cancels transform mode. While armed or active, semantic Primary handles are hidden and the ordered selection overlay remains visible.

The transform controller is registered before region/body/general pointer listeners so an explicit transform handle owns its event. Pointerdown outside the handle consumes one event and cancels mode; it cannot simultaneously start another gesture.

MapLibre `dragPan` is disabled only during an active transform drag and restored exactly once.

## 6. DOM/SVG overlay

The overlay is derived browser UI and adds no MapLibre Source or Layer. The renderer baseline remains four Sources and ten Layers.

Overlay contents:

- projected local-frame quadrilateral;
- pivot marker;
- scale handle at the visual maximum corner;
- rotation guide and handle with a 28 CSS-pixel visual offset;
- transient degree/factor label;
- rejected-state presentation.

For tiny selections, the visual frame expands around the projected canonical pivot until each edge is at least 24 CSS pixels. This expansion changes only handle presentation. The canonical local frame, pivot and transformed controls remain unchanged.

A gesture start less than four CSS pixels from the projected pivot rejects with:

```text
SELECTION_TRANSFORM_POINTER_RADIUS_TOO_SMALL
```

The controller isolates the rejected pointer id until pointerup/cancel so a failed screen-radius check cannot accidentally advance the engine-independent session.

## 7. Lifecycle

The controller cancels without mutation on:

```text
Escape
pointercancel
unexpected lost pointer capture
style.load
resize
camera movement during active drag
Store mutation
external selection revision
draw / region / import / clear / undo / redo
destroy
```

Camera render while merely armed reprojects the overlay. Camera movement during active drag cancels because one gesture cannot mix two camera transforms.

## 8. Stable rejection surface

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

Rejection preserves selection and canonical Store state. Where a valid prior preview exists, it remains visible until retry or cancel.

## 9. Validation coverage

Node coverage includes:

- frame order invariance and fixed AABB-center pivot;
- clockwise cardinal rotation and angle unwrapping;
- positive scale boundaries and no reflection;
- no-op and unsupported-frame policies;
- session retry and last-valid preview;
- stale Store/selection command rejection;
- exact document/selection/Primary/undo/redo behavior;
- all 19 public Definitions through complete rotation Registry preflight;
- all 19 public Definitions through a modest positive scale smoke;
- unchanged parameters/style/metadata;
- public `PlotLibre` facade and mode mutual exclusion;
- DOM-frame adapter lifecycle;
- four-pixel start-radius rejection;
- 24-pixel minimum visual frame.

Chromium coverage uses actual DOM handles for complete multi-selection rotation, exact undo/redo, rejected scale with unchanged Store, and direct retry in the same explicit mode.

Performance coverage is recorded in:

```text
docs/performance/selection-transform-benchmark.md
```

## 10. Preserved exclusions

The runtime still excludes reflection, negative scale, non-uniform scale, skew, snapping, pivot dragging, numeric transform fields, touch-specific transforms, groups/locks/visibility/z-order, new symbols, PlotJSON changes and hidden parameter-name heuristics.

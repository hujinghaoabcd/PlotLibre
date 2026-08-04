# PlotLibre Development Contract

This file defines mandatory rules for every developer, coding agent and future conversation.

## 1. Product model

Canonical feature state:

```text
PlotDefinition + authored controlPoints + parameters + style + metadata
```

Rendered geometry, samples, selection/transform overlays, local frames, pivots, screen regions and previews are derived. They must not replace authored state or enter PlotJSON.

## 2. Dependency direction

```text
core <- geometry <- symbols
core <- interaction
core + interaction <- maplibre
public packages <- playground / wrappers
```

Core/geometry cannot depend on MapLibre or DOM. Interaction math and commands are engine-independent. MapLibre owns browser normalization, map projection and derived UI.

## 3. Current baseline

```text
main SHA:           349a09160ac2e17883e2270123d371c164ef28c2
workspace:          0.0.22
public symbols:     19 (14 Arrow + 1 Line + 4 Area)
Node baseline:      264
Chromium baseline:  32
MapLibre Sources:   4
MapLibre Layers:    10
benchmark job:      required
007A:               merged through PR #38/#39
007B:               merged through PR #40–#44
007B-P:             merged through PR #45/#46
```

Current branch:

```text
agent/007c-rotation-scale-design
scope: rotation + positive uniform scale design only
runtime: prohibited
```

## 4. Selection and atomic editing

Selection remains transient, ordered and Primary-last. It is excluded from PlotJSON and feature revision.

`PlotStore.applyTransaction()` commits one staged batch. `BatchEditCommand` owns exact before/after feature values, document order and selection snapshots. Batch delete and local translation remain unchanged.

Every completed whole-selection transform must be one `BatchEditCommand`; preview, rejection and cancel must not enter Store or History.

## 5. 007C canonical transform boundary

007C transforms authored control coordinates only.

Preserve:

```text
id
plotType
parameters
style
metadata
selection membership/order/Primary
Store document order
```

For each effectively changed feature:

```text
revision = original revision + 1
```

Rendered vertices, samples, frame, pivot, angle, factor and screen handles remain derived.

## 6. Shared local frame and pivot

Flatten every selected authored control, validate one local coordinate domain and derive one order-independent geographic seed. Project all controls into one local-metre frame.

Pivot:

```text
px = (minLocalX + maxLocalX) / 2
py = (minLocalY + maxLocalY) / 2
```

This is the complete selection authored-control AABB center. It is not the Primary center, rendered centroid, arithmetic sample centroid or screen-bounds center. It is transient and fixed for the gesture.

Empty/missing/invalid/antimeridian/high-latitude/large-extent/degenerate selections reject before arming.

## 7. Clockwise rotation

Local axes are east/north. User-positive angle is clockwise:

```text
dx = x - px
dy = y - py
x' = px + cosθ*dx + sinθ*dy
y' = py - sinθ*dx + cosθ*dy
```

Pointer positions are `map.unproject()`-ed into the fixed local frame. The session accumulates successive signed pointer-vector deltas so ±180° crossings do not jump. UI display normalizes to `(-180°,180°]`; canonical state stores no angle.

No angle snapping in 007C.

## 8. Positive uniform scale

```text
k = current local radius / start local radius
x' = px + k*(x-px)
y' = py + k*(y-py)
0.01 <= k <= 100
```

Out-of-range factor rejects; do not clamp. Crossing pivot cannot reflect because `k` is radial and positive.

No reflection, negative scale, non-uniform scale, skew or scale snapping.

## 9. Parameter policy

007C v1 does not transform parameters, style or metadata.

The catalog contains relative parameters plus absolute ground caps such as `minimumWidthMeters` and `maximumWidthMeters`. Therefore authored-control scaling does not promise strict rendered similarity when an absolute cap becomes active. Registry generation is authoritative.

A future pure/versioned parameter-transform hook requires a separate design. Parameter-name heuristics are prohibited.

## 10. Pure API direction

```ts
deriveSelectionTransformFrame(features, policy)
rotatePlotFeaturesLocal(features, frame, clockwiseRadians)
scalePlotFeaturesLocal(features, frame, scaleFactor)
```

Candidate state:

```ts
type SelectionTransformKind = "rotate" | "scale";
type SelectionTransformStatus = "idle" | "armed" | "active" | "rejected";
```

The pure layer cannot read DOM, MapLibre events or CSS pixels.

## 11. Explicit one-shot modes

Candidate public API:

```text
plot.selectionTransform
plot.selectionTransformSnapshot
plot.selectionTransformRejection
plot.startSelectionRotation()
plot.startSelectionScale()
plot.cancelSelectionTransform()
```

- rotate and scale are explicit one-shot modes;
- starting transform cancels region mode without changing selection;
- starting region mode cancels transform mode;
- Primary handles/guides hide while transform mode is armed/active;
- selection overlays remain visible;
- success exits mode;
- invalid completion retains rejection and remains armed for retry;
- cancel restores ordinary selection presentation.

## 12. Overlay and handles

Use one DOM/SVG transform overlay; add no geographic Source or Layer.

Contents:

- projected local-frame quadrilateral;
- pivot marker;
- scale handle at projected local `maxX/maxY` corner;
- rotation handle 28 CSS px outside visual top edge;
- transient angle/factor label.

A visual minimum frame of 24 CSS px is allowed for usability but must not change canonical bounds/pivot/math. Transform starts only from the active explicit-mode handle.

## 13. Gesture priority

```text
active drawing
> authored-handle drag
> active selection transform
> active region gesture
> armed transform handle
> armed explicit region mode
> neutral Shift-empty box
> selected-body translation
> click selection
> camera gesture
```

Body translation is disabled while transform mode is armed. Region and transform cannot be active together. Modifiers have no transform meaning in 007C.

## 14. Preview and commit

```text
original selected features
→ pure authored-control transform
→ revision +1 candidates
→ Registry.canonicalize every candidate
→ Registry.generate every candidate
→ complete success: replace whole transient preview
→ any failure: preserve last-valid complete preview + rejection
```

Partial preview/commit is prohibited.

Valid effective pointerup:

```text
one BatchEditCommand
execute.replace = changed transformed features
undo.replace = exact originals
orderedIds unchanged
beforeSelection = afterSelection
```

Undo/redo restore exact captured revisions and values. Redo never recomputes the transform.

No command when `abs(angle)<=1e-9 rad`, `abs(k-1)<=1e-9`, or authored controls are effectively unchanged.

## 15. Rejections

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

A rejection never mutates Store/History. Include affected feature ids where applicable.

## 16. Lifecycle

Cancel without mutation on Escape, pointercancel, unexpected lost capture, style load, resize, active-drag camera movement, Store change, external selection revision, document lifecycle operation or destroy.

While only armed, camera render may reproject the overlay. Intentional pointer release must not let `lostpointercapture` erase a newly created rejected state.

## 17. Required runtime tests

Pure:

- order-independent frame/pivot;
- clockwise cardinal angles and distance preservation;
- angle unwrap;
- scale `0.01/1/100`, range rejection and no reflection;
- no-op thresholds;
- WGS84/frame failure policies;
- property preservation.

Registry/command:

- all 19 Definitions rotate;
- valid scale candidates across all Definitions;
- absolute parameters unchanged;
- one invalid member rejects all;
- exact revision, document order, selection, undo and redo.

MapLibre/Chromium:

- explicit/mutually exclusive modes;
- DOM/SVG frame and handles;
- dragPan/pointer lifecycle restoration;
- rejection retry;
- multi-select rotate/scale and undo/redo;
- region-select → transform → delete → undo;
- all historical 264/32 regressions.

## 18. Performance boundary

Runtime must measure at least `1 / 100 / 1,000` selected features and record generation, total preview preparation and memory. The design PR publishes no latency SLA.

Existing region benchmark remains observational and does not justify a persistent spatial index.

## 19. Validation gate

Every PR exact head:

```text
Node 20.19
Node 22
264 Node tests
Playground build
handover contract
region-selection benchmark job/artifact
32 Chromium E2E
zero unresolved review threads
```

Never claim a newer head passed from an older run.

## 20. Clean-room references

```text
Terra Draw@26d7ec91f071ab5d2bdeab774d14763746cd798b — MIT
MapLibre-Geoman@b177748cac826fc820ff7ea068186f8eb6e0fc3c — MIT
Mapbox GL Draw@cb0ca464872d8468f0b912a2321f2e0503718c52 — ISC-style
MapLibre GL JS@v6.0.0 — BSD-3-Clause
code reuse: none
```

## 21. Merge discipline and continuation

- design/runtime/finalization use separate branches;
- Draft until exact-head green;
- zero threads, Ready, squash with expected SHA, verify main;
- after design merge, perform documentation-only post-merge synchronization;
- create runtime only from final synchronized main.

007C design branch prohibits runtime, reflection, non-uniform scale, groups/locks/visibility/z-order, snapping, touch transforms, new symbols and PlotJSON shortcuts.

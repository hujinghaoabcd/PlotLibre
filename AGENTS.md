# PlotLibre Development Contract

This file defines mandatory rules for every developer, coding agent and future conversation.

## 1. Product model

Canonical feature state:

```text
PlotDefinition + authored controlPoints + parameters + style + metadata
```

Rendered geometry, samples, local frames, pivots, selection/region/transform overlays and previews are derived. They must not replace authored state or enter PlotJSON.

## 2. Dependency direction

```text
core <- geometry <- symbols
core <- interaction
core + interaction <- maplibre
public packages <- playground / wrappers
```

Core/geometry cannot depend on MapLibre or DOM. Interaction math and commands remain engine-independent. MapLibre owns browser normalization, map projection and derived UI.

## 3. Current baseline

```text
main SHA:           ace18bcd58466d2eadd2b647cb0e2b67a7b546b2
workspace:          0.0.22
public symbols:     19 (14 Arrow + 1 Line + 4 Area)
Node baseline:      264
Chromium baseline:  32
MapLibre Sources:   4
MapLibre Layers:    10
benchmark job:      required
007A:               merged PR #38/#39
007B:               merged PR #40–#44
007B-P:             merged PR #45/#46
007C design:        merged PR #47
```

Current branch:

```text
agent/007c-design-post-merge-finalization
scope: actual PR #47 merge-state synchronization only
runtime: prohibited
```

PR #47 evidence:

```text
validated head:     a19444d1c76cad266fe84e3e454afa6d146c7e4d
CI:                 #468 / 30936185645
Node tests:         264 passed on 20.19 and 22
benchmark artifact: 8903197454
Chromium:           32 passed
threads:            0
squash SHA:         ace18bcd58466d2eadd2b647cb0e2b67a7b546b2
```

Never use old-head evidence for a newer head.

## 4. Selection and atomic editing

Selection is transient, ordered and Primary-last. It is excluded from PlotJSON and feature revision.

`PlotStore.applyTransaction()` commits one staged batch. `BatchEditCommand` owns exact before/after features, document order and selection. Batch delete and local translation remain unchanged.

Every completed whole-selection transform must be one `BatchEditCommand`; preview, rejection and cancel must not enter Store or History.

## 5. 007C canonical boundary

Transform authored controls only. Preserve id, plotType, parameters, style, metadata, Store order, selection order and Primary. Each effectively changed feature gets exact `revision + 1`.

Frame, pivot, angle, factor, handles and preview are transient.

## 6. Shared local frame and pivot

```text
all selected authored controls
→ validate one local coordinate domain
→ order-independent geographic seed
→ one local projection
→ local authored-control AABB
→ fixed AABB-center pivot
```

Pivot is not Primary center, rendered centroid or screen bounds center. Empty, missing, non-finite, antimeridian, high-latitude, large-extent or degenerate selections reject before arming.

## 7. Clockwise rotation

```text
x' = px + cosθ(x-px) + sinθ(y-py)
y' = py - sinθ(x-px) + cosθ(y-py)
```

User-positive angle is clockwise. The adapter unprojects pointer positions into the fixed local frame and accumulates successive signed vector deltas across ±180°. No snapping.

## 8. Positive uniform scale

```text
k = current local radius / start local radius
x' = px + k(x-px)
y' = py + k(y-py)
0.01 <= k <= 100
```

Out-of-range rejects rather than clamps. Crossing pivot cannot reflect. Reflection, negative scale, non-uniform scale, skew and snapping are excluded.

## 9. Parameter policy

Parameters, style and metadata remain unchanged. Existing absolute ground caps such as `minimumWidthMeters` and `maximumWidthMeters` mean authored-control scaling does not universally guarantee strict rendered similarity. Registry generation is authoritative.

Parameter-transform hooks and parameter-name heuristics are deferred.

## 10. Pure runtime order

Required runtime APIs:

```ts
deriveSelectionTransformFrame(features, policy)
rotatePlotFeaturesLocal(features, frame, clockwiseRadians)
scalePlotFeaturesLocal(features, frame, scaleFactor)
```

Implement in this order after post-merge synchronization:

1. shared frame and pure math;
2. transform session and rejections;
3. all-Definition Registry fixtures;
4. BatchEditCommand preview/commit integration;
5. MapLibre explicit controller;
6. DOM/SVG frame and handles;
7. public API and Playground;
8. Chromium flows and transform benchmark.

## 11. Explicit one-shot modes

Candidate API:

```text
plot.selectionTransform
plot.selectionTransformSnapshot
plot.selectionTransformRejection
plot.startSelectionRotation()
plot.startSelectionScale()
plot.cancelSelectionTransform()
```

Transform and region modes are mutually exclusive. Primary handles/guides hide while transform is armed/active; selection overlays remain. Success exits. Invalid completion remains armed for retry.

## 12. Overlay and gesture priority

Use one DOM/SVG overlay with projected local-frame quadrilateral, pivot, scale handle, 28 CSS-pixel rotation handle and value label. A 24-pixel minimum visual frame cannot change canonical math. Add no Source/Layer.

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

Body translation is disabled while transform mode is armed. Modifiers have no transform meaning.

## 13. Preview and commit

```text
original selection
→ pure control transform
→ revision +1 candidates
→ canonicalize every candidate
→ Registry.generate every candidate
→ complete preview or complete rejection
→ one BatchEditCommand on valid effective pointerup
```

Partial preview/commit is prohibited. Failure preserves last-valid complete preview. Undo/redo use exact captured values and never recompute.

No command for no-op, rejection or cancel.

## 14. Rejections and lifecycle

Stable codes:

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

Cancel without mutation on Escape, pointercancel, unexpected lost capture, style load, resize, active-drag camera movement, Store change, external selection revision, document lifecycle operation or destroy.

## 15. Required runtime validation

- order-independent frame and pivot;
- clockwise cardinal fixtures and angle unwrap;
- scale `0.01/1/100`, range rejection and no reflection;
- local-frame failure policies;
- all 19 Definitions Registry smoke;
- unchanged parameters/style/metadata;
- all-member failure atomicity;
- exact revision/order/selection/undo/redo;
- explicit DOM handles and lifecycle;
- multi-selection rotate/scale Chromium flows;
- region-select → transform → delete → undo;
- transform benchmark for `1/100/1,000` selected features;
- all historical 264 Node / 32 Chromium regressions.

## 16. Validation gate

Every exact head:

```text
Node 20.19
Node 22
264 Node tests
Playground build
handover contract
region benchmark job/artifact
32 Chromium E2E
zero unresolved review threads
```

## 17. Clean-room references

```text
Terra Draw@26d7ec91f071ab5d2bdeab774d14763746cd798b — MIT
MapLibre-Geoman@b177748cac826fc820ff7ea068186f8eb6e0fc3c — MIT
Mapbox GL Draw@cb0ca464872d8468f0b912a2321f2e0503718c52 — ISC-style
MapLibre GL JS@v6.0.0 — BSD-3-Clause
code reuse: none
```

## 18. Merge discipline

Design, runtime and finalization use separate branches. Keep Draft until exact-head green; resolve threads; Ready; squash with expected SHA; verify main; start new work only from latest synchronized main; never merge locally.

Runtime still excludes reflection, non-uniform scale, groups/locks/visibility/z-order, snapping, touch transforms, new symbols and PlotJSON shortcuts.

# PlotLibre Handover — Milestone 007C Rotation and Scale Design

日期：2026-08-05  
仓库：`hujinghaoabcd/PlotLibre`  
基线 `main`：`349a09160ac2e17883e2270123d371c164ef28c2`  
分支：`agent/007c-rotation-scale-design`  
范围：design only；runtime prohibited

## Current state

```text
workspace:          0.0.22
public symbols:     19 (14 Arrow + 1 Line + 4 Area)
Node tests:         264
Chromium tests:     32
MapLibre Sources:   4
MapLibre Layers:    10
benchmark job:      required
007B-P:             merged through PR #45/#46
```

## Completed in this milestone

The design freezes whole-selection local rotation and positive uniform scale before runtime.

Authoritative records：

```text
docs/design/rotation-uniform-scale.md
docs/algorithms/selection-local-transform.md
```

### Canonical boundary

- transform authored control coordinates only；
- preserve id、plotType、parameters、style and metadata；
- each effectively changed feature gets exact revision +1；
- selection order、Primary and Store document order remain unchanged；
- frame、pivot、angle、factor、handles and preview remain transient；
- one valid gesture becomes one BatchEditCommand；
- partial preview and partial commit are prohibited。

### Shared frame and pivot

```text
all selected authored controls
→ validate one local coordinate domain
→ order-independent geographic seed
→ one local projection
→ local authored-control AABB
→ fixed AABB-center pivot
```

Empty、missing、non-finite、antimeridian、high-latitude、large-extent or degenerate frames reject before arming。

### Rotation

User-positive rotation is clockwise in local east/north axes：

```text
x' = px + cosθ(x-px) + sinθ(y-py)
y' = py - sinθ(x-px) + cosθ(y-py)
```

Pointer positions are unprojected into the fixed local frame. Successive signed pointer-vector deltas accumulate across ±180° without jumps. No snapping。

### Positive uniform scale

```text
k = current local radius / start local radius
x' = px + k(x-px)
y' = py + k(y-py)
0.01 <= k <= 100
```

Out-of-range rejects instead of clamping. Crossing pivot cannot reflect. Reflection、negative scale、non-uniform scale and skew are excluded。

### Parameter policy

Version 1 does not transform parameters、style or metadata. The current catalog has relative parameters and absolute ground caps including `minimumWidthMeters` and `maximumWidthMeters`. Therefore strict derived-geometry similarity is not guaranteed if a cap activates. Registry generation is authoritative. A parameter-transform hook is deferred to a separate design。

### Explicit modes and UI

Candidate public entry：

```text
plot.startSelectionRotation()
plot.startSelectionScale()
plot.cancelSelectionTransform()
plot.selectionTransformSnapshot
```

Use one DOM/SVG overlay with projected local-frame quadrilateral、pivot、scale handle、28 CSS-pixel rotation handle and transient value label. Minimum 24-pixel visual expansion is allowed but cannot affect canonical math. No new MapLibre Source or Layer。

### Gesture ownership

```text
active drawing
> authored handle drag
> active selection transform
> active region gesture
> armed transform handle
> armed region mode
> neutral Shift-empty box
> selected-body translation
> click selection
> camera gesture
```

Transform and region modes are mutually exclusive. Body translation is disabled while transform mode is armed. Modifiers have no transform meaning。

### Preview and atomic commit

Every complete candidate set is transformed、canonicalized and Registry-generated before preview. One failure preserves the last-valid complete preview and a structured rejection. Valid effective pointerup executes one BatchEditCommand with exact originals and transformed values. Undo/redo never recompute the transform。

### Stable rejection codes

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

## Validation

This design branch must independently pass unchanged current-head gates：

```text
Node 20.19
Node 22
264 Node tests
Playground build
handover contract
region-selection benchmark job + artifact
32 Chromium tests
zero unresolved review threads
```

No runtime behavior or test count is changed by the design itself.

## Next tasks

1. open Draft design PR；
2. confirm changed files are Markdown only；
3. pass exact-head unchanged CI；
4. confirm zero review threads；
5. mark Ready and squash merge with expected head SHA；
6. verify `main` equals returned squash SHA；
7. complete documentation-only post-merge synchronization；
8. create 007C runtime branch from the final synchronized `main`；
9. implement pure frame/math before MapLibre controller and UI。

## Risks and decisions

- local-metre v1 rejects unsupported coordinate domains rather than silently using degree-space or geodesic fallback；
- pivot is authored-control AABB center, not rendered centroid；
- parameters are unchanged, so scale is canonical-control scaling rather than a universal strict-similarity guarantee；
- explicit one-shot modes avoid accidental transform/body-translation conflicts；
- DOM/SVG handles avoid geographic Source/Layer misuse；
- no runtime、reflection、non-uniform scale、snapping、groups、locks、touch transforms、new symbols or PlotJSON changes belong in this design PR；
- branch cleanup may require manual action because delete-ref is unavailable through the current connector。

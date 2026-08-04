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

Core and geometry cannot depend on MapLibre or DOM. Interaction math and commands remain engine-independent. MapLibre owns browser normalization, map projection and derived UI.

## 3. Current authority

```text
main SHA:           2b06d02ba851a9c6ae01d0db1fc503ad5f8699c0
workspace:          0.0.22
public symbols:     19 (14 Arrow + 1 Line + 4 Area)
Node baseline:      299
Chromium baseline:  34
MapLibre Sources:   4
MapLibre Layers:    10
benchmark jobs:     region selection + selection transform
007A:               merged PR #38/#39
007B:               merged PR #40–#44
007B-P:             merged PR #45/#46
007C design:        merged PR #47/#48
007C runtime:       merged PR #49
current branch:     agent/007c-runtime-post-merge-finalization
next design branch: agent/008-plotjson-migrations-design
```

PR #49 validated exact head `c9c8cadf678a0758075af76d078b2e5a5bfbd379` in CI `30943895213` / `#505`, then squash-merged as `2b06d02ba851a9c6ae01d0db1fc503ad5f8699c0` with zero unresolved review threads.

Never use old-head evidence for a newer head. Design, runtime and post-merge finalization remain separate scopes.

## 4. Selection and atomic editing

Selection is transient, ordered and Primary-last. It is excluded from PlotJSON and feature revision.

`PlotStore.applyTransaction()` commits one staged batch. `BatchEditCommand` owns exact before/after features, document order and selection. Batch delete, local translation and completed whole-selection rotation/scale each use one atomic command.

Preview, rejection, cancel and no-op must not enter Store or History.

## 5. 007C canonical boundary

Transform authored controls only. Preserve:

```text
id
plotType
definitionVersion
parameters
style
metadata
Store order
selection order
Primary
```

Each effectively changed feature receives exact `revision + 1`.

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

## 10. Runtime ownership

Engine-independent runtime in `@plotlibre/interaction`:

```ts
deriveSelectionTransformFrame(features, policy)
rotatePlotFeaturesLocal(features, frame, clockwiseRadians)
scalePlotFeaturesLocal(features, frame, scaleFactor)
SelectionTransformSession
createSelectionTransformCommand(...)
```

MapLibre runtime:

```text
MapLibreSelectionTransformInteraction
MapLibreSelectionTransformOverlay
PlotLibre public facade
```

Playground may call only the public facade. It must not duplicate transform math or commit directly to Store.

## 11. Explicit one-shot modes

Public API:

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

Use one DOM/SVG overlay with projected local-frame quadrilateral, pivot, scale handle, 28 CSS-pixel rotation handle and value label. A 24-pixel minimum visual frame cannot change canonical math. A transform gesture must start at least four CSS pixels from the projected pivot. Add no Source or Layer.

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

## 15. Required validation

- order-independent frame and pivot;
- clockwise cardinal fixtures and angle unwrap;
- scale `0.01/1/100`, range rejection and no reflection;
- local-frame failure policies;
- all 19 Definitions rotation preflight and positive-scale smoke;
- unchanged parameters/style/metadata;
- all-member failure atomicity;
- exact revision/order/selection/Primary/undo/redo;
- explicit DOM handles and lifecycle;
- four-pixel start-radius and 24-pixel visual-frame contracts;
- multi-selection rotate and scale Chromium flows;
- transform benchmark for `1/100/1,000` selected features;
- all historical regressions.

## 16. Validation gate

Every runtime-affecting exact head:

```text
Node 20.19
Node 22
299 Node tests
Playground typecheck/build
handover contract
region benchmark job/artifact
selection-transform benchmark job/artifact
34 Chromium E2E
zero unresolved review threads
```

Measured transform performance is observational only. Do not publish a latency SLA or add a persistent cache/index without a reproducible need. Authority:

```text
docs/performance/selection-transform-benchmark.md
```

## 17. Next design boundary: PlotJSON migrations

Groups, locks, visibility and z-order remain blocked until document persistence and migration semantics are frozen. The next branch is documentation/design only:

```text
agent/008-plotjson-migrations-design
```

It must define:

- current PlotJSON schema inventory and compatibility guarantees;
- schema-version versus Definition-version responsibilities;
- parse, validation and migration ordering;
- unknown field and unknown Definition behavior;
- document ordering and future group-reference semantics;
- persistence boundaries for lock, visibility and z-order;
- migration registry API and stable fail-closed errors;
- golden fixtures and a backward/forward compatibility matrix;
- implementation milestones that unblock 007D.

No migration runtime, group runtime or schema mutation belongs in the design PR.

## 18. Clean-room references

```text
Terra Draw@26d7ec91f071ab5d2bdeab774d14763746cd798b — MIT
MapLibre-Geoman@b177748cac826fc820ff7ea068186f8eb6e0fc3c — MIT
Mapbox GL Draw@cb0ca464872d8468f0b912a2321f2e0503718c52 — ISC-style
MapLibre GL JS@v6.0.0 — BSD-3-Clause
code reuse: none
```

## 19. Merge discipline

Design, runtime and finalization use separate branches. Keep runtime Draft until exact-head green; resolve threads; write immutable handover; mark Ready; squash with expected SHA; verify main; start post-merge synchronization only from latest main; never merge locally.

Current runtime excludes reflection, non-uniform scale, groups/locks/visibility/z-order, snapping, touch transforms, new symbols and PlotJSON shortcuts.

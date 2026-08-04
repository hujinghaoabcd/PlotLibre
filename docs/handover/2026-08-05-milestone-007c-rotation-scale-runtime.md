# PlotLibre Milestone 007C Runtime Handover

日期：2026-08-05  
仓库：`hujinghaoabcd/PlotLibre`  
基线 `main`：`9a1c761b3e9d1f94c944485137fb21a92bdcc786`  
分支：`agent/007c-rotation-scale-runtime`  
PR：`#49`  
工作区版本：`0.0.22`

This is the immutable runtime-scope handover. Merge-state authority must be synchronized in a separate post-merge finalization branch after PR #49 is squash-merged.

## 1. Delivered scope

Milestone 007C now implements complete ordered-selection transforms over canonical authored controls:

```text
clockwise whole-selection rotation
positive whole-selection uniform scale
```

The implementation includes:

- one order-independent shared local-metre frame;
- one fixed authored-control AABB-center pivot;
- pure rotation and positive uniform-scale functions;
- continuous clockwise angle accumulation across ±180°;
- scale range `[0.01, 100]`, rejected rather than clamped;
- all-member canonicalization and Registry generation preflight;
- complete last-valid preview and structured rejection;
- one stale-safe atomic `BatchEditCommand` per effective completion;
- exact captured undo/redo;
- MapLibre explicit one-shot controller;
- DOM/SVG frame, pivot, scale handle, rotation handle and value label;
- four CSS-pixel minimum gesture-start radius;
- 24 CSS-pixel minimum visual frame for tiny selections;
- public `PlotLibre` APIs;
- Playground controls and localized status;
- real Chromium rotation, rejection and retry flows;
- all-19-Definition Registry smoke coverage;
- independent reproducible `1/100/1,000` benchmark workflow.

## 2. Canonical boundary

Persisted feature state remains:

```text
PlotDefinition + authored controlPoints + parameters + style + metadata
```

007C changes authored controls only. It preserves:

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

Rendered geometry, local frames, pivot, angle/factor, DOM/SVG overlay and preview remain derived. No PlotJSON schema change and no MapLibre Source/Layer was added. Renderer baseline remains four Sources and ten Layers.

## 3. Runtime architecture

Engine-independent interaction layer:

```text
packages/interaction/src/selection-local-transform.ts
packages/interaction/src/selection-transform-session.ts
packages/interaction/src/selection-transform-command.ts
```

MapLibre adapter and UI:

```text
packages/maplibre/src/selection-transform-interaction.ts
packages/maplibre/src/selection-transform-overlay.ts
packages/maplibre/src/plotlibre.ts
```

Playground and browser validation:

```text
apps/playground/src/selection-transform-controls.ts
apps/playground/e2e/selection-transform.spec.ts
```

Authority documents:

```text
docs/design/rotation-uniform-scale.md
docs/design/rotation-uniform-scale-runtime.md
docs/algorithms/selection-local-transform.md
docs/performance/selection-transform-benchmark.md
```

## 4. Public API

```ts
plot.selectionTransform
plot.selectionTransformSnapshot
plot.selectionTransformRejection
plot.startSelectionRotation()
plot.startSelectionScale()
plot.cancelSelectionTransform()
```

Explicit transform and region modes are mutually exclusive. Drawing, region selection, body translation, document lifecycle operations and destroy cancel transform state without mutation. Success exits mode; invalid completion remains available for direct retry.

## 5. Atomicity and failure behavior

Every valid preview uses the complete selection:

```text
originals
→ pure authored-control transform
→ revision +1 candidates
→ canonicalize every candidate
→ Registry.generate every candidate
→ complete preview or complete rejection
```

On valid effective pointerup, `createSelectionTransformCommand()` verifies captured Store and selection state before creating one `BatchEditCommand`. Stale state rejects. Partial preview and partial commit are prohibited.

Preview, rejection, cancel and no-op create no Store mutation and no History entry. Undo/redo use exact captured values and never recompute.

Stable rejection surface:

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

## 6. Validation added

Node coverage includes:

- order-independent frame/pivot;
- clockwise cardinal rotation;
- angle unwrapping;
- scale boundaries and no reflection;
- unsupported/degenerate local frames;
- no-op behavior;
- session last-valid preview and retry;
- stale command rejection;
- exact revision/order/selection/Primary/undo/redo;
- public facade and mode mutual exclusion;
- all 19 public Definitions rotation preflight;
- all 19 public Definitions positive-scale smoke;
- unchanged parameters/style/metadata;
- DOM adapter and lifecycle;
- four-pixel gesture-start rejection;
- 24-pixel minimum visual frame.

Chromium coverage adds two real DOM-handle flows:

1. complete multi-selection rotation, Store unchanged during preview, one history entry and exact undo/redo;
2. scale to pivot rejects with `SELECTION_TRANSFORM_SCALE_OUT_OF_RANGE`, Store remains unchanged, then the same explicit mode retries successfully.

Expected final baseline after exact-head validation:

```text
Node tests:       299
Chromium tests:   34
```

## 7. Performance evidence

Implementation measurement source head:

```text
235289e9dd40851ab2484edd5c9b38e2372f36e4
```

CI and artifact:

```text
CI:        #496 / 30943132152
artifact:  8905951081
Node:      v22.23.1
CPU:       AMD EPYC 7763
```

Measured complete-selection rotation preparation:

| Selected features | Preview median | Preview p95 | Command preparation median |
|---:|---:|---:|---:|
| 1 | 0.031 ms | 0.070 ms | 0.018 ms |
| 100 | 0.949 ms | 2.216 ms | 0.674 ms |
| 1,000 | 2.333 ms | 3.640 ms | 3.156 ms |

This is a Node/CI interaction-layer microbenchmark, not browser frame time or a latency SLA. It does not measure MapLibre projection, DOM/SVG, GPU or browser painting. The measured profile does not justify a persistent transform cache or spatial index.

## 8. Important browser finding

The first Chromium run correctly returned:

```text
SELECTION_TRANSFORM_SCALE_OUT_OF_RANGE
```

when a scale handle started at a valid radius and ended on the pivot. The initial E2E assertion incorrectly expected `SELECTION_TRANSFORM_POINTER_RADIUS_TOO_SMALL`, which applies only to pointerdown within four CSS pixels of the pivot. The assertion was corrected; runtime semantics were unchanged.

## 9. Exact-head closure procedure

Before marking PR #49 Ready:

1. ensure the final documentation head passes Node 20.19 and Node 22;
2. confirm 299 Node tests;
3. confirm Playground typecheck/build and handover check;
4. confirm both benchmark jobs and artifacts;
5. confirm 34 Chromium tests;
6. confirm zero unresolved review threads;
7. update the PR body with the final exact head and CI run;
8. mark Ready without changing the head.

Do not use CI #496 as final merge evidence after documentation commits; it is benchmark evidence for the measured implementation source head only.

## 10. Post-merge work

After squash merge:

1. verify final `main` equals the returned squash SHA;
2. create a dedicated post-merge finalization branch from that exact `main`;
3. update `README.md`, `AGENTS.md`, `docs/DEVELOPMENT_PLAN.md` and `docs/handover/LATEST.md` from PR authority to merged authority;
4. record squash SHA, final main SHA, exact CI/artifacts and zero-thread state;
5. prohibit runtime changes in finalization;
6. begin the next design milestone only after finalization is merged.

## 11. Preserved exclusions

- reflection or negative scale;
- non-uniform x/y scale;
- skew;
- snapping;
- pivot dragging;
- numeric transform fields;
- touch-specific transforms;
- groups, locks, visibility and z-order;
- PlotJSON migration;
- new symbols;
- parameter-name heuristics or implicit parameter scaling.

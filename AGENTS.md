# PlotLibre Development Contract

This file defines mandatory rules for every developer, coding agent and future conversation.

## 1. Product model

PlotLibre is a semantic parametric plotting framework, not a generic GeoJSON toolbar.

Canonical feature state：

```text
PlotDefinition + authored controlPoints + parameters + style + metadata
```

Rendered geometry、samples、inferred frames、selection overlays、screen regions、transform previews and guides are derived output. They must never replace authored state or be serialized as canonical PlotJSON.

## 2. Dependency direction

```text
core <- geometry <- symbols
core <- interaction
core + interaction <- maplibre
public packages <- playground / wrappers
```

- Core cannot depend on MapLibre、DOM or screen coordinates；
- geometry cannot depend on Store、UI、events or map engines；
- interaction algorithms and commands remain engine-independent；
- MapLibre owns browser normalization、projection、rendered queries and presentation；
- Playground consumes public APIs only；
- circular dependencies are prohibited。

## 3. Current merged baseline

```text
main SHA:           2f8ea72749ecfdadbc354216d6e411e81bfecee1
workspace:          0.0.22
public symbols:     19 (14 Arrow + 1 Line + 4 Area)
Node baseline:      264
Chromium baseline:  32
MapLibre Sources:   4
MapLibre Layers:    10
007A:               merged through PR #38/#39
007B design:        merged through PR #40/#41
007B runtime:       merged through PR #42/#43
007B docs:          merged through PR #44
007B-P benchmark:   merged through PR #45
```

Current branch：

```text
agent/007b-benchmark-post-merge-finalization
scope: actual PR #45 merge-state synchronization only
runtime: prohibited
```

PR #45 evidence：

```text
validated head:     69a2c87767ea5ea2312ab101455bed06069639d0
CI:                 #464 / 30933921135
Node:               264 passed on 20.19 and 22
benchmark artifact: 8902285519
Chromium:           32 passed
threads:            0
squash SHA:         2f8ea72749ecfdadbc354216d6e411e81bfecee1
```

Never use old-head validation as evidence for a newer head.

## 4. Selection boundary

Selection is transient interaction state, not PlotJSON document state.

```ts
interface SelectionSnapshot {
  readonly selectedIds: readonly string[];
  readonly primaryId?: string;
  readonly revision: number;
}
```

Invariants：unique existing ids；acquisition order；final id is Primary；one effective operation emits one immutable change；no-op emits nothing；Store removal reconciles once；only Primary exposes handles/guides；selection does not change feature revision and is excluded from PlotJSON。

Compatibility APIs remain：

```text
plot.select(id | undefined)
plot.selectedId
plot.selectedIds
plot.selection
```

## 5. Click and region intents

```text
plain click       replace / make Primary
Shift             add
Ctrl or Cmd       toggle
Alt               subtract
empty plain click clear
```

Modifier priority：`Alt > Ctrl/Cmd > Shift > default`。

Region entry：

```text
Shift + empty drag       one-shot additive box
explicit box mode        default replace
explicit lasso mode      default replace
```

Public region APIs：

```text
plot.regionSelection
plot.regionSelectionSnapshot
plot.regionSelectionRejection
plot.startBoxSelection(options?)
plot.startLassoSelection(options?)
plot.cancelRegionSelection()
```

Lasso is explicit only；touch region gestures are deferred；region selection cannot mutate on pointerdown。

## 6. Gesture priority

```text
active drawing
> authored-handle drag
> active whole-selection translation
> active transform gesture
> active region gesture
> explicit region-mode start
> neutral Shift-empty box arm
> selected-body translation
> click selection
> camera gesture
```

007C design must freeze transform priority before runtime is written.

## 7. Box and lasso contract

```text
box threshold:           4 CSS px
lasso sample spacing:    2 CSS px
minimum distinct points: 3
minimum area:            16 CSS px²
RDP tolerance:           1.5 CSS px
```

Box selection mutates only on pointerup. Degenerate gestures preserve selection.

Lasso validation covers raw and simplified paths；repeated non-consecutive vertices and non-adjacent crossing、touch or overlap reject；invalid explicit lasso preserves selection and supports direct retry。

Stable rejection codes：

```text
SELECTION_REGION_TOO_SMALL
SELECTION_REGION_LASSO_TOO_FEW_POINTS
SELECTION_REGION_LASSO_SELF_INTERSECTS
SELECTION_REGION_QUERY_FAILED
SELECTION_REGION_CANDIDATE_GENERATION_FAILED
SELECTION_REGION_PROJECTION_FAILED
```

## 8. One-event multi-id selection

```ts
selection.applyMany(ids, intent, "box" | "lasso")
```

Validate every id before mutation；deduplicate；adapter results use Store order；replace/add/subtract/toggle are deterministic；one effective completion emits one event；region selection never enters History。

## 9. Region resolver

```text
region bounds
→ queryRenderedFeatures(committed fill/line/point layers)
→ plotId dedup
→ Store existence + document order
→ Registry.generate
→ map.project
→ exact screen intersection
```

Point、LineString、Polygon、MultiLineString and MultiPolygon are supported；Polygon holes are respected；compound features use any-component semantics；labels、hit areas、guides、drafts、handles and selection overlays are excluded；query/generation/projection failures reject the whole completion。

## 10. Region overlay and lifecycle

Region guides use an absolutely positioned DOM/SVG overlay with CSS-pixel coordinates、`pointer-events:none` and `aria-hidden:true`. They add no geographic Source or Layer.

Cancel active region gesture on Escape、unexpected pointer loss、style load、resize、camera start、Store change、external selection change、document lifecycle change or destroy。

Intentional `releasePointerCapture()` may emit `lostpointercapture`; once owned pointer state is cleared, that event must not erase a newly created rejected state。

## 11. Existing atomic editing

`PlotStore.applyTransaction()` stages add/replace/remove/order and commits once. `BatchEditCommand` stores exact before/after features、document order and selection. Batch delete and whole-selection local-metre translation remain one command per completed gesture with all-member Registry preflight and exact undo/redo。

## 12. Measured performance boundary

Run：

```bash
npm run benchmark:region-selection
```

Evidence：

```text
docs/performance/README.md
docs/performance/region-selection-resolver-benchmark.md
docs/performance/data/2026-08-04-region-selection-resolver-ci.json
```

Frozen run：

```text
CI:                #457 / 30933193884
source head:       2fca8812e206f799c3580380f4e1cd3ed3a73aa8
100 candidates:    2.399 ms median / 5.308 ms p95
1,000 candidates:  10.961 ms median / 18.246 ms p95
10,000 candidates: 109.308 ms median / 119.182 ms p95
```

Binding interpretation：headline totals are uninstrumented resolver calls；diagnostic phases are separate；real MapLibre tile/style query and browser frame time are not measured；the fixture is 100% candidate and 100% hit；no latency SLA is published。

Current decision：retain MapLibre rendered-index broad phase and do not add a persistent custom spatial index. A future index requires real Chromium/MapLibre measurements、candidate-ratio fixtures、mixed symbols、an explicit interaction budget and complete invalidation semantics。

## 13. Validation baseline

Every PR must pass on its exact current head：

```text
Node 20.19
Node 22
264 Node tests
Playground /PlotLibre/ build
handover contract
region-selection benchmark job and artifact
32 Chromium E2E
zero unresolved review threads
```

Benchmark success validates execution、result invariants and artifact production；it does not enforce a latency threshold。

## 14. 007C design boundary

After this post-merge documentation branch is merged, create a new branch from the final `main` for **design only**.

007C design must freeze：

- canonical authored-control transformation boundary；
- complete-selection pivot；
- positive clockwise user angle；
- positive uniform scale `[0.01, 100]`；
- rotation and scale handles；
- screen-pointer mathematics；
- gesture priority；
- preview、Escape and lifecycle cancellation；
- all-member canonicalization and Registry generation preflight；
- one atomic BatchEditCommand and exact undo/redo；
- antimeridian、high-latitude、large-extent and invalid-member policy；
- required tests and performance limits。

007C design branch prohibits runtime implementation、reflection、non-uniform scale、groups、locks、visibility、z-order、snapping、touch transforms、new symbols and PlotJSON shortcuts。

## 15. Clean-room references

```text
JamesLMilner/terra-draw@26d7ec91f071ab5d2bdeab774d14763746cd798b — MIT
geoman-io/maplibre-geoman@b177748cac826fc820ff7ea068186f8eb6e0fc3c — MIT
mapbox/mapbox-gl-draw@cb0ca464872d8468f0b912a2321f2e0503718c52 — ISC-style
maplibre/maplibre-gl-js@v6.0.0 — BSD-3-Clause
```

Observed public behavior only；code reuse：`none`。

## 16. Merge discipline

- design、runtime and finalization use separate branches/PRs；
- keep PR Draft until exact-head CI is green；
- report failures immediately；
- resolve review threads；
- mark Ready only after validation；
- Squash and merge with `expected_head_sha`；
- verify `main` after merge；
- create new work only from latest final `main`；
- never merge feature branches locally。

## 17. Continuation order

1. validate this documentation-only PR with unchanged 264/32/benchmark baseline；
2. merge with zero threads and verify `main`；
3. create 007C design branch from final `main`；
4. merge 007C design and post-merge synchronization before runtime；
5. keep real-browser performance、groups/locks、snapping and new symbols in separate slices。

## 18. Cross-stage tasks

Open-source license；coordinated package release；formal PlotJSON schema/migrations；docs/Registry/test consistency automation；real-browser candidate-ratio performance；npm boundaries；Playground code splitting；source/build/deploy/live verification；branch cleanup documentation or automation。

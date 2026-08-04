# PlotLibre 开发路线图

## 总体策略

符号族与专业编辑统一采用：

```text
设计冻结
→ 独立 runtime slice
→ current-head CI
→ immutable handover
→ Ready review
→ squash merge
→ documentation-only post-merge finalization
```

禁止：

- 编辑 rendered GeoJSON vertices 代替 authored controls；
- 允许部分 batch mutation；
- 关闭 Registry generation preflight；
- 把 canonical editor state 隐藏在任意 metadata 中；
- 在 design/finalization PR 中写 runtime；
- 一个 PR 并行扩散多个复杂编辑子系统；
- 使用旧 head 的 CI 声明新 head 已通过。

## 当前合并基线

```text
main SHA:          d08c56b6687ea64e0c599fd04fd77115d320d8f2
workspace:         0.0.21
public symbols:    19 (14 Arrow + 1 Line + 4 Area)
Node tests:        219
Chromium tests:    30
MapLibre Sources:  4
MapLibre Layers:   10
completed:         Milestone 007A runtime + finalization
current slice:     007B box/lasso selection design
current branch:    agent/007b-box-lasso-design
runtime on branch: prohibited
```

007A evidence：

```text
runtime PR:       #38
runtime head:     2d499a1cb122abbf6fce7548ec32f1b0031dd8f2
runtime CI:       #409 / 30906467230
runtime squash:   04dca0b120b1440afb49a300eeee92faf6644a7d
finalization PR:  #39
current main:     d08c56b6687ea64e0c599fd04fd77115d320d8f2
```

## 已完成里程碑

| 里程碑 | 主要成果 | 状态 |
|---|---|---|
| 001–004 | Workspace、Core、History、PlotJSON、MapLibre、geometry foundations | 已完成 |
| 005A–005H | 基础与复合 Arrow families | 已完成 |
| 006A–006D | pincer、canonical roles、structured rejection | 已完成 |
| 006E | squad combat | 已合并 |
| 006F–006G | route + corridor PathRibbon | 已合并 |
| 006H | bidirectional + double-head route | 已合并 |
| 006I | closed curve + gathering place | 已合并 |
| 006J | circular design、implementation、semantic guides | 已合并 |
| 007 Design | professional editing overall semantics | 已合并 |
| 007A | ordered selection、atomic Store、batch delete、local translation | PR #38/#39 已合并 |

## Milestone 007 总体拆分

```text
007A — ordered multi-selection + atomic Store + batch delete + local translation — merged
007B — box/lasso selection — current design
007C — rotation + positive uniform scale — deferred
007D — groups/locks/visibility/z-order after PlotJSON migration design — deferred
```

## 007A 已合并基础

- ordered transient SelectionController and Primary；
- replace/add/subtract/toggle/clear/restore/reconcile；
- one immutable event per effective operation；
- atomic `PlotStore.applyTransaction()`；
- listener-error isolation；
- exact-order `BatchEditCommand`；
- four Sources and ten Layers；
- Primary-only handles/guides；
- batch delete and local-metre whole-selection translation；
- 219 Node and 30 actual Chromium tests。

## Milestone 007B 设计冻结

Authoritative documents：

```text
docs/design/box-lasso-selection.md
docs/algorithms/screen-region-selection.md
```

### 7B.1 Input ownership

The current immediate Shift-add on MapLibre `mousedown` conflicts with thresholded Shift box selection。

Runtime must replace it with one unified region adapter：

```text
pointer down → armed
movement <4 px → pending click/no-op
movement >=4 px → active box
pointer up → exactly one click or region operation
```

Neutral convenience：

```text
Shift + empty primary drag → additive box
```

Explicit one-shot box/lasso modes support replace/add/toggle/subtract。Lasso is explicit only。Touch is deferred。

### 7B.2 Screen state

Region capture uses engine-independent CSS-pixel types：

```text
ScreenPoint
ScreenBounds
SelectionRegionSnapshot
SelectionRegionRejection
```

Region state is transient and excluded from Store、History、PlotJSON and feature revisions。

### 7B.3 Box

```text
activation threshold: 4 CSS px
selection mutation:   pointer up only
empty replace:        clear
empty add/sub/toggle: no-op
```

Degenerate/sub-threshold box is no-op。

### 7B.4 Lasso

```text
sample spacing:       2 CSS px
minimum distinct pts: 3
minimum area:         16 CSS px²
RDP tolerance:        1.5 CSS px
```

Validation：

```text
raw simple-ring validation
→ RDP simplify
→ simplified simple-ring validation
```

Repeated non-consecutive vertices、non-adjacent crossing、touch and collinear overlap reject。Invalid completion changes nothing and keeps one retry armed。

### 7B.5 One-event multi-id selection

Add `SelectionController.applyMany(ids,intent,reason)`。

- inputs validated before mutation；
- candidate ids supplied in Store order；
- replace/add/subtract/toggle produce one final ordered state；
- one effective region completion = one SelectionChange；
- no-op = no event；
- region selection never enters CommandHistory。

### 7B.6 Candidate resolution

```text
region bounding box
→ queryRenderedFeatures on committed fill/line/point layers
→ plotId dedup
→ Store-order normalization
→ Registry.generate once per unique candidate
→ map.project semantic fills/lines/points
→ exact screen intersection
```

MapLibre query is broad phase only。Selection、draft、handles、guides、labels and CSS styling footprint are excluded。

Exact narrow phase：

- Point center；
- Line segments；
- Polygon crossing/containment with hole support；
- Multi and compound any-component semantics；
- boundary inclusive；
- failure of query/generation/projection rejects whole completion；
- partial selection prohibited。

### 7B.7 Overlay and lifecycle

Region guide uses DOM/SVG overlay, not GeoJSON Source/Layer。The 4/10 baseline remains unchanged。

Cancel on：

```text
Escape
pointercancel/lost capture
style/resize/camera start
Store change
external selection change
draw/import/clear/undo/redo
destroy
```

Restore dragPan and boxZoom lifecycle exactly once and suppress synthetic post-drag click。

### 7B.8 Stable rejection codes

```text
SELECTION_REGION_TOO_SMALL
SELECTION_REGION_LASSO_TOO_FEW_POINTS
SELECTION_REGION_LASSO_SELF_INTERSECTS
SELECTION_REGION_QUERY_FAILED
SELECTION_REGION_CANDIDATE_GENERATION_FAILED
SELECTION_REGION_PROJECTION_FAILED
```

### 7B.9 Performance boundary

First implementation uses MapLibre rendered index as broad phase。No second persistent spatial index before measured evidence。

Fixtures：

```text
100 / 1,000 / 10,000 features
```

Record hardware、browser、viewport/camera、feature mix、generated vertices、candidate count、query/narrow/total times、median and p95。No hard latency claim before results。

## 007B implementation order after design merge

1. pure ScreenPoint/box/lasso utilities；
2. `SelectionController.applyMany()`；
3. exact projected geometry predicates；
4. MapLibre candidate resolver and Store ordering；
5. replace immediate Shift capture with unified region adapter；
6. DOM/SVG overlay and pointer lifecycle；
7. explicit one-shot public box/lasso API；
8. Playground controls/status；
9. actual Chromium flows；
10. benchmark report；
11. documentation、handover、current-head CI and merge。

Planned runtime branch：

```text
agent/007b-box-lasso-selection
```

## 007B required tests

### Node

- box every quadrant、threshold and degenerate behavior；
- lasso sampling、area、RDP and simple topology；
- repeated vertex、bow-tie、touch and overlap rejection；
- Point/Line/MultiLine predicates；
- Polygon containment/crossing/hole exclusion；
- MultiPolygon/compound any-component hit；
- applyMany ordering、Primary and no-op；
- query duplicate/order normalization；
- fail-closed query/generation/projection。

### Adapter/Chromium

- Shift click remains additive without mousedown mutation；
- Shift-empty drag additive box；
- explicit replace/toggle/subtract box；
- lasso excludes bbox false positives；
- invalid lasso changes nothing；
- DOM overlay/pointer/camera cleanup；
- no History mutation；
- region selection followed by translation/delete/undo；
- all historical 219/30 regressions。

## Milestone 007C：Rotation and scale

- local-metre only initially；
- pivot = selection authored-control bounds center；
- positive clockwise user angle；
- positive uniform scale `[0.01, 100]`；
- no reflection/non-uniform scale；
- atomic all-member Registry preflight。

## Milestone 007D：Canonical editor object state

Groups、locks、visibility、z-order require formal PlotJSON schema and migration before runtime。Arbitrary metadata shortcuts are prohibited。

## Reference evidence

```text
Terra Draw@26d7ec91f071ab5d2bdeab774d14763746cd798b — MIT
MapLibre-Geoman@b177748cac826fc820ff7ea068186f8eb6e0fc3c — MIT
Mapbox GL Draw@cb0ca464872d8468f0b912a2321f2e0503718c52 — ISC-style
MapLibre GL JS@v6.0.0 — BSD-3-Clause
```

Code reuse：`none`。

## 当前设计 PR 收尾顺序

1. synchronize AGENTS、design/algorithm indices、reference matrix、interaction model and handover；
2. add immutable 007B design handover；
3. open Draft documentation-only PR；
4. pass exact-head Node 20.19/22、219 Node、30 Chromium、build and handover；
5. confirm zero unresolved threads；
6. mark Ready and Squash and merge；
7. finalize actual design squash state；
8. create runtime branch from latest final `main`。

## 跨阶段工程任务

1. 决定开源许可证；
2. 统一 workspace/package versions；
3. Changesets/release workflow；
4. formal PlotJSON JSON Schema；
5. docs/Registry baseline consistency automation；
6. measured performance benchmark suite；
7. npm package-boundary review；
8. Playground code splitting；
9. distinguish source/build/deploy/live verification；
10. branch deletion automation or documented manual cleanup。

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
main SHA:          a9b9efc090c01f45133f3f136a0049a97ee52b90
workspace:         0.0.21
public symbols:    19 (14 Arrow + 1 Line + 4 Area)
Node tests:        219
Chromium tests:    30
MapLibre Sources:  4
MapLibre Layers:   10
completed:         007A runtime/finalization + 007B design PR #40
current slice:     007B design post-merge finalization
current branch:    agent/007b-design-post-merge-finalization
runtime on branch: prohibited
next runtime:      agent/007b-box-lasso-selection
```

007B design evidence：

```text
PR:               #40
validated head:   4a8ee1102bb923801ada95c648a258225ccb9ec4
CI:               #413 / 30912109618
Node 20.19:       success
Node 22:          success
Node tests:       219 passed
Chromium tests:   30 passed
Playground build: success
handover check:  success
threads:          0 unresolved
changed files:    10 Markdown / 0 runtime
squash SHA:       a9b9efc090c01f45133f3f136a0049a97ee52b90
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
| 007B Design | screen-space box/lasso semantics and algorithms | PR #40 已合并 |

## Milestone 007 总体拆分

```text
007A — ordered multi-selection + atomic Store + batch delete + local translation — merged
007B — box/lasso selection design — merged; runtime next
007C — rotation + positive uniform scale — deferred
007D — groups/locks/visibility/z-order after PlotJSON migration design — deferred
```

## 007B 已冻结设计

Authoritative documents：

```text
docs/design/box-lasso-selection.md
docs/algorithms/screen-region-selection.md
docs/handover/2026-08-04-milestone-007b-box-lasso-design.md
```

### Input ownership

- replace immediate Shift-add-on-mousedown with one unified thresholded region adapter；
- neutral `Shift + empty drag` = additive box；
- explicit one-shot box/lasso = default replace；
- explicit modes support modifier override add/toggle/subtract；
- intent captured on pointer down；
- drawing、handle drag and translation retain priority；
- touch deferred。

### Box and lasso numbers

```text
box threshold:       4 CSS px
lasso spacing:       2 CSS px
minimum points:      3
minimum area:        16 CSS px²
RDP tolerance:       1.5 CSS px
```

Raw and simplified lasso rings both reject repeated non-consecutive vertices and non-adjacent crossing、touch or overlap。

### One-event selection

```text
SelectionController.applyMany(ids, intent, "box" | "lasso")
```

- candidate ids deduplicated before mutation；
- order supplied by Store/document order；
- replace/add/subtract/toggle frozen deterministically；
- one effective completion = one SelectionChange；
- no-op = no event；
- region selection does not enter History or PlotJSON。

### Broad/narrow hit pipeline

```text
region bbox
→ queryRenderedFeatures(committed fill/line/point layers)
→ plotId dedup
→ Store-order normalization
→ Registry.generate once per candidate
→ map.project fills/lines/points
→ exact screen intersection
```

- MapLibre query is broad phase only；
- query order and tile duplicates are ignored；
- selection、draft、handle、guide and label layers excluded；
- Point、Line、Polygon、Multi and compound predicates frozen；
- Polygon holes respected；
- CSS stroke/radius ignored；
- query/generation/projection failure rejects whole completion；
- partial selection prohibited。

### Overlay/lifecycle

- DOM/SVG screen overlay；
- no new Source/Layer；
- 4/10 baseline retained；
- pointer capture and dragPan/boxZoom restored exactly once；
- synthetic click suppressed；
- active region cancels on Escape、pointer loss、style、resize、camera、Store、external selection and programmatic document lifecycle changes。

### Performance boundary

- MapLibre rendered index is initial broad phase；
- no custom persistent index before measured evidence；
- benchmark 100/1,000/10,000 features；
- record candidate count、query、exact-test、total、median、p95 and environment；
- no hard public latency guarantee before measurement。

## 当前 post-merge finalization

`agent/007b-design-post-merge-finalization` 只能：

- record actual PR #40 squash SHA；
- update current-state authority docs；
- add immutable post-merge handover；
- replace design-candidate continuation with runtime continuation；
- pass unchanged 219/30 CI。

禁止 runtime、API、package、geometry、interaction or test-behavior changes。

## 007B runtime implementation order

Planned branch：

```text
agent/007b-box-lasso-selection
```

Binding order：

1. pure ScreenPoint、box、lasso、RDP and simple-topology utilities；
2. `SelectionController.applyMany()`；
3. exact projected Point/Line/Polygon/Multi predicates；
4. MapLibre broad-phase resolver and Store ordering；
5. replace immediate Shift capture with unified region adapter；
6. DOM/SVG overlay and pointer lifecycle；
7. public one-shot box/lasso API；
8. Playground controls/status；
9. actual Chromium flows；
10. benchmark report；
11. documentation、handover、current-head CI and squash merge。

## 007B runtime required tests

### Node

- box every direction、threshold and degenerate behavior；
- lasso sampling、area、RDP and topology；
- bow-tie、repeat、touch and overlap rejection；
- Point/Line/MultiLine predicates；
- Polygon containment/crossing/hole exclusion；
- MultiPolygon/compound any-component hit；
- applyMany ordering、Primary and no-op；
- query duplicate/order normalization；
- fail-closed query/generation/projection。

### Adapter/Chromium

- Shift click still adds without immediate mousedown mutation；
- Shift-empty additive box；
- explicit replace/toggle/subtract box；
- exact lasso excludes bbox false positives；
- invalid lasso changes nothing；
- DOM overlay/pointer/camera cleanup；
- no History mutation；
- region selection followed by translation/delete/undo；
- all historical regressions。

## 007B runtime non-goals

- rotation or scale；
- groups/locks/visibility/z-order；
- snapping；
- new symbols；
- touch region gestures；
- contain-only region selection；
- persistent region tool mode；
- unmeasured performance claims。

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

## Finalization merge order

1. update latest current-state docs and immutable post-merge handover；
2. open Draft documentation-only PR；
3. pass exact-head Node 20.19/22、219 Node、30 Chromium、build and handover；
4. confirm zero unresolved threads；
5. mark Ready and Squash and merge with expected head SHA；
6. create runtime branch from the new final `main`。

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

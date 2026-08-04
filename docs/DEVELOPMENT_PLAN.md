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
- 在 documentation-only PR 中写 runtime；
- 一个 PR 并行扩散多个复杂编辑子系统；
- 使用旧 head 的 CI 声明新 head 已通过。

## 当前合并基线

```text
main SHA:          04dca0b120b1440afb49a300eeee92faf6644a7d
workspace:         0.0.21
public symbols:    19 (14 Arrow + 1 Line + 4 Area)
Node tests:        219
Chromium tests:    30
MapLibre Sources:  4
MapLibre Layers:   10
completed:         Milestone 007A through PR #38
current slice:     007A post-merge documentation finalization
current branch:    agent/007a-post-merge-finalization
next milestone:    007B box/lasso selection design
```

PR #38 final evidence：

```text
validated head:   2d499a1cb122abbf6fce7548ec32f1b0031dd8f2
CI:               #409 / 30906467230
Node 20.19:       success
Node 22:          success
Node tests:       219 passed
Chromium tests:   30 passed
Playground build: success
handover check:  success
threads:          0 unresolved
squash SHA:       04dca0b120b1440afb49a300eeee92faf6644a7d
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
| 007 Design | professional editing semantics and transaction algorithms | 已合并 |
| 007A | ordered selection、atomic Store、batch delete、local translation | PR #38 已合并 |

## Milestone 007 总体拆分

```text
007A — ordered multi-selection + atomic Store + batch delete + local translation — merged
007B — box/lasso selection — next
007C — rotation + positive uniform scale — deferred
007D — groups/locks/visibility/z-order after PlotJSON migration design — deferred
```

## 007A 已合并能力

### SelectionController

- ordered unique `selectedIds`；
- final id Primary；
- replace/add/subtract/toggle/clear/makePrimary/restore/reconcile；
- immutable monotonic snapshots；
- one effective operation = one event；
- no-op = no event；
- Store remove/clear reconciliation；
- selection excluded from PlotJSON and feature revision；
- backward-compatible `select()` / `selectedId` aliases。

### Atomic PlotStore transaction

```text
validate operation id sets
→ clone ordered Store state
→ stage add/replace/remove
→ validate exact orderedIds
→ any error: no mutation
→ commit once
→ one batch event
```

Post-commit listener errors are collected and reported through `onListenerError`; they do not prevent History from recording an already committed command。

### BatchEditCommand

Stores exact before/after features, document order and selection snapshots。Execute/undo/redo replay exact revisions。Automatic reconciliation is suspended during Store mutation and followed by one explicit selection restoration。

### MapLibre selection

```text
plain click       replace / make-primary
Shift             add
Ctrl/Cmd          toggle
Alt               subtract
empty plain click clear
```

MapLibre box zoom is preserved、disabled during PlotLibre lifecycle and restored on destroy。

Sources：

```text
plotlibre-committed
plotlibre-selection
plotlibre-draft
plotlibre-handles
```

Layers：

```text
plotlibre-fill
plotlibre-line
plotlibre-point
plotlibre-selection-line
plotlibre-selection-point
plotlibre-draft-fill
plotlibre-draft-line
plotlibre-draft-point
plotlibre-handle-guide
plotlibre-handle
```

Only Primary exposes authored handles and Definition guides。

### Batch delete

- `plot.removeSelected()`；
- Delete/Backspace and Playground action share one command path；
- one atomic remove transaction；
- undo restores exact values、document order、selection and Primary；
- redo restores exact after-state。

### Local whole-selection translation

```text
selected authored controls
→ one shared local coordinate frame
→ one order-independent projection origin
→ one common metre delta
→ transform every authored control
→ candidate revision = original + 1
→ Registry preflight all candidates
→ all valid: transient preview and one command
→ any invalid: no Store or History mutation
```

Parameters/style/metadata remain unchanged。Escape cancels。Handle drag has priority。dragPan is restored after the gesture。

## 当前 documentation-only finalization

`agent/007a-post-merge-finalization` 只能：

- record actual squash SHA；
- replace pre-merge candidate wording；
- update latest handover and continuation order；
- add immutable post-merge handover；
- pass unchanged 219 Node / 30 Chromium baseline。

禁止 runtime、API、geometry、interaction or test behavior changes。

## Milestone 007B：Box and lasso design

Only after finalization merges：

### Box selection decisions to freeze

- gesture and modifier ownership；
- screen-space rectangle representation；
- default intersection policy；
- candidate layer set；
- compound feature de-duplication by `plotId`；
- deterministic result ordering by Store/document order；
- relationship with Shift click and MapLibre camera gestures；
- behavior for active draw、handle drag and translation；
- empty result and Primary selection policy。

### Lasso decisions to freeze

- screen-space authored lasso path；
- closure threshold and completion gesture；
- simple-ring requirement；
- self-intersection fail closed；
- intersection policy；
- simplification tolerance boundary；
- transient overlay source/layer ownership；
- cancellation and keyboard behavior。

### Performance boundary

- no large-document claim without measured fixtures；
- candidate feature de-duplication before expensive geometry tests；
- define spatial-index ownership and invalidation；
- record hardware、browser、feature mix and viewport for benchmarks。

007B must not include rotation/scale、groups/locks、snapping or new symbols。

## Milestone 007C：Rotation and scale

- local-metre only initially；
- pivot = selection authored-control bounds center；
- positive clockwise user angle with documented Cartesian conversion；
- positive uniform scale `[0.01, 100]`；
- no reflection/non-uniform scale；
- atomic all-member Registry preflight；
- parameters unchanged unless a future pure/versioned Definition transform hook opts in。

## Milestone 007D：Canonical editor object state

Groups、locks、visibility、z-order require formal PlotJSON schema and migration before runtime。Arbitrary metadata shortcuts are prohibited。

## Reference evidence

```text
Terra Draw@26d7ec91f071ab5d2bdeab774d14763746cd798b — MIT
MapLibre-Geoman@b177748cac826fc820ff7ea068186f8eb6e0fc3c — MIT
Mapbox GL Draw@cb0ca464872d8468f0b912a2321f2e0503718c52 — ISC-style
```

Code reuse：`none`。

## Milestone 008–013

- snapping and constraints；
- more symbols and annotations；
- PlotJSON schema/migrations and project management；
- optional MIL-STD/APP-6 backend；
- React/Vue/CRDT/collaboration；
- stable 1.0、license、release automation、performance and compatibility matrices。

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

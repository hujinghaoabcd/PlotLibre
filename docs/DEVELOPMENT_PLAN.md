# PlotLibre 开发路线图

## 总体策略

符号族与专业编辑都采用：

```text
设计冻结
→ 独立实现
→ current-head CI
→ immutable handover
→ squash merge
→ documentation-only post-merge finalization
```

禁止：

- 编辑 rendered GeoJSON vertices 代替 authored controls；
- 允许部分 batch mutation；
- 为提高成功率关闭 Registry generation preflight；
- 把 canonical editor state 隐藏在任意 metadata 中；
- 在 documentation-only design/finalization PR 中提前写 runtime；
- 并行扩散多个复杂编辑子系统。

## 当前基线

```text
main SHA:          bebfac11b6728089b39668de424851e2f750b4fd
workspace:         0.0.20
public symbols:    19 (14 Arrow + 1 Line + 4 Area)
Node tests:        184
Chromium tests:    28
completed:         Milestone 007 professional-editing design through PR #36
current slice:     007 design post-merge documentation finalization
next runtime:      007A selection + batch transaction + local translation
planned branch:    agent/007a-selection-batch-translation
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
| 006I | closed curve + gathering place | PR #31、#32 已合并 |
| 006J | circular design、implementation、semantic guides | PR #33、#34、#35 已合并 |
| 007 Design | professional editing semantics and transaction algorithms | PR #36 已合并 |

## Milestone 007 总体拆分

```text
007A — multi-selection + atomic Store transaction + batch delete + local translation
007B — box/lasso selection
007C — rotation + positive uniform scale
007D — groups/locks/visibility/z-order after PlotJSON migration design
```

007A 必须独立完成并合并后，才能进入 007B。007B–D 不得混入 007A PR。

## 已合并的 007 设计契约

### SelectionSnapshot

```ts
interface SelectionSnapshot {
  readonly selectedIds: readonly string[];
  readonly primaryId?: string;
  readonly revision: number;
}
```

- selection transient，不进入 PlotJSON；
- ids 唯一并按 acquisition order 排列；
- primary 是最后一个 selected id；
- replace/add/subtract/toggle/clear/reconcile 每次最多一个 event；
- Store removal/clear 自动 reconcile；
- only primary feature 显示 authored handles and Definition guides；
- secondary selections 只显示 lightweight overlays；
- backward-compatible `selectedId` 映射到 primary。

### Atomic PlotStore transaction

```text
validate transaction
→ clone ordered Store state
→ stage add/replace/remove
→ any error: no mutation
→ commit once
→ one batch event
```

必须支持 exact ordered state，以便 batch delete undo 恢复原 document/render order。Append-on-undo 不允许。

### Listener failure isolation

Store commit 后 listener error：

- 不回滚已被其他 listeners 观察的状态；
- 所有 listeners 仍执行；
- errors 交给 `onListenerError`；
- 不同步抛出阻止 history 入栈；
- semantic validation error 仍在 commit 前抛出。

### BatchEditCommand

Command 保存 exact：

```text
before/after features
before/after document order
before/after selection
label
```

Execute/redo 使用 exact after-state；undo 使用 exact before-state。Redo 不再次增加 revisions。

## Milestone 007A：首个 runtime slice

### 7A.1 SelectionController

实现顺序第一：

```text
replace
add
subtract
toggle
clear
makePrimary
restore
snapshot
subscribe
```

先完成 engine-independent Node tests，再接 MapLibre。

### 7A.2 PlotStore transaction

实现顺序第二：

- staged add/replace/remove；
- exact ordered ids；
- one batch event；
- no partial mutation；
- listener-error isolation；
- existing single-operation APIs backward compatible。

### 7A.3 BatchEditCommand

实现顺序第三：

- exact before/after feature sets；
- exact document order；
- exact selection snapshots；
- execute/undo/redo revision stability；
- one gesture / one history entry。

### 7A.4 Selection API and overlays

Backward-compatible API：

```text
plot.select(id | undefined)
interaction.selectedId
```

新增候选：

```text
plot.selectMany(ids, options?)
plot.clearSelection()
interaction.selectedIds
interaction.primarySelectedId
interaction.selectionSnapshot
interaction.subscribeSelection(listener)
```

MapLibre resources candidate：

```text
plotlibre-selection source
plotlibre-selection-line
plotlibre-selection-point
plotlibre-transform-guide
```

Only selected features are regenerated for overlay changes。Only primary keeps authored handles。

### 7A.5 Batch delete

```text
selected ids
→ one atomic remove transaction
→ afterSelection empty
→ one history entry
```

Undo restores exact features、order、selection and primary。

### 7A.6 Local whole-object translation

```text
selected authored controls
→ one local coordinate analysis
→ one order-independent projection
→ one common meter delta
→ transform every authored control
→ revision = original + 1
→ Registry preflight all candidates
→ all valid: one preview/command
→ any invalid: no mutation
```

Rules：

- parameters/style/metadata unchanged；
- antimeridian/high-latitude/large-extent selection rejects before drag；
- handle drag priority > transform drag > selected-object drag > selection click > camera drag；
- drag threshold 4 CSS px；
- Escape cancels；
- zero movement no-op；
- one gesture = one history entry；
- dragPan disabled only during transform。

Structured rejection codes：

```text
TRANSFORM_SELECTION_EMPTY
TRANSFORM_FEATURE_MISSING
TRANSFORM_FEATURE_LOCKED
TRANSFORM_UNSUPPORTED_COORDINATE_MODE
TRANSFORM_CANDIDATE_GENERATION_FAILED
TRANSFORM_TRANSACTION_INVALID
```

### 7A.7 Validation target

Current baseline remains：

```text
184 Node
28 Chromium
```

007A must add tests for：

- selection order、primary fallback、modifiers and reconciliation；
- transaction preconditions、one batch event and no partial mutation；
- listener exception isolation；
- exact order restoration；
- selection-aware execute/undo/redo；
- mixed Arrow/Line/Area translation；
- common meter delta and unchanged parameters；
- invalid one-member atomic rejection；
- actual overlays and batch preview；
- batch delete/undo；
- style reload；
- performance measurements；
- all historical regressions。

## Milestone 007B：Box and lasso

- Shift-drag empty map box selection；
- default intersection policy；
- candidate ids dedup by `plotId`；
- deterministic Store order；
- exact contain policy deferred；
- dedicated screen-space lasso；
- simple ring required；
- self-intersection fail closed；
- spatial index required before scale claims。

## Milestone 007C：Rotation and scale

- local-metre only initially；
- pivot = selection authored-control bounds center；
- positive user angle clockwise；
- positive uniform scale `[0.01, 100]`；
- no reflection/non-uniform scale；
- all-feature atomic preflight；
- parameters unchanged unless a future pure/versioned Definition transform hook opts in。

## Milestone 007D：Canonical editor object state

Groups、locks、visibility、z-order require formal PlotJSON schema/migration before runtime。Arbitrary metadata shortcuts are prohibited。

## Reference evidence

```text
Terra Draw@26d7ec91f071ab5d2bdeab774d14763746cd798b — MIT
MapLibre-Geoman@b177748cac826fc820ff7ea068186f8eb6e0fc3c — MIT
Mapbox GL Draw@cb0ca464872d8468f0b912a2321f2e0503718c52 — ISC-style
```

Code reuse：`none`。

## Design merge evidence

```text
PR:               #36
validated head:   828163df161293ef078aa7426b061e0c88aa6614
CI:               #341 / 30896319194
Node 20.19:       success
Node 22:          success
Node tests:       184 passed
Chromium tests:   28 passed
Playground build: success
handover check:  success
threads:         0 unresolved
squash SHA:      bebfac11b6728089b39668de424851e2f750b4fd
```

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
5. batch transaction and error isolation；
6. docs/Registry baseline consistency automation；
7. performance benchmarks；
8. npm package-boundary review；
9. Playground code splitting；
10. distinguish source/build/deploy/live verification。

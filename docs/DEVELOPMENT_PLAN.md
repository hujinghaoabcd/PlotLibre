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
→ 必要时 documentation-only post-merge finalization
```

禁止：

- 编辑 rendered GeoJSON vertices 代替 authored controls；
- 允许部分 batch mutation；
- 为提高成功率关闭 Registry generation preflight；
- 把 canonical editor state 隐藏在任意 metadata 中；
- 在 documentation-only PR 中提前写 runtime；
- 一个 PR 并行扩散多个复杂编辑子系统；
- 使用旧 head 的 CI 结论声明新 head 已通过。

## 当前候选基线

```text
workspace:         0.0.21
public symbols:    19 (14 Arrow + 1 Line + 4 Area)
Node tests:        219
Chromium tests:    30
MapLibre Sources:  4
MapLibre Layers:   10
current PR:        #38
current branch:    agent/007a-selection-batch-translation
current milestone: 007A implementation and documentation finalization
```

007A runtime head `07449e7fda66069b148fa08c865b209d7dc365a3` 已由 CI #398 完整验证。版本与文档同步后的最终 head 必须重新运行完整 CI，不能复用该结论作为最终合并证据。

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
| 007A Runtime | multi-selection、atomic Store、batch delete、local translation | PR #38 runtime 已实现，待最终文档 CI 与合并 |

## Milestone 007 总体拆分

```text
007A — ordered multi-selection + atomic Store + batch delete + local translation
007B — box/lasso selection
007C — rotation + positive uniform scale
007D — groups/locks/visibility/z-order after PlotJSON migration design
```

007A 必须独立完成并合并后才能进入 007B。007B–D 不得混入 PR #38。

## Milestone 007A 已实现能力

### 7A.1 SelectionController

已完成 engine-independent：

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
destroy
store reconciliation
modifier intent application
```

语义：

- `selectedIds` 唯一并按 acquisition order 排列；
- 最后一个 id 是 Primary；
- restore 保留 membership/Primary，但 interaction revision 单调递增；
- no-op 不发 event；
- 每个有效操作只发一个 immutable event；
- Store remove/clear 自动 reconcile；
- selection 不进入 PlotJSON，不增加 feature revision。

### 7A.2 PlotStore atomic transaction

已完成：

```text
validate transaction
→ clone ordered Store state
→ stage add/replace/remove
→ validate optional exact orderedIds
→ any error: no mutation and no event
→ commit once
→ one batch event
```

现有单操作 API 保持兼容。Undo 可恢复 exact document/render order，禁止 append-on-undo。

### 7A.3 Listener failure isolation

已完成冻结策略：

- semantic/precondition error 在 commit 前抛出；
- commit 后所有 listeners 均执行；
- listener exceptions 收集并交给 `onListenerError`；
- 不同步逃逸破坏 History；
- 已提交 Store 状态始终可由对应 command undo。

### 7A.4 BatchEditCommand

已完成 exact：

```text
before/after features
before/after document order
before/after selection
label
```

Execute/redo 回放 exact after-state，undo 回放 exact before-state。Redo 不再次增加 revisions。事务期间暂停自动 selection reconciliation，最终只发布一个明确 selection restoration event。

### 7A.5 Public selection API

保持兼容：

```text
plot.select(id | undefined)
plot.selectedId
interaction.select(id | undefined)
interaction.selectedId
```

新增：

```text
plot.selectedIds
plot.selection
plot.removeSelected()
plot.translation
```

Only Primary exposes authored handles and Definition guides；secondary selections 只显示轻量 overlay。

### 7A.6 MapLibre selection resources

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

Selection source 与 handles source 独立。Polygon 转 boundary、LineString 保持 line、Point 保持 point；Primary 通过 derived property 表达。Style reload 恢复 committed、selection、draft、handles 和 guides。

### 7A.7 Modifier input

```text
plain click       replace / make-primary
Shift             add
Ctrl/Cmd          toggle
Alt               subtract
empty plain click clear
```

MapLibre box zoom 会在 PlotLibre 生命周期内被保留并关闭，使 Shift 专用于 additive selection；`destroy()` 恢复原 box-zoom 状态。Shift 在 MapLibre `mousedown` 层处理，后续 click 以幂等 add 避免重复改变。

### 7A.8 Batch delete

```text
selected ids
→ one BatchEditCommand
→ one atomic remove transaction
→ afterSelection empty
→ one History entry
```

Undo 恢复 exact features、order、selection 和 Primary；redo 恢复 exact after-state。Delete/Backspace 与 Playground 按钮共用该语义。

### 7A.9 Local whole-selection translation

```text
selected authored controls
→ one shared coordinate analysis
→ one order-independent local projection origin
→ pointer start/end meter delta
→ same delta for every authored control
→ revision = original + 1
→ canonicalize/generate all candidates
→ all valid: transient preview then one batch command
→ any invalid: no Store or History mutation
```

规则：

- parameters/style/metadata unchanged；
- Store 在 preview 期间保持原值；
- Escape 全量取消；
- zero/sub-threshold movement no-op；
- one gesture = one History entry；
- handle drag priority > translation > selection click > camera drag；
- dragPan 只在 active translation 时关闭并恢复；
- antimeridian、高纬、large extent、non-finite 或任一 generation failure 均整批拒绝。

### 7A.10 Playground

Playground 已显示：

- selection count；
- Primary id；
- multi-selection instructions；
- atomic batch delete；
- body-drag translation state；
- rejection/cancel feedback；
- Primary-only style editing。

## 007A 验证证据

Runtime head：

```text
head:              07449e7fda66069b148fa08c865b209d7dc365a3
CI run:            #398 / 30904843935
Node 20.19:        success
Node 22:           success
Node tests:        219 passed
Chromium tests:    30 passed
Playground build:  success
handover check:    success
```

真实 Chromium 纵向测试覆盖：

- rendered-feature hit detection；
- plain + Shift selection；
- common-delta body translation；
- transient preview with unchanged Store；
- one-command commit；
- undo/redo exact values；
- Escape rollback；
- Delete all selected；
- undo document order and Primary restoration。

最终文档 head 仍需重新执行同样门槛。

## PR #38 合并前剩余任务

1. 同步所有权威文档与 `0.0.21` baseline；
2. 创建 immutable 007A implementation handover；
3. 更新 `docs/handover/LATEST.md`；
4. 更新 PR body 为完整实现事实；
5. 对最终 head 运行 Node 20.19/22、219 Node、Playground build、handover check、30 Chromium；
6. 检查 unresolved review threads = 0；
7. Mark Ready；
8. 使用 expected head SHA Squash and merge；
9. 工具允许时删除 feature branch；
10. 必要时从新 main 创建 documentation-only finalization PR，记录实际 squash SHA。

## Milestone 007B：Box and lasso

仅在 007A 合并后开始设计：

- screen-space box intersection selection；
- lasso simple-ring validation；
- candidate ids by `plotId` de-duplication；
- deterministic Store/document order；
- exact contain policy deferred；
- self-intersection fail closed；
- spatial index before large-document claims；
- 不复用 rendered vertices 作为 authored state。

## Milestone 007C：Rotation and scale

- local-metre only initially；
- pivot = selection authored-control bounds center；
- positive clockwise UI angle with documented Cartesian conversion；
- positive uniform scale `[0.01, 100]`；
- no reflection/non-uniform scale；
- all-feature atomic preflight；
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

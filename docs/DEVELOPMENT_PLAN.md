# PlotLibre 开发路线图

## 总体策略

符号族与专业编辑都采用“设计冻结 → 独立实现 → current-head CI → immutable handover → squash merge”的完整纵向切片。

禁止：

- 编辑 rendered GeoJSON vertices 代替 authored controls；
- 允许部分 batch mutation；
- 为提高成功率关闭 Registry generation preflight；
- 把 canonical editor state 隐藏在任意 metadata 中；
- 在 documentation-only design PR 中提前写 runtime；
- 并行扩散多个复杂编辑子系统。

## 当前基线

```text
main SHA:          4ce59d189b65c8257bf49beabc308a4020249cd0
workspace:         0.0.20
public symbols:    19 (14 Arrow + 1 Line + 4 Area)
Node tests:        184
Chromium tests:    28
completed:         006J implementation + finalization
active milestone:  007 professional editing semantic design
active branch:     agent/007-professional-editing-design
runtime changes:   prohibited on design branch
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

## Milestone 007 总体拆分

```text
007 Design — professional editing semantic/transaction freeze
007A — multi-selection + atomic Store transaction + batch delete + local translation
007B — box/lasso selection
007C — rotation + positive uniform scale
007D — groups/locks/visibility/z-order after PlotJSON migration design
```

Design PR 合并后只创建 007A implementation branch；007B–D 不进入同一 runtime PR。

## 007 Design：已冻结候选

### SelectionSnapshot

```ts
interface SelectionSnapshot {
  readonly selectedIds: readonly string[];
  readonly primaryId?: string;
  readonly revision: number;
}
```

规则：

- selection transient，不进入 PlotJSON；
- ids unique 且为现存 Store ids；
- acquisition order 稳定；
- primary 是最后一个 selected id；
- replace/add/subtract/toggle/clear/reconcile 每次最多一个 event；
- Store removal/clear 自动 reconcile；
- only primary feature 显示 authored handles and Definition guides；
- secondary selection 只显示 lightweight overlay；
- backward-compatible `selectedId` 映射到 primary。

### Modifier intent

```text
plain click       replace / make primary
Shift             add
Ctrl or Cmd       toggle
Alt               subtract
empty plain click clear
```

MapLibre 只负责把浏览器 modifiers 转成 engine-independent intent。

### Atomic PlotStore transaction

```text
validate transaction
→ clone ordered Store state
→ stage add/replace/remove
→ any error: no mutation
→ commit once
→ one batch event
```

必须支持 exact ordered-id state，以便 batch delete undo 恢复原 document order。Append-on-undo 不允许。

### Listener failures

Store commit 后 listener error：

- 不回滚已被其他 listeners 观察的状态；
- 所有 listeners 仍执行；
- errors 交给 `onListenerError`；
- 不同步抛出阻止 history 入栈；
- mutation validation error 仍在 commit 前抛出。

### BatchEditCommand

Command 保存：

```text
before/after features
before/after document order
before/after selection
label
```

Execute/redo 使用 exact after-state；undo 使用 exact before-state。Redo 不再次增加 revisions。

## Milestone 007A：首个 runtime slice

### 7A.1 SelectionController

Engine-independent API candidate：

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

Node tests 先于 MapLibre adapter。

### 7A.2 Multi-selection overlay

Candidate MapLibre resources：

```text
plotlibre-selection source
plotlibre-selection-line
plotlibre-selection-point
plotlibre-transform-guide
```

- overlays transient；
- compound output dedup by `plotId`；
- selection-only changes 不 regenerate entire document；
- primary flag explicit；
- primary authored handles remain in handles source。

### 7A.3 Batch delete

```text
selected ids
→ one atomic remove transaction
→ afterSelection empty
→ one history entry
```

Undo restores exact features、order、selection and primary。

### 7A.4 Local whole-object translation

```text
selected authored controls
→ analyze one local coordinate frame
→ one common meter delta
→ transform every authored control
→ revision = original + 1
→ Registry preflight all candidates
→ all valid: one batch preview/command
→ any invalid: no mutation
```

Rules：

- parameters/style/metadata unchanged；
- antimeridian/high-latitude/large-extent selection rejects before drag；
- control handle priority > whole-object drag > selection click > camera drag；
- drag threshold 4 CSS px；
- Escape cancels；
- zero movement no-op；
- one gesture = one history entry；
- dragPan disabled only during transform。

### 7A.5 Structured rejection

Initial codes：

```text
TRANSFORM_SELECTION_EMPTY
TRANSFORM_FEATURE_MISSING
TRANSFORM_FEATURE_LOCKED
TRANSFORM_UNSUPPORTED_COORDINATE_MODE
TRANSFORM_CANDIDATE_GENERATION_FAILED
TRANSFORM_TRANSACTION_INVALID
```

Invalid preview keeps last-valid preview and never mutates Store/History。

### 7A.6 Tests

Node：

- selection operations/order/primary/no-op；
- Store reconcile；
- transaction preconditions；
- no partial mutation；
- one batch event；
- listener failure isolation；
- exact order restoration；
- execute/undo/redo revisions and selection；
- mixed Arrow/Line/Area translation；
- common meter delta；
- invalid member atomic rejection；
- Escape/zero movement。

Chromium：

- Ctrl/Cmd toggle、Shift add、Alt subtract；
- primary handles only；
- actual multi-selection overlays；
- whole-selection drag preview and commit；
- one undo/redo；
- batch delete/undo；
- style reload；
- all existing 19-symbol/28-test regressions。

## Milestone 007B：Box and lasso

### Box

- Shift-drag empty map；
- default intersection policy；
- candidate ids from committed interactive layers；
- dedup by `plotId`；
- deterministic Store order；
- selection changes once on pointer-up；
- exact contain policy deferred。

### Lasso

- dedicated mode/action；
- screen-space path；
- remove adjacent duplicates and simplify with documented tolerance；
- >=3 distinct points；
- simple ring required；
- self-intersection rejects completion；
- transient only；
- spatial index required before large-document claim。

## Milestone 007C：Rotation and scale

- local-metre only initially；
- pivot = selection authored-control bounds center；
- positive user angle clockwise；
- positive uniform scale `[0.01, 100]`；
- no reflection/non-uniform scale；
- all selected controls share pivot；
- parameters unchanged by default；
- future Definition parameter-transform hook must be pure/versioned；
- any invalid member rejects complete transform。

## Milestone 007D：Canonical editor object state

Groups、locks、visibility、z-order require formal PlotJSON schema/migration before runtime。

Must freeze：

- stable group ids and nesting；
- lock effects on selection/style/handles/delete/transform；
- visibility and hit testing；
- global/group z-order；
- import unresolved relations；
- migration from PlotJSON 1.0。

Arbitrary free-form metadata is prohibited for these fields。

## Reference evidence

```text
Terra Draw@26d7ec91f071ab5d2bdeab774d14763746cd798b — MIT
MapLibre-Geoman@b177748cac826fc820ff7ea068186f8eb6e0fc3c — MIT
Mapbox GL Draw@cb0ca464872d8468f0b912a2321f2e0503718c52 — ISC-style
```

Code reuse：`none`。详细行为矩阵见 `REFERENCE_LIBRARY_MATRIX.md`，事务算法见 `algorithms/batch-edit-transaction.md`。

## 007 Design merge gate

```text
no runtime changes
Node 20.19:       success
Node 22:          success
Node tests:       184 passed
Chromium tests:   28 passed
Playground build: success
handover check:  success
review threads:  0 unresolved
```

设计合并后创建：

```text
agent/007a-selection-batch-translation
```

## Milestone 008：吸附与约束

- spatial index；
- vertex/segment/midpoint/intersection snapping；
- grid、angle、bearing、parallel、perpendicular constraints；
- explainable snap reasons and guides。

## Milestone 009–013

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

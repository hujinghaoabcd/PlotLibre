# PlotLibre Development Handover — Milestone 005H Double Arrow Semantic Design

日期：2026-07-29  
仓库：`hujinghaoabcd/PlotLibre`  
目标分支：`main`  
开发分支：`agent/double-arrow-semantic-design`  
Workspace：`0.0.11`  
状态：design-only milestone; no public symbol or geometry implementation yet

## Current state

PR #13 已将 Milestone 005G squash 合并到 `main`：

```text
main commit: 74611fe8dd39f5c2ad927ab2e9aeb56a9dadf304
```

005H 分支从该主线提交创建。

本阶段只完成 `arrow.double` canonical semantic design、clean-room 行为研究、开发契约和路线图更新。没有新增 public type、geometry generator、Definition、PlotJSON schema、Playground option 或测试基线变化。

核心设计文档：

```text
docs/design/arrow-double-semantic-design.md
```

## Completed in this milestone

### Public behavior research

研究对象：

```text
repository: sakitam-fdd/ol-plot
revision:   c919e60b4edeaeca53c08f9552f793b2ae9537f0
file:       packages/ol-plot/src/geometry/Arrow/DoubleArrow.ts
```

只记录公开行为：

- DoubleArrow 是独立 Polygon 类型；
- normal drawing 固定最多四点；
- 三点 intermediate state 可推导临时对称目标；
- 四点状态含两个显式 objective；
- restored data 可出现额外 connection control；
- left/right 由几何关系而非固定点击标签确定。

未复制参考公式、常量、helper 调用、点序列、类结构或代码。

### Approved canonical control model

PlotLibre version 1.0 固定四个显式语义控制点：

```text
controlPoints[0] = tail edge A
controlPoints[1] = tail edge B
controlPoints[2] = objective A
controlPoints[3] = objective B
```

Definition control schema：

```text
minPoints = 4
maxPoints = 4
completeOnDoubleClick = false
allowPointInsertion = false
allowPointRemoval = false
```

绘制流程：

```text
click tail edge A
→ click tail edge B
→ click objective A
→ pointer candidate shows four-point draft
→ click objective B auto-completes
```

该流程复用 Definition-driven `MultiPointDrawSession` 的 `completeAtMaximum`，不添加 symbol ID 特判。

### Deliberate semantic differences

已决定：

- 不持久化 three-point mirrored objective；
- 不在 PlotJSON 1.0 保存 fifth connection control；
- branch center 是 `branchPositionRatio` 派生点；
- tail pair 是无序对；
- objective pair 是无序对；
- 交换任一对控制点不改变 geometry；
- authored order 仍原样 PlotJSON round trip；
- 四个显式控制点全部生成 handles；
- branch/head/body/bridge/ring vertices 全部派生。

### Compound-symbol identity

`arrow.double` 必须是一个 connected simple Polygon，包含：

- shared tail/base；
- shared branching body；
- two exact tips；
- two derived heads；
- shared inner bridge。

禁止：

- 两个完整箭头存成数组；
- 两个独立 PlotFeature group；
- 对两个完整 attack-arrow Polygon 做 union；
- 把 derived branch/intersection 写入 PlotJSON controls。

### Proposed pure frame

设计了：

```text
DoubleArrowFrame
├─ projection
├─ exact tail pair
├─ exact objective pair
├─ canonical left/right identities
├─ tail center and width
├─ objective midpoint and separation
├─ primary direction
├─ derived branch center
├─ coupled wing centerlines
├─ left/right head frames
└─ shared inner bridge frame
```

Frame 必须位于 pure geometry package，不依赖 MapLibre、Store、interaction 或 DOM。

### Derived branch policy

```text
T = midpoint(tail pair)
O = midpoint(objective pair)
B = lerp(T, O, branchPositionRatio)
```

目标范围：

```text
0.15 <= branchPositionRatio <= 0.70
```

最终默认值由 PlotLibre golden fixture 校准，不复制公开参考常量。

### Proposed topology policy

必须在 Definition mutation 前拒绝：

- control count 不为 4；
- coincident tail pair；
- coincident objective pair；
- zero primary direction；
- tail/objective pair 与主方向近平行；
- objective 位于 tail 后方；
- wing 无法容纳 head；
- branch position 无有效 body/head 空间；
- head overlap；
- crossed wings；
- inner bridge crossing outer boundary；
- non-finite、非闭合或 self-intersecting ring。

拟定 Definition issue code：

```text
INVALID_DOUBLE_ARROW_GEOMETRY
```

### Proposed public API

```text
DOUBLE_ARROW_TYPE = "arrow.double"
DoubleArrowParameters
ResolvedDoubleArrowParameters
DEFAULT_DOUBLE_ARROW_PARAMETERS
resolveDoubleArrowParameters()
buildDoubleArrowFrame()
buildDoubleArrowRing()
doubleArrowDefinition
```

目标 version：

```text
1.0.0
```

目标 workspace：

```text
0.0.12
```

### Test plan

纯几何：

- deterministic golden；
- exact two tail edges and two tips；
- tail-pair swap invariance；
- objective-pair swap invariance；
- both-pairs swap invariance；
- symmetric and asymmetric cases；
- branch/head/inner-bridge parameter isolation；
- degenerate and topology rejection；
- antimeridian behavior；
- finite/closed/CCW/simple ring。

Definition/PlotJSON：

- Registry roles；
- `INVALID_DOUBLE_ARROW_GEOMETRY`；
- exact four-control round trip；
- derived branch absent from PlotJSON；
- parameter round trip。

Chromium：

- selector/sample count 7 → 8；
- fourth pointer candidate produces draft；
- fourth click auto-completes；
- four semantic handles；
- objective drag/revision/history/undo；
- committed Source and actual rendered feature；
- style reload restoration；
- existing 90 Node and 12 Chromium regressions remain green。

### Contract and roadmap updates

更新：

```text
AGENTS.md
docs/DEVELOPMENT_PLAN.md
```

新增：

```text
docs/design/arrow-double-semantic-design.md
docs/handover/2026-07-29-milestone-005h-double-arrow-semantic-design.md
```

## Validation

本阶段只改 Markdown，没有 public API 或 runtime code 变化。

必须运行：

```text
Node 20.19 validation
Node 22 validation
existing 90 Node tests
Playground /PlotLibre/ build
handover contract
existing 12 Chromium tests
```

设计 PR 只有在上述基线保持全绿后才可合并或进入实现阶段。

## Architectural decisions

1. exactly four explicit semantic controls；
2. fixed-count auto-completion at fourth click；
3. no persisted three-point mirror；
4. no fifth branch control in PlotJSON 1.0；
5. branch center derived from parameter；
6. tail and objective pairs are unordered；
7. geometry pair-order invariant；
8. one connected simple Polygon；
9. no union of complete arrow Polygons；
10. all controls exact and editable；
11. all branch/head/body/bridge vertices derived；
12. pure `DoubleArrowFrame` precedes public generator；
13. complete renderability validation before Store mutation；
14. interaction adapter remains Definition-driven。

## Known limitations

- no geometry implementation yet；
- no numerical parameter defaults yet；
- no golden fixture yet；
- no Definition/Registry/PlotJSON implementation yet；
- no eighth Playground entry yet；
- no actual `arrow.double` browser rendering yet；
- public Pages still contains seven symbols until 005H implementation merges；
- current execution environment cannot directly verify live GitHub Pages because DNS access is unavailable。

## Next tasks

1. open a design Draft PR；
2. run full existing CI baseline；
3. review and merge the semantic design；
4. create implementation branch from the merged design/main state；
5. add clean-room `docs/algorithms/arrow-double.md`；
6. implement pure `DoubleArrowFrame`；
7. implement coupled wings, two heads, shared bridge and one ring；
8. add golden and topology tests；
9. add Definition/Registry/PlotJSON；
10. bump workspace to `0.0.12`；
11. add eighth Playground selector/sample and Chromium tests；
12. add 005H implementation handover；
13. do not implement pincer、route、corridor or squad-combat in parallel。

## Risks and decisions

### Four controls versus reference recovery flexibility

PlotLibre intentionally rejects persisted 3-point symmetry and 5-point connection states in version 1.0. This removes hidden semantics but means imported external DoubleArrow data may need an explicit migration adapter later.

### Derived branch editability

The branch is not a control point. Initial editing uses a parameter and future parameter handle. Adding an explicit branch control later requires a versioned migration, not silent acceptance of five controls.

### Topology complexity

Two heads and one shared bridge can create multiple crossing modes. Final Definition validation must call generation-equivalent geometry checks before command execution.

### Interaction scope

Fixed-four auto-completion must use existing `MultiPointDrawSession`; do not add `arrow.double` conditions to interaction or MapLibre code.

### Clean-room scope

Reference source is used only to identify public behavior. Geometry formulas and defaults must be independently designed and calibrated through PlotLibre fixtures.

### Deployment

Design completion does not change the public symbol count. Do not announce eight-symbol Pages until the full implementation PR merges and the online page is verified.

## Continuation instructions

后续开发者或对话应：

1. 阅读 `AGENTS.md`；
2. 阅读 `docs/design/arrow-double-semantic-design.md`；
3. 阅读本交接；
4. 确认 design PR 和 CI；
5. 不修改已批准的四控制点契约，除非新增明确 migration proposal；
6. 从 pure `DoubleArrowFrame` 开始实现；
7. 保留 90 Node 和 12 Chromium 基线；
8. 完成实现后新增独立 005H implementation handover 并更新 `LATEST.md`。

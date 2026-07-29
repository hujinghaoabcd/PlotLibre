# PlotLibre Development Handover — Milestone 005H Double Arrow Semantic Design

日期：2026-07-29  
仓库：`hujinghaoabcd/PlotLibre`  
目标分支：`main`  
开发分支：`agent/double-arrow-semantic-design`  
Workspace：`0.0.11`  
状态：design-only; `arrow.double` 尚未成为公开符号

## Current state

Milestone 005G 已通过 PR #13 squash 合并到 `main`：

```text
main commit: 74611fe8dd39f5c2ad927ab2e9aeb56a9dadf304
```

005H 当前只完成 `arrow.double` canonical semantic design。没有新增 runtime code、public type、Definition、PlotJSON feature、Playground selector 或测试数量变化。

设计与不可变交接：

```text
docs/design/arrow-double-semantic-design.md
docs/handover/2026-07-29-milestone-005h-double-arrow-semantic-design.md
```

## Completed in this milestone

### Clean-room behavior research

研究指定公开 revision：

```text
sakitam-fdd/ol-plot
c919e60b4edeaeca53c08f9552f793b2ae9537f0
packages/ol-plot/src/geometry/Arrow/DoubleArrow.ts
```

只记录公开行为：独立 DoubleArrow Polygon、正常交互最多四点、三点临时对称状态、四点两个显式目标、恢复数据可带 connection control、左右由几何关系确定。

未复制参考公式、常量、helper layout、点序列、类结构或代码。

### Approved four-control contract

Version 1.0：

```text
controlPoints[0] = tail edge A
controlPoints[1] = tail edge B
controlPoints[2] = objective A
controlPoints[3] = objective B
```

Control schema：

```text
minPoints = 4
maxPoints = 4
completeOnDoubleClick = false
allowPointInsertion = false
allowPointRemoval = false
```

绘制：

```text
click tail A
→ click tail B
→ click objective A
→ fourth pointer candidate shows draft
→ click objective B auto-completes
```

### Explicit semantic decisions

- no persisted three-point mirrored objective；
- no fifth connection control in PlotJSON 1.0；
- branch center derived from `branchPositionRatio`；
- tail pair unordered；
- objective pair unordered；
- swapping either pair must not change geometry；
- authored order still round-trips；
- all four controls are exact handles；
- branch/head/body/bridge/ring vertices are derived。

### Compound-symbol identity

`arrow.double` 必须是一个 connected simple Polygon：

```text
shared tail/base
+ shared branching body
+ two exact objectives
+ two derived heads
+ shared inner bridge
```

禁止两个完整箭头数组、两个独立 PlotFeature group 或两个 attack-arrow Polygon union。

### Proposed frame

```text
DoubleArrowFrame
├─ local projection
├─ exact tail pair
├─ exact objective pair
├─ canonical left/right resolution
├─ tail center and width
├─ objective midpoint and separation
├─ primary direction
├─ derived branch center
├─ coupled wing centerlines
├─ two head frames
└─ shared inner bridge frame
```

### Branch and parameter design

```text
T = midpoint(tail pair)
O = midpoint(objective pair)
B = lerp(T, O, branchPositionRatio)
```

Target branch range：

```text
0.15 <= branchPositionRatio <= 0.70
```

Proposed parameter families：

```text
branchPositionRatio
headLengthRatio
maximumHeadLengthTailRatio
headHalfWidthTailRatio
neckHalfWidthTailRatio
bodyBulgeRatio
innerBridgeRatio
tension
segmentsPerSpan
miterLimit
minimumTailWidthMeters
maximumTailWidthMeters
```

数值 defaults 由 PlotLibre golden fixture 校准。

### Validation policy

拟定 issue：

```text
INVALID_DOUBLE_ARROW_GEOMETRY
```

必须拒绝 invalid count、coincident pairs、zero direction、pair-axis degeneracy、objective behind tail、short wing、invalid branch、head overlap、crossed wings、bridge crossing、non-finite 和 self-intersecting ring。

### Test and public API plan

Target API：

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

Target version/workspace：

```text
Definition 1.0.0
Workspace 0.0.12
```

测试计划包括 deterministic golden、exact tails/tips、三种 pair-swap invariance、parameter isolation、topology、PlotJSON、fixed-four auto-completion、第八个 selector/sample、actual rendered feature、objective drag/history/undo。

### Contract and roadmap

已更新：

```text
AGENTS.md
docs/DEVELOPMENT_PLAN.md
```

## Validation

本阶段只有 Markdown 设计变更。

必须保持现有基线：

```text
90 Node tests
12 Chromium tests
Node 20.19
Node 22
/PlotLibre/ build
handover contract
```

设计 Draft PR 全绿后再进入实现。

## Architectural decisions

1. exactly four explicit controls；
2. fourth click auto-completes；
3. no persisted three-point mirror；
4. no fifth branch control in PlotJSON 1.0；
5. branch is parameter-derived；
6. tail/objective pairs are unordered；
7. pair swapping is geometry-invariant；
8. one connected simple Polygon；
9. no union of complete arrows；
10. all four controls exact and editable；
11. all construction vertices derived；
12. pure `DoubleArrowFrame` before generator；
13. complete renderability validation before Store mutation；
14. interaction remains Definition-driven。

## Known limitations

- no double-arrow geometry yet；
- no numerical defaults/golden fixture yet；
- no public type/Definition/PlotJSON implementation yet；
- no eighth Playground option or browser rendering yet；
- public Pages remains seven symbols；
- live Pages cannot be directly verified in the current DNS-restricted execution environment。

## Next tasks

1. open design Draft PR；
2. run existing full CI baseline；
3. merge approved design；
4. create implementation branch；
5. add clean-room algorithm record；
6. implement `DoubleArrowFrame`；
7. implement coupled wings、two heads、shared bridge and one ring；
8. add golden/topology tests；
9. add Definition/Registry/PlotJSON；
10. bump workspace to `0.0.12`；
11. add eighth Playground selector/sample and Chromium tests；
12. add separate 005H implementation handover；
13. do not implement pincer、route、corridor or squad-combat in parallel。

## Risks and decisions

### External data migration

PlotLibre intentionally rejects persisted 3-point mirror and 5-point connection states in version 1.0. Importing external DoubleArrow data may require a future explicit adapter.

### Derived branch

Branch editability initially belongs to a parameter/future parameter handle. Adding a fifth control later requires a versioned migration.

### Topology

Two heads and one shared bridge create multiple crossing modes. Generation-equivalent Definition validation is mandatory.

### Interaction

Fixed-four completion must use existing `MultiPointDrawSession`; no `arrow.double` condition may be added to interaction or MapLibre code.

### Deployment

Design completion does not change public symbol count. Do not announce eight-symbol Pages until implementation merges and online content is verified.

## Continuation instructions

后续开发者或对话应：

1. 阅读 `AGENTS.md`；
2. 阅读 `docs/design/arrow-double-semantic-design.md`；
3. 阅读 005H design handover；
4. 确认 design PR 和 CI；
5. 不修改四控制点契约，除非新增明确 migration proposal；
6. 从 pure `DoubleArrowFrame` 开始实现；
7. 保留 90 Node 和 12 Chromium 基线；
8. 完成实现后新增独立 005H implementation handover 并更新本文件。

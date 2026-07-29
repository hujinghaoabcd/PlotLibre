# PlotLibre 开发路线图

## 总体策略

采用“单符号完整纵向切片”：每个阶段同时完成语义数据、纯几何、Definition、PlotJSON、交互、Playground、真实浏览器测试、算法文档和交接文件。禁止并行堆叠多个缺乏测试和语义边界的箭头类型。

## 里程碑状态

| 里程碑 | 主要成果 | 状态 |
|---|---|---|
| 001–004 | Workspace、Core、交互、Playground、Geometry foundations | 已完成 |
| 005A | `arrow.fine` | 已完成并合并 |
| 005B | `arrow.fine.tailed`、共享 `FineArrowFrame` | 已完成并合并 |
| 005C | `arrow.assault-direction` | 已完成并合并 |
| 005D | `MultiPointDrawSession` | 已完成并合并 |
| 005E | `arrow.curved` | 已完成并合并 |
| 005F | `arrow.attack`、`AttackArrowFrame`、完整几何预检 | 已完成并合并 |
| 005G | `arrow.attack.tailed` | 已完成并合并 |
| 005H-D | `arrow.double` canonical semantic design | PR #14 已合并 |
| 005H-I | `arrow.double` 完整纵向切片 | PR #15 Draft，等待最终 CI |

当前实现分支：

```text
branch:            agent/double-arrow-vertical-slice
workspace version: 0.0.12
built-in symbols:  8
```

当前分支公开箭头：

```text
arrow.straight
arrow.fine
arrow.fine.tailed
arrow.assault-direction
arrow.curved
arrow.attack
arrow.attack.tailed
arrow.double
```

## Milestone 005H：`arrow.double`

设计文档：

```text
docs/design/arrow-double-semantic-design.md
```

算法记录：

```text
docs/algorithms/arrow-double.md
```

### 固定语义控制点

```text
controlPoints[0] = tail edge A
controlPoints[1] = tail edge B
controlPoints[2] = objective A
controlPoints[3] = objective B
```

```text
minPoints = 4
maxPoints = 4
completeOnDoubleClick = false
```

绘制时，第四次点击自动完成。tail pair 与 objective pair 均为无序对；交换任一对输入不改变派生几何。branch center 由参数派生，不作为第五个控制点持久化。

### 已实现

- pure `DoubleArrowFrame` 与局部米制投影；
- exact two tail edges and two objective tips；
- canonical left/right pair resolution；
- derived branch center；
- coupled left/right Catmull–Rom wing centerlines；
- two reusable exact-tip arrow heads；
- shared concave inner bridge；
- one connected Polygon ring；
- head neck-plane boundary trimming；
- closed/counterclockwise/simple-ring policy；
- Definition/Registry/PlotJSON；
- `INVALID_DOUBLE_ARROW_GEOMETRY` 完整生成预检；
- fixed-four MapLibre preview/auto-completion；
- four semantic handles、edit、history、undo；
- 第八个 Playground selector/sample；
- Node 与 Chromium 覆盖；
- deterministic golden、pair-swap 和 topology tests。

### 参数族

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

### 必须拒绝

- control count 不为四；
- coincident tail/objective pair；
- pair 不跨越 primary direction；
- objective separation 不能容纳两个头部；
- 任一 objective 位于派生前向尾部平面之后；
- invalid branch/bridge/head parameters；
- head/shaft、wing 或 bridge 交叉；
- non-finite、degenerate 或 self-intersecting ring。

### 合并前验收

1. Node 20.19 success；
2. Node 22 success；
3. all Node tests success；
4. Playground typecheck/build success；
5. Chromium success；
6. handover contract success；
7. PR 从 Draft 切换 Ready；
8. 合并后 Pages 八符号部署 success。

005H 合并前不实现 pincer、route、corridor、squad-combat 或其他复杂箭头。

## 后续里程碑

### Milestone 006A：`arrow.pincer` 语义设计

必须先独立冻结 pincer 的控制点、connection policy、orientation、frame、parameters、topology 和验收，不直接复制或重命名 `arrow.double`。

### Milestone 006B：后续复杂箭头

- squad combat；
- route；
- corridor；
- multi-head extensions。

### Milestone 007：专业编辑

多选、框选、套索、移动、旋转、缩放、分组、锁定、触摸和多对象事务。

### Milestone 008：吸附和约束

RBush、顶点/线段/中点/交点吸附、角度/方位/平行/垂直约束和 guides。

### Milestone 009：区域、旗帜和注记

Arc、sector、lune、closed curve、gathering place、flags、callout 和区域控制措施。

### Milestone 010：IO 和项目管理

PlotJSON Schema/migrations、GeoJSON、SVG/PNG、图层、分组、z-order、自动保存。

### Milestone 011：MIL-STD/APP-6

可选 `mil-sym-ts` 后端、SIDC、modifiers、单点和多点标准符号。

### Milestone 012：框架与协作

React、Vue、CRDT、持久化、审计和权限。

### Milestone 013：1.0

稳定 API、50+ 原生参数化符号、完整编辑、浏览器矩阵、文档站、性能、许可证和发布流程。

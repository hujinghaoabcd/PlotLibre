# PlotLibre 开发路线图

## 总体策略

采用“单符号完整纵向切片”：一个新符号在同一 PR 中完成语义、纯几何、Definition、PlotJSON、交互、Playground、浏览器测试、算法记录和交接。只有存在未解决的语义争议时才单独创建设计 PR。

当前用户目标是优先扩大符号库，不再继续钳形箭头边界加固。每完成一个符号即进入下一个符号；公共稳定性问题集中在阶段性回归中处理。

## 当前基线

```text
workspace:          0.0.16
public Arrow types: 10
Node tests:         135
Chromium tests:     19
active branch:      agent/squad-combat-arrow
active PR:          #27 Add squad combat arrow
```

公开箭头：

```text
arrow.straight
arrow.fine
arrow.fine.tailed
arrow.assault-direction
arrow.curved
arrow.attack
arrow.attack.tailed
arrow.double
arrow.pincer
arrow.squad-combat
```

## 已完成里程碑

| 里程碑 | 主要成果 | 状态 |
|---|---|---|
| 001–004 | Workspace、Core、History、PlotJSON、MapLibre、Geometry foundations | 已完成 |
| 005A–005C | 细箭头、燕尾细箭头、突击方向 | 已完成 |
| 005D–005G | MultiPoint、曲线箭头、攻击箭头、燕尾攻击箭头 | 已完成 |
| 005H | 双箭头 | 已完成 |
| 006A–006D | 钳形箭头、自然点击顺序、失败原因提示 | 已完成 |
| 006E | 分队战斗箭头 | PR #27 |

## Milestone 006E：`arrow.squad-combat`

### 语义控制点

```text
controlPoints[0]      = tail centre
controlPoints[1..n-2] = optional action-path controls
controlPoints[n-1]    = exact objective/tip
```

```text
minPoints = 2
maxPoints = 64
completeOnDoubleClick = true
```

两点可以直接形成直线分队战斗箭头；增加中间点可以改变行动路径。尾缘与尾宽由局部米制路径派生，不进入 Store、handles、History 或 PlotJSON。

### 与攻击箭头的区别

```text
arrow.attack
0 + 1 = authored tail edges
2..n = authored spine and objective

arrow.squad-combat
0     = authored tail centre
1..n  = authored path and objective
derived left/right tail edges = transient geometry inputs
```

### 实现范围

- 独立 centre-path → temporary-tail derivation；
- 复用已验证的 AttackArrow body/head construction；
- 局部米制投影；
- path-length-derived tail width；
- 两点和多点形态；
- Definition/Registry/PlotJSON；
- schema-driven variable two-point session；
- 十类型 Playground selector/sample；
- Node 与 Chromium 回归；
- clean-room algorithm record；
- workspace `0.0.16`。

### 合并条件

1. Node 20.19 success；
2. Node 22 success；
3. 135 Node tests success；
4. Playground typecheck/build success；
5. 19 Chromium tests success；
6. handover contract success；
7. unresolved review threads = 0；
8. PR #27 Ready and squash merged；
9. merge SHA 与 `main` identical。

## 后续新符号顺序

### Milestone 006F：`arrow.route`

下一符号。先冻结中心路线、左右边界、起终点和宽度语义，再完成单 PR 纵向切片。

### Milestone 006G：`arrow.corridor`

在 route 之后开发，明确 corridor 与 route 的宽度、端部和控制点差异。

### Milestone 006H：multi-head extensions

在 route/corridor 稳定后再开发多头扩展，不与前两个符号并行。

### Milestone 007：专业编辑

多选、框选、套索、移动、旋转、缩放、分组、锁定、触摸和多对象事务。

### Milestone 008：吸附和约束

RBush、顶点/线段/中点/交点吸附、角度/方位/平行/垂直约束和 guides。

### Milestone 009：区域、旗帜和注记

Arc、sector、lune、closed curve、gathering place、flags、callout 和区域控制措施。

### Milestone 010：IO 和项目管理

PlotJSON Schema/migrations、GeoJSON、SVG/PNG、图层、分组、z-order、自动保存。

### Milestone 011：MIL-STD/APP-6

可选符号后端、SIDC、modifiers、单点和多点标准符号。

### Milestone 012：框架与协作

React、Vue、CRDT、持久化、审计和权限。

### Milestone 013：1.0

稳定 API、50+ 原生参数化符号、完整编辑、浏览器矩阵、文档站、性能、许可证和发布流程。

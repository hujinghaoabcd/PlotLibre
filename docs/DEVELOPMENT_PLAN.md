# PlotLibre 开发路线图

## 总体策略

采用“相关符号组完整纵向切片”：具有同一数学基础的 2–3 个符号可以在同一 PR 中完成共享几何、独立语义、Definition、PlotJSON、交互、Playground、浏览器测试、算法记录和交接。禁止为了批量开发而复制整套生成器，也禁止仅通过不同默认参数伪造新符号。

单个复杂耦合符号仍可独立成组。只有存在未解决的语义争议时才单独创建设计 PR。

当前用户目标是优先扩大符号库，不再继续钳形箭头边界加固。完成一个相关符号组后直接进入下一组；公共稳定性问题集中在阶段性回归中处理。

## 当前基线

```text
workspace:          0.0.18
public Arrow types: 14
Node tests:         154
Chromium tests:     20
active branch:      agent/route-multihead-group
active PR:          #29 Add route multi-head symbol group
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
arrow.route
arrow.corridor
arrow.route.bidirectional
arrow.route.double-head
```

## 已完成里程碑

| 里程碑 | 主要成果 | 状态 |
|---|---|---|
| 001–004 | Workspace、Core、History、PlotJSON、MapLibre、Geometry foundations | 已完成 |
| 005A–005C | 细箭头、燕尾细箭头、突击方向 | 已完成 |
| 005D–005G | MultiPoint、曲线箭头、攻击箭头、燕尾攻击箭头 | 已完成 |
| 005H | 双箭头 | 已完成 |
| 006A–006D | 钳形箭头、自然点击顺序、失败原因提示 | 已完成 |
| 006E | 分队战斗箭头 | 已完成并合并 |
| 006F–006G | 路线箭头 + 走廊箭头共享 PathRibbon 基础 | 已完成并合并 |
| 006H | 双向路线 + 双头路线共享多头路径基础 | PR #29 |

## Milestone 006H：Route Multi-Head 相关符号组

### 共享中心路径

两个符号均保存用户定义的中心路径：

```text
controlPoints[0]      = exact start / route origin
controlPoints[1..n-2] = optional path controls
controlPoints[n-1]    = exact end / primary objective
```

```text
minPoints = 2
maxPoints = 64
completeOnDoubleClick = true
```

共享多头路线几何负责：

- `PathRibbonFrame` 局部米制投影与中心线采样；
- 路径长度派生宽度；
- 起终点切向与 neck plane；
- 距离切片和 offset shaft；
- primary/secondary head construction；
- 每个 Polygon 组件的 finite/closed/winding/simple validation。

所有 sampled centerline、offset、width、neck 和 head vertices 均为派生数据，不进入 Store、handles、History 或 PlotJSON。

### `arrow.route.bidirectional`

双向路径符号：

- 首点和末点都是精确箭尖；
- 两端具有同等方向强调；
- shaft 仅位于两个派生 neck plane 之间；
- 输出一个闭合、逆时针、简单 Polygon；
- 反转控制点顺序仍保持双尖拓扑。

### `arrow.route.double-head`

同向双头路径符号：

- 末点为精确 primary objective/tip；
- 主体保持普通 route 语义；
- secondary emphasis head 在 primary neck 后方沿相同路径派生；
- secondary head 为独立 Polygon render component；
- secondary 参数不得改变 primary route body。

### 合并条件

1. Node 20.19 success；
2. Node 22 success；
3. 154 Node tests success；
4. Playground typecheck/build success；
5. 20 Chromium tests success；
6. 十四类型 draft/committed 实际渲染矩阵 success；
7. handover contract success；
8. unresolved review threads = 0；
9. PR #29 Ready and squash merged；
10. merge SHA 与 `main` identical。

## 后续符号组顺序

### Milestone 006I：闭合行动区域组

开发 2–3 个共享闭合曲线基础的区域符号，优先考虑：

```text
area.closed-curve
area.gathering-place
area.route-loop
```

实现前冻结公共标识符、最少控制点、自动闭合规则、方向语义和 Polygon/LineString 输出。不得将普通自由手绘 GeoJSON 当作 canonical state。

### Milestone 006J：弧形与扇形区域组

开发 arc、sector、lune 等共享圆弧/方位角基础的区域符号。

### Milestone 007：专业编辑

多选、框选、套索、移动、旋转、缩放、分组、锁定、触摸和多对象事务。

### Milestone 008：吸附和约束

RBush、顶点/线段/中点/交点吸附、角度/方位/平行/垂直约束和 guides。

### Milestone 009：区域、旗帜和注记

更多 closed curve、flags、callout 和区域控制措施。

### Milestone 010：IO 和项目管理

PlotJSON Schema/migrations、GeoJSON、SVG/PNG、图层、分组、z-order、自动保存。

### Milestone 011：MIL-STD/APP-6

可选符号后端、SIDC、modifiers、单点和多点标准符号。

### Milestone 012：框架与协作

React、Vue、CRDT、持久化、审计和权限。

### Milestone 013：1.0

稳定 API、50+ 原生参数化符号、完整编辑、浏览器矩阵、文档站、性能、许可证和发布流程。

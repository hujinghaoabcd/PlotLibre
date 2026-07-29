# PlotLibre 开发路线图

## 总体策略

采用“相关符号组完整纵向切片”：具有同一数学基础的 2–3 个符号可以在同一 PR 中完成共享几何、独立语义、Definition、PlotJSON、交互、Playground、浏览器测试、算法记录和交接。禁止为了批量开发而复制整套生成器，也禁止仅通过不同默认参数伪造新符号。

单个复杂耦合符号仍可独立成组。只有存在未解决的语义争议时才单独创建设计 PR。

当前用户目标是优先扩大符号库，不再继续钳形箭头边界加固。完成一个相关符号组后直接进入下一组；公共稳定性问题集中在阶段性回归中处理。

## 当前基线

```text
workspace:          0.0.17
public Arrow types: 12
Node tests:         145
Chromium tests:     20
active branch:      agent/route-corridor-symbol-group
active PR:          #28 Add route and corridor symbol group
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
| 006F–006G | 路线箭头 + 走廊箭头共享 PathRibbon 基础 | PR #28 |

## Milestone 006F–006G：Route/Corridor 相关符号组

### 共享中心路径

两个符号均保存用户定义的中心路径：

```text
controlPoints[0]      = path start / endpoint A
controlPoints[1..n-2] = optional path controls
controlPoints[n-1]    = objective tip / endpoint B
```

```text
minPoints = 2
maxPoints = 64
completeOnDoubleClick = true
```

共享 `PathRibbonFrame` 负责：

- 局部米制投影；
- Catmull–Rom 中心线采样；
- 路径长度测量；
- `width = pathLength × widthPathRatio`；
- 左右 offset 与 bounded miter；
- finite/closed/winding/simple topology validation。

所有 sampled centerline、offset、width、neck、head 和 polygon vertices 均为派生数据，不进入 Store、handles、History 或 PlotJSON。

### `arrow.route`

有方向路径符号：

- 起点为路线起点；
- 末点为精确 objective/tip；
- 路径带在派生 neck plane 截断；
- 使用独立 exact-tip arrow head 闭合；
- 不是分队战斗箭头的参数变体。

### `arrow.corridor`

无方向路径符号：

- 两端均为普通走廊端点；
- 左右边界以平头端盖闭合；
- 不包含隐藏、零宽或退化箭头头部；
- 与 route 共享路径带基础，但保持独立闭合结构。

### 合并条件

1. Node 20.19 success；
2. Node 22 success；
3. 145 Node tests success；
4. Playground typecheck/build success；
5. 20 Chromium tests success；
6. 十二类型 draft/committed 实际渲染矩阵 success；
7. handover contract success；
8. unresolved review threads = 0；
9. PR #28 Ready and squash merged；
10. merge SHA 与 `main` identical。

## 后续符号组顺序

### Milestone 006H：多头路径扩展组

在 Route/Corridor 合并后开发 2–3 个共享分叉路径基础的多头符号。先冻结分叉点、目标点、路径耦合和 PlotJSON 语义，再决定具体公共标识符。不得把 `arrow.double` 直接重命名或套壳。

### Milestone 006I：闭合行动区域组

开发 closed route、gathering place、freehand closed curve 等共享闭合曲线基础的区域符号。

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

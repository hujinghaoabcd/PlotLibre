# PlotLibre 开发路线图

## 总体策略

采用“单符号完整纵向切片”：每个阶段同时完成语义数据、纯几何、Definition、PlotJSON、交互、Playground、真实浏览器测试、算法文档和交接文件。

## 已完成里程碑

| 里程碑 | 主要成果 | 状态 |
|---|---|---|
| 001 | Workspace、Core、Registry、Store、History、PlotJSON、`arrow.straight` | 已完成 |
| 002 | `TwoPointDrawSession`、draft、handles、选择、拖动、undo/redo | 已完成 |
| 003 | Vite Playground、MapLibre 6、Pages、Worker 打包、真实渲染测试 | 已完成 |
| 004 | Vector、Polyline、Curve、Offset、Ring、Geodesic、Arrow components | 已完成 |
| 005A | `arrow.fine` | 已完成并合并 |
| 005B | `arrow.fine.tailed`、共享 `FineArrowFrame` | 已完成并合并 |
| 005C | `arrow.assault-direction` | 实现与首轮 CI 已完成 |

关键主线提交：

```text
06e392aaec42bd89ee4856244be49df7a9d934ba  geometry foundation
c738d72b0ccf49f3487697791083ba0d15286a75  fine arrow
994033a5d131e1221fc47cb19f96824d856d3c15  tailed fine arrow
```

## Milestone 005C：`arrow.assault-direction`

状态：**功能和首轮 CI 已完成，等待最终交接和合并**。

### 已完成

- 独立 `AssaultDirectionParameters`；
- `buildAssaultDirectionRing()`；
- 宽体近恒宽箭身；
- 颈部内收；
- 明显肩部；
- `headAngleDegrees` 角度定义箭翼；
- 动态箭翼宽度上限；
- simple-ring 验证；
- 精确语义 tip；
- `arrow.assault-direction` Definition；
- built-in catalog；
- PlotJSON round trip；
- 赤道黄金 fixture；
- 与 `arrow.fine` 的宽体差异测试；
- 角度参数隔离测试；
- 两点 DrawSession 和 handles 复用；
- Playground 第四个 selector option；
- 四类南京示例；
- Chromium actual rendered-feature；
- `docs/algorithms/arrow-assault-direction.md`；
- workspace `0.0.7`。

首轮 CI：

```text
Run ID: 30391839421
Node tests: 47 passed
validate 20.19: success
validate 22: success
browser: success
```

### 核心区别

`arrow.assault-direction` 不是 FineArrow 参数别名：

```text
FineArrow:
  narrow tapered shaft
  width-ratio head

AssaultDirection:
  broad near-constant shaft
  explicit neck inset
  angle-defined triangular head
  pronounced shoulder
```

## 下一步：Milestone 005D `arrow.curved`

这是第一个多点符号，实施前必须先完成交互和语义设计。

### 1. 控制点语义

建议：

```text
controlPoints[0]       = tail center
controlPoints[1..n-2]  = centerline shape controls
controlPoints[n-1]     = tip
minimum points         = 3
```

需要明确：

- 单击追加控制点；
- 双击或 Enter 完成；
- Escape 取消；
- Backspace 删除最后一个未提交点；
- 控制点插入和删除；
- 中点 handles 是否在第一版实现。

### 2. 几何

- `cleanPolyline()`；
- Catmull-Rom/Hermite centerline；
- centerline sampling；
- variable-width offset；
- shared arrow head；
- ring winding；
- self-intersection rejection or documented fallback；
- local/geodesic mode analysis。

### 3. 新交互基础

需要新增 engine-independent：

```text
MultiPointDrawSession
```

它不能写死 `arrow.curved`，应服务后续 attack、route 和 corridor 类型。

### 4. 验收

- Definition；
- PlotJSON；
- golden fixture；
- property/degenerate tests；
- multi-point session tests；
- handles；
- Playground selector；
- Chromium actual rendered feature；
- 算法文档；
- handover。

在 `arrow.curved` 完成前，不并行实现 attack、double 或 route arrows。

## 后续里程碑

### Milestone 005E：`arrow.attack`

多点攻击方向中心线、variable-width body、多点完成规则、Golden/property/browser tests。

### Milestone 005F：`arrow.attack.tailed`

复用 attack body/frame，仅增加 tail strategy。

### Milestone 006：复杂箭头

- `arrow.double`；
- `arrow.pincer`；
- squad combat；
- route；
- corridor；
- multi-head。

### Milestone 007：专业编辑

多选、框选、套索、移动、旋转、缩放、分组、锁定、触摸和多对象事务。

### Milestone 008：吸附和约束

RBush、顶点/线段/中点/交点吸附、角度/方位/平行/垂直约束和 guides。

### Milestone 009：曲线、区域、旗帜和注记

Arc、sector、lune、closed curve、gathering place、flags、callout 和区域控制措施。

### Milestone 010：IO 和项目管理

PlotJSON Schema/migrations、GeoJSON、SVG/PNG、图层、分组、z-order、自动保存。

### Milestone 011：MIL-STD/APP-6

可选 `mil-sym-ts` 后端、SIDC、modifiers、单点和多点标准符号。

### Milestone 012：框架与协作

React、Vue、CRDT、持久化、审计和权限。

### Milestone 013：1.0

稳定 API、50+ 原生参数化符号、完整编辑、浏览器矩阵、文档站、性能、许可证和发布流程。

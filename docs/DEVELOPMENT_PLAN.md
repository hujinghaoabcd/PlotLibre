# PlotLibre 开发路线图

## 总体策略

采用“单符号完整纵向切片”：每个阶段同时完成语义数据、纯几何、Definition、PlotJSON、交互、Playground、真实浏览器测试、算法文档和交接文件。

禁止在一个阶段并行堆叠多个缺乏测试和语义边界的箭头类型。

## 已完成里程碑

| 里程碑 | 主要成果 | 状态 |
|---|---|---|
| 001 | Workspace、Core、Registry、Store、History、PlotJSON、`arrow.straight` | 已完成 |
| 002 | `TwoPointDrawSession`、draft、handles、选择、拖动、undo/redo | 已完成 |
| 003 | Vite Playground、MapLibre 6、Pages、Worker 打包、真实渲染测试 | 已完成 |
| 004 | Vector、Polyline、Curve、Offset、Ring、Geodesic、Arrow components | 已完成 |
| 005A | `arrow.fine` | 已完成并合并 |
| 005B | `arrow.fine.tailed`、共享 `FineArrowFrame` | 已完成并合并 |
| 005C | `arrow.assault-direction` | 已完成并合并 |
| 005D | `MultiPointDrawSession` 与统一 `doubleClick()` 协议 | 已完成并合并 |
| 005E | `arrow.curved` 与 MapLibre 多点绘制/编辑 | 实现和完整 CI 已完成，等待交接与合并 |

关键主线提交：

```text
06e392aaec42bd89ee4856244be49df7a9d934ba  geometry foundation
c738d72b0ccf49f3487697791083ba0d15286a75  fine arrow
994033a5d131e1221fc47cb19f96824d856d3c15  tailed fine arrow
dbee8938e1a522d6cb6d9e78c9518b28d1eb04e9  assault direction
89e87e879d1c766eac500796e8a53c88f20f8bbe  multipoint session foundation
```

## Milestone 005E：`arrow.curved`

状态：**完整功能和 CI 已完成，等待最终交接和合并**。

### 语义模型

```text
controlPoints[0]       = tail center
controlPoints[1..n-2]  = path controls
controlPoints[n-1]     = exact semantic tip
minimum points         = 3
maximum points         = 64
```

派生曲线样点、offset 顶点和 Polygon 顶点不进入 PlotJSON，也不作为编辑 handles。

### 已完成几何

- `CurvedArrowParameters`；
- `buildCurvedArrowRing()`；
- local metre projection；
- consecutive duplicate cleanup；
- Catmull–Rom/Hermite centerline；
- cumulative arc-length measurement；
- variable-width tapered shaft；
- terminal tangent aligned arrow head；
- exact semantic tip restoration；
- counterclockwise ring normalization；
- closed/finite/simple ring validation；
- self-intersection explicit rejection；
- head/shaft junction reverse-bend fix；
- deterministic 56-coordinate golden fixture。

### 已完成交互

- Definition 点数约束自动选择 `TwoPointDrawSession` 或 `MultiPointDrawSession`；
- MapLibre `dblclick` → `DrawSession.doubleClick()`；
- active drawing preventDefault/stopPropagation；
- double-click zoom disable/restore；
- Enter completion；
- Escape cancel；
- Backspace/Delete drawing-point removal；
- 所有语义控制点 handles；
- interior handle drag；
- one drag = one ReplacePlotCommand；
- undo 恢复中间路径控制点。

### 已完成数据和符号

- `CURVED_ARROW_TYPE = "arrow.curved"`；
- `curvedArrowDefinition`；
- built-in catalog；
- fill/outline/hit-area；
- PlotJSON full-path round trip；
- workspace `0.0.9`。

### 已完成 Playground

- 第五个 selector option：曲线箭头；
- 五类南京示例；
- 四点曲线示例；
- 多点操作提示；
- double-click/Enter completion；
- Backspace/Delete 退点说明；
- semantic-handle editing；
- actual Source/rendered-feature checks。

### 验证

Node：

```text
65 tests passed
0 failed
```

完整绿色运行：

```text
Run ID: 30398030416
validate 20.19: success
validate 22: success
browser: success
```

真实 CI 发现并修复：

1. head trim point 与 tangent neck 同时保留导致肩部反向短折和自交；
2. 过紧 S 形路径应由 simple-ring policy 明确拒绝；
3. E2E 初始轨迹本身过紧，无法产生合法 draft；
4. MapLibre `querySourceFeatures()` 可返回分瓦片重复 Feature，handles 必须按语义 `handleIndex` 去重验证。

### 算法记录

```text
docs/algorithms/arrow-curved.md
```

实现为 clean-room：仅参考公开多点曲线箭头行为，不复制参考库源码、类结构、参数或常量。

## 下一步：Milestone 005F `arrow.attack`

`arrow.attack` 将是第二个多点箭头，但不能简单复用 `arrow.curved` 的默认参数。

### 目标结构

```text
multi-point centerline
+ broad variable-width attack body
+ explicit head/neck transition
+ attack-specific tail strategy
```

### 实施顺序

1. 研究公开攻击箭头行为和术语，完成 clean-room provenance；
2. 明确控制点语义与最小/最大点数；
3. 抽取可复用的 multi-point arrow body/frame；
4. 保持 `arrow.curved` 既有 golden contract；
5. 实现 attack-specific width/head/tail strategy；
6. 增加 simple-ring、自交和退化策略；
7. PlotDefinition 与 PlotJSON；
8. MultiPointDrawSession 复用；
9. Playground selector/sample；
10. Chromium draw/edit/rendered-feature tests；
11. 不可变交接。

在 `arrow.attack` 完成前，不实现 `arrow.attack.tailed`、double、pincer、route 或 corridor。

## 后续里程碑

### Milestone 005G：`arrow.attack.tailed`

复用 attack body/frame，仅增加独立燕尾策略；必须证明与平尾 attack 的真实结构差异。

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

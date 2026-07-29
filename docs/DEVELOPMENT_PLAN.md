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
| 005E | `arrow.curved` 与 MapLibre 多点绘制/编辑 | 已完成并合并 |
| 005F | `arrow.attack`、`AttackArrowFrame`、完整几何预检、相机稳定修复 | 已完成并合并 |
| 005G | `arrow.attack.tailed`、共享攻击 frame、独立燕尾闭合 | 已完成，等待 PR #13 合并 |

当前 workspace：

```text
0.0.11
```

当前公开箭头：

```text
arrow.straight
arrow.fine
arrow.fine.tailed
arrow.assault-direction
arrow.curved
arrow.attack
arrow.attack.tailed
```

## Milestone 005G：`arrow.attack.tailed`

状态：**代码、测试、Playground 和第一轮权威 CI 已完成**。

### 语义模型

与 `arrow.attack` 完全一致：

```text
controlPoints[0]       = exact tail edge A
controlPoints[1]       = exact tail edge B
controlPoints[2..n-2]  = attack-spine controls
controlPoints[n-1]     = exact objective/tip
minimum points         = 3
maximum points         = 64
```

燕尾根点和内凹点是派生几何，不进入 PlotJSON，也不是语义 handles。

### 独立结构

```text
AttackArrowFrame
+ shared body/head golden geometry
+ independent inward swallowtail closing strategy
```

新增参数：

```text
tailNotchDepthRatio = notch depth / full semantic tail width
tailNotchWidthRatio = notch opening / full semantic tail width
```

默认值：

```text
0.75
0.65
```

### 已完成几何

- `TailedAttackArrowParameters`；
- `ResolvedTailedAttackArrowParameters`；
- `DEFAULT_TAILED_ATTACK_ARROW_PARAMETERS`；
- `resolveTailedAttackArrowParameters()`；
- `buildTailedAttackArrowRing()`；
- exact semantic tail edges and tip；
- tail-input-order independence；
- independent depth and opening-width parameters；
- neck-distance and neck-plane guards；
- finite/closed/CCW/simple-ring validation；
- explicit self-intersection rejection；
- complete Definition-level renderability validation。

### 关系型 golden

测试不是单独复制一份完整 Polygon 快照，而是证明：

```text
tailed body/head coordinates
= flat attack golden coordinates
```

燕尾 ring 只增加三个独立 notch vertices，并保持平尾攻击箭头 body/head 的逐坐标结果不变。

### 已完成 Definition 与数据

- `TAILED_ATTACK_ARROW_TYPE = "arrow.attack.tailed"`；
- `tailedAttackArrowDefinition` version `1.0.0`；
- built-in catalog；
- fill/outline/hit-area；
- full semantic-path PlotJSON；
- notch parameter round trip；
- workspace `0.0.11`。

### 已完成 Playground

- 第七个 selector option；
- 第七个南京示例；
- 燕尾攻击箭头说明；
- 平尾/燕尾攻击箭头真实四点绘制；
- camera stability and zoom restoration；
- actual committed Source/rendered-feature checks；
- tail handle drag、revision、History 和 undo；
- Worker 与 `/PlotLibre/` build 回归。

### 第一轮权威验证

```text
Run ID: 30419114264
Node 20.19: success
Node 22: success
Node tests: 90 passed
Chromium: 12 passed
Pages build: success
handover contract: success
```

### 算法记录

```text
docs/algorithms/arrow-attack-tailed.md
```

实现为 clean-room：仅参考公开行为和术语，不复制参考源码、常量、helper layout 或公式。

## 下一步：Milestone 005H `arrow.double`

双箭头不能实现为“两个独立箭头组成一个数组”。开始编码前必须先完成语义设计。

### 待解决语义问题

1. 哪些控制点定义共享尾部或连接体；
2. 哪些控制点定义左、右箭头目标；
3. 是否显式保存中心连接/转折控制点；
4. 如何定义左右 handedness 与输入顺序无关性；
5. 如何保证两个头部、分叉 body 和中心连接不自交；
6. 最少控制点和 double-click completion 规则；
7. 哪些 branch/intersection 点属于派生几何。

### 实施顺序

1. 公开行为与数学语义研究；
2. clean-room provenance；
3. canonical control schema；
4. 独立 branch/head frame 或 primitives；
5. topology policy；
6. deterministic golden fixture；
7. Definition 和 PlotJSON；
8. MultiPoint interaction；
9. 第八个 Playground selector/sample；
10. Chromium draw/render/edit/undo；
11. README、路线图、算法文档和不可变交接；
12. 合并后验证 Pages 八符号部署。

在 005H 完成前，不实现 pincer、route、corridor、squad-combat 或其他复杂箭头。

## 后续里程碑

### Milestone 006：复杂箭头后续切片

- `arrow.pincer`；
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

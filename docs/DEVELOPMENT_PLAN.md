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
| 005F | `arrow.attack`、`AttackArrowFrame`、完整几何预检、相机稳定修复 | 已完成，等待 PR #12 合并 |

当前 workspace：

```text
0.0.10
```

当前公开箭头：

```text
arrow.straight
arrow.fine
arrow.fine.tailed
arrow.assault-direction
arrow.curved
arrow.attack
```

## Milestone 005F：`arrow.attack`

状态：**完整功能、文档和权威 CI 已完成**。

### 语义模型

```text
controlPoints[0]       = exact tail edge A
controlPoints[1]       = exact tail edge B
controlPoints[2..n-2]  = attack-spine controls
controlPoints[n-1]     = exact objective/tip
minimum points         = 3
maximum points         = 64
```

与 `arrow.curved` 不同，攻击箭头的宽度来自两个精确尾缘控制点之间的距离，而不是单一 tail center 和路径长度。

### 已完成几何

- `AttackArrowParameters`；
- `DEFAULT_ATTACK_ARROW_PARAMETERS`；
- `resolveAttackArrowParameters()`；
- `AttackArrowFrame`；
- `buildAttackArrowFrame()`；
- `buildAttackArrowRing()`；
- local metre projection around tail midpoint；
- tail input-order independence；
- exact semantic tail width；
- Catmull–Rom/Hermite spine；
- cumulative arc length；
- broad body and configurable bulge；
- neck narrowing；
- terminal-tangent head；
- exact tail vertices and tip；
- finite/closed/CCW/simple-ring validation；
- explicit self-intersection rejection；
- deterministic golden fixture。

### 已完成交互

- Definition-driven `MultiPointDrawSession`；
- third-candidate valid draft；
- double-click/Enter completion；
- Escape and Backspace/Delete；
- all tail/spine semantic handles；
- one valid drag = one `ReplacePlotCommand`；
- undo restore；
- invalid preview rejected before Store mutation；
- double-click zoom deferred restoration，防止完成时地图 2× 跳变。

### 已完成数据和符号

- `ATTACK_ARROW_TYPE = "arrow.attack"`；
- `attackArrowDefinition` version `1.0.0`；
- built-in catalog；
- fill/outline/hit-area；
- full semantic-path PlotJSON；
- Definition-level renderability validation；
- workspace `0.0.10`。

### 已完成 Playground

- 第六个 selector option；
- 六类南京示例；
- 尾缘 A/B、spine、objective 操作说明；
- 四点攻击箭头真实绘制；
- actual committed Source/rendered-feature checks；
- tail handle drag/history/undo；
- Worker 与 Pages build 回归。

### 验证

最终权威同步运行：

```text
Run ID: 30413156622
Head: c3d229ef0507b56dd51c6225c396aedc309ce547
Node 20.19: success
Node 22: success
Node tests: 78 passed
Chromium: 12 passed
Pages build: success
handover contract: success
```

真实 CI/trace 发现并修复：

1. 测试尾缘与初始进攻方向近平行；
2. `dblclick` 中过早恢复 zoom 导致相机跳变；
3. 尾缘编辑可产生自交 Polygon；
4. 轻量 validate 不能保证完整可生成性；
5. 渲染 listener 抛错可能造成 Store/History 部分提交；
6. Definition-level 几何预检将失败前移到命令执行前。

### 算法记录

```text
docs/algorithms/arrow-attack.md
```

实现为 clean-room：仅参考公开行为和术语，不复制参考源码、常量、helper layout 或公式。

## 下一步：Milestone 005G `arrow.attack.tailed`

### 目标语义

沿用平尾攻击箭头控制点：

```text
0 + 1   = exact tail edges
2..n-2  = attack-spine controls
n-1     = exact objective/tip
```

燕尾仅改变尾部闭合策略，不能改变 canonical control model。

### 目标结构

```text
AttackArrowFrame
+ flat-tail-independent inward notch
+ explicit notch depth/width parameters
+ simple-ring/topology validation
```

### 实施顺序

1. 记录公开燕尾攻击箭头行为和 clean-room provenance；
2. 明确燕尾深度、宽度和方向语义；
3. 在 `AttackArrowFrame` 上实现独立 closing strategy；
4. 禁止复制 `buildAttackArrowRing()`；
5. 保持 `arrow.attack` golden contract 完全不变；
6. 增加参数边界、自交和退化测试；
7. 新增 `arrow.attack.tailed` Definition；
8. PlotJSON full semantic-path round trip；
9. Playground 第七个 selector/sample；
10. Chromium draw/render/edit/undo；
11. 更新 README、文档和不可变交接；
12. 合并后验证 Pages 七符号部署。

在 005G 完成前，不实现 double、pincer、route、corridor 或其他复杂箭头。

## 后续里程碑

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

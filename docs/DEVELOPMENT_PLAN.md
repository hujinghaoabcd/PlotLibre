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
| 005G | `arrow.attack.tailed`、共享攻击 frame、独立燕尾闭合 | 已完成并合并 |
| 005H-D | `arrow.double` canonical semantic design | 已完成，等待设计 PR 合并 |

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

`arrow.double` 仅完成设计，尚未成为公开 built-in symbol。

## Milestone 005G：`arrow.attack.tailed`

状态：**已完成并通过 PR #13 合并到 `main`**。

主线合并提交：

```text
74611fe8dd39f5c2ad927ab2e9aeb56a9dadf304
```

最终验证：

```text
Run ID: 30420076111
Node 20.19: success
Node 22: success
Node tests: 90 passed
Chromium: 12 passed
Pages build: success
handover contract: success
```

已完成：

- `arrow.attack.tailed`；
- shared `AttackArrowFrame`；
- independent inward swallowtail closing；
- notch depth/width parameters；
- relational golden preserving flat body/head；
- complete renderability validation；
- PlotJSON；
- seven-symbol Playground；
- real MapLibre draw/render/edit/history/undo；
- clean-room algorithm record；
- immutable implementation and finalization handovers。

## Milestone 005H Design：`arrow.double`

状态：**canonical semantic design approved; geometry not yet implemented**。

设计文档：

```text
docs/design/arrow-double-semantic-design.md
```

### Public behavior research

在指定公开 revision 中观察到：

- DoubleArrow 是独立 Polygon 类型；
- 正常交互最多 4 点并固定完成；
- 3 点状态可临时推导另一目标；
- 4 点状态显式包含两个目标；
- 恢复数据可以包含额外连接点；
- 左右分配由几何关系决定。

PlotLibre 只采用行为信息，不复制参考公式、常量、helper layout 或类结构。

### Approved canonical controls

Version 1.0 固定四个显式语义控制点：

```text
controlPoints[0] = tail edge A
controlPoints[1] = tail edge B
controlPoints[2] = objective A
controlPoints[3] = objective B
```

控制 schema：

```text
minPoints = 4
maxPoints = 4
completeOnDoubleClick = false
```

绘制流程：

```text
click tail A
→ click tail B
→ click objective A
→ pointer candidate shows complete draft
→ click objective B auto-completes
```

### Deliberate semantic decisions

- 不持久化 3 点镜像 objective；
- 不在 PlotJSON 1.0 增加第 5 个 connection control；
- branch center 由 `branchPositionRatio` 派生；
- tail pair 和 objective pair 都是无序对；
- 交换任一对输入不改变几何；
- 四个控制点全部是 handles；
- branch、head、body、bridge 和 Polygon vertices 全部派生；
- 输出是一个 connected simple Polygon；
- 禁止把两个完整箭头 union 或存成数组。

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
├─ coupled left/right wing centerlines
├─ two head frames
└─ shared inner bridge frame
```

### Proposed parameter families

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

数值默认值由 PlotLibre golden fixture 校准，不复制参考实现。

### Topology policy

必须拒绝：

- invalid control count；
- coincident tail or objective pair；
- zero primary direction；
- tail/objective pair nearly parallel to primary direction；
- objective behind tail；
- wing too short for head；
- invalid branch position；
- head overlap；
- crossed wings；
- inner bridge crossing outer boundary；
- non-finite or self-intersecting ring。

拟定 issue code：

```text
INVALID_DOUBLE_ARROW_GEOMETRY
```

## 005H Implementation order

1. 新增 clean-room algorithm record；
2. 实现 pure `DoubleArrowFrame`；
3. 实现 coupled wing centerlines；
4. 生成两个 exact-tip heads；
5. 实现 shared inner bridge 和单一 ring；
6. 增加 deterministic golden、pair-swap 和 topology tests；
7. 增加 Definition/Registry/PlotJSON；
8. workspace 升级到 `0.0.12`；
9. 增加第八个 Playground selector/sample；
10. Chromium 验证 fixed-four-point auto-completion、render、edit、history、undo；
11. 更新 README、路线图、算法文档和不可变交接；
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

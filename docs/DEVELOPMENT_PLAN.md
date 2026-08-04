# PlotLibre 开发路线图

## 总体策略

采用“相关符号组完整纵向切片”：同一数学基础的 2–3 个符号在一个里程碑内完成语义冻结、共享纯几何、独立 Definition、Registry、PlotJSON、交互、Playground、浏览器测试、算法记录和交接。

禁止：

- 为增加数量复制完整生成器；
- 仅通过不同默认参数伪造新公共符号；
- 把 rendered GeoJSON 反写为 authored controls；
- 为提高成功率关闭 topology 或 generation preflight；
- 在多个复杂符号族之间并行扩散；
- 在设计冻结前先写运行时代码。

## 当前实现基线

```text
base main SHA:     0cae0efe7e4877ade23028a7224c6c6daee16b9b
active branch:     agent/006j-circular-arc-family
active PR:         #34 Add circular arc family
workspace:         0.0.20
public symbols:    19 (14 Arrow + 1 Line + 4 Area)
Node tests:        184
Chromium tests:    28
current milestone: 006J circular arc family implementation
next milestone:    007 professional editing semantic design
```

当前公共 Definitions：

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
line.circular-arc
area.closed-curve
area.gathering-place
area.circular-segment
area.sector
```

## 已完成里程碑

| 里程碑 | 主要成果 | 状态 |
|---|---|---|
| 001–004 | Workspace、Core、History、PlotJSON、MapLibre、Geometry foundations | 已完成 |
| 005A–005H | 两点、曲线、攻击、燕尾、双箭头 | 已完成 |
| 006A–006D | 钳形箭头、自然点击顺序、结构化失败反馈 | 已完成 |
| 006E | 分队战斗箭头 | 已完成并合并 |
| 006F–006G | 路线箭头 + 走廊共享 PathRibbon | 已完成并合并 |
| 006H | 双向路线 + 双头路线 | 已完成并合并 |
| 006I | 闭合曲线 + 集结地 | PR #31、#32 已合并 |
| 006J Design | 圆弧、扇形、圆弓形语义与数学冻结 | PR #33 已合并 |
| 006J Implementation | 三个 circular Definitions 完整纵向切片 | PR #34 最终验证阶段 |

## Milestone 006J：圆弧族实现

### 公共范围

```text
line.circular-arc@1.0.0
area.circular-segment@1.0.0
area.sector@1.0.0
```

延期：

```text
area.lune
```

参考库的 `Lune/弓形` 实际是一条圆弧加直线弦，因此 PlotLibre 使用准确名称 `area.circular-segment`。真正由两条圆弧围成的 lune 需要未来独立语义设计。

### Shared circular frame

`packages/geometry/src/circular-arc.ts` 已实现：

- local-metre coordinate-mode gate；
- traversal-order-independent projection origin；
- scale-aware three-point circumcentre；
- exact radius and angle derivation；
- through-point-directed minor/major sweep selection；
- clockwise/counterclockwise deltas；
- crossing-0° normalization；
- `start → through` 与 `through → end` 双子弧采样；
- exact authored control replacement；
- circular-segment arc+chord ring；
- directed sector ring；
- finite、area、winding 和 simple-ring validation。

### Circular arc

```text
0 exact start
1 exact through-point
2 exact end
```

- 输出一个 open LineString；
- third click 自动完成；
- exact through-point 决定小弧或大弧；
- no fill / no chord / no closure；
- no control canonicalization。

### Circular segment

```text
0 arc/chord start
1 exact through-point
2 arc/chord end
```

- selected arc + exact straight chord；
- 输出无孔 simple Polygon；
- minor 和 major segment 均支持；
- winding normalization 不改写 controls。

### Sector

```text
0 center
1 exact radius/start-boundary point
2 end-bearing handle
```

- control 1 定义唯一半径与 exact start；
- control 2 只定义结束方位，距离不改变半径；
- rendered end-boundary point 在 start radius 上派生；
- 显式 `sweepDirection = clockwise | counterclockwise`；
- crossing 0° 与 sweep > 180° 可用；
- zero/full sweep fail closed；
- third click 自动完成。

### Definition-driven semantic guides

Core 新增：

```text
PlotDefinition.deriveSemanticGuidePaths(feature)
```

MapLibre 新增：

```text
plotlibre-handle-guide
```

Sector 返回 `center → end-bearing handle` 路径。该虚线在完整 draft、选中和 handle drag 状态显示，但不进入：

```text
committed RenderBundle
Store
History
PlotJSON
```

该扩展是通用 Definition hook，不在 MapLibre 层硬编码 `area.sector`。

### Coordinate and failure policy

Version 1.0 仅支持 local-metre mode。以下输入在 Store mutation 前拒绝：

- invalid WGS84 / non-finite controls；
- duplicate controls；
- collinear / near-collinear / unstable circumcircle；
- excessive circumradius；
- antimeridian、high latitude 或 large extent；
- ambiguous through sweep；
- zero/full sector sweep；
- invalid parameters；
- degenerate 或 self-intersecting Polygon。

禁止 two-point committed fallback、polyline/triangle degradation、hidden control movement、automatic minor-sweep override 和 silent geodesic switch。

### Registry、PlotJSON 与 Playground

- 新增 `lineSymbols`，同时保持 `arrowSymbols` 和 `areaSymbols`；
- `builtInSymbols = 19`；
- create/replace/import 继续 full generation preflight；
- PlotJSON 只保存三个 authored controls 和 explicit parameters；
- production selector/sample catalog = 19；
- base `?e2e=1` 继续保持原九类兼容 surface；
- full E2E：

```text
?e2e=1&squad=1&paths=1&areas=1&circular=1
```

### 006J 验证目标

Node 184 项覆盖：

- minor/major、顺逆方向、跨 0°；
- exact start/through/end；
- reversal；
- density isolation；
- circular segment minor/major area；
- sector end-bearing distance isolation；
- coordinate/failure policy；
- Registry、PlotJSON、guide contract；
- style reload guide-layer recovery；
- 所有历史回归。

Chromium 28 项覆盖：

- 19-symbol catalog/sample；
- circular arc actual draft/committed line；
- circular segment actual draft/committed Polygon；
- sector fixed-three completion and derived endpoint；
- transient radial guide actual rendering；
- guide absent from committed source；
- 所有历史 Arrow/Area/worker/edit/style/PlotJSON 回归。

Final merge gate：

```text
Node 20.19:        success
Node 22:           success
Node tests:        184 passed
Chromium tests:    28 passed
Playground build: success
handover check:   success
review threads:   0 unresolved
```

## Milestone 007：专业编辑设计与实现

006J 合并并完成 post-merge 状态同步后，从最终 `main` 开始设计，不在 PR #34 中实现。

优先冻结：

1. 多选的 canonical selection model；
2. box select 与 lasso select 的命中规则；
3. 整体平移是否只移动 authored controls；
4. rotation/scale 的 pivot、coordinate mode 和 parameter semantics；
5. group、lock、z-order 与 document schema；
6. 多对象 command transaction；
7. invalid transform 的 atomic rollback；
8. keyboard/touch/pointer behavior；
9. multi-object undo/redo；
10. browser performance and large-selection fixtures。

建议先建立 documentation-only design PR，再创建实现分支。

## Milestone 008：吸附与约束

- 空间索引；
- 顶点、线段、中点和交点吸附；
- 网格、角度、方位、平行和垂直约束；
- guide 与可解释吸附原因。

## Milestone 009：更多符号与注记

- 更多 control measures 和 Area families；
- rectangle、triangle、flags；
- callout、leader label、text、image、SVG annotation；
- true two-arc lune（若独立语义成立）。

## Milestone 010：IO 与项目管理

- 正式 PlotJSON JSON Schema；
- document/definition migrations；
- unresolved Definition preservation；
- GeoJSON、SVG、PNG import/export；
- layers、groups、z-order；
- autosave and recovery；
- input complexity limits。

## Milestones 011–013

- MIL-STD/APP-6 optional backend；
- React/Vue/Vanilla integrations；
- CRDT/collaboration/persistence/audit；
- stable 1.0 API；
- 50+ native parametric symbols；
- license、release automation、performance and compatibility matrices。

## 跨阶段工程任务

1. 决定开源许可证并建立 notices；
2. 统一 workspace 与 package version strategy；
3. 引入 Changesets 或等价 release workflow；
4. 建立正式 PlotJSON JSON Schema；
5. 增加 transaction/rollback；
6. 自动检查 README、LATEST、Playground 和 Registry 数量一致性；
7. 建立性能基准与大对象测试；
8. 正式 0.1.0 前完成 npm package-boundary review；
9. 处理 Playground bundle 超过 1 MB 的 code splitting；
10. 持续区分 source/build ready、workflow deployed 与 live manually verified。

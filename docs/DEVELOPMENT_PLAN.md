# PlotLibre 开发路线图

## 总体策略

采用“相关符号组完整纵向切片”：具有同一数学基础的 2–3 个符号可以在同一里程碑中完成共享几何、独立语义、Definition、PlotJSON、交互、Playground、浏览器测试、算法记录和交接。

禁止：

- 为增加数量复制整套生成器；
- 仅通过不同默认参数伪造新公共符号；
- 将 rendered GeoJSON 反写为 canonical controls；
- 为提高成功率关闭 simple-ring 或完整生成 preflight；
- 在多个复杂符号族之间并行扩散范围。

钳形箭头边界加固继续冻结；路线头部变体暂不扩展。

## 当前基线

```text
main SHA:          f873052d44a98f7029f0eda27ea70cda8b1af347
merged PR:         #31 Add closed action area symbol group
workspace:         0.0.19
public symbols:    16 (14 Arrow + 2 Area)
Node tests:        163
Chromium tests:    23
completed:         006I closed action area group
next milestone:    006J arc / sector / lune semantic design
finalization:      agent/006i-post-merge-finalization
```

公开 Definitions：

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
area.closed-curve
area.gathering-place
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
| 006F–006G | 路线箭头 + 走廊箭头共享 PathRibbon | 已完成并合并 |
| 006H | 双向路线 + 双头路线共享多头路径基础 | 已完成并最终同步 |
| 006I | 闭合曲线 + 集结地共享周期闭合曲线基础 | 已通过 PR #31 合并 |

## Milestone 006I：闭合行动区域组

### 最终公共范围

```text
area.closed-curve@1.0.0
area.gathering-place@1.0.0
```

延期：

```text
area.route-loop
```

`area.route-loop` 只有在具有独立路线、方向、入口/出口或行动语义时才可进入公共 API。换样式或参数的 closed curve 不是新 Definition。

### `area.closed-curve`

Canonical controls 是 3–64 个有序边界途经点：

```text
0..n-1 authored boundary waypoints
```

契约：

- 周期 Hermite/Catmull–Rom 曲线插值每个 authored control；
- 最后一个 span 自动回到首点；
- authored controls 不重复首点；
- 双击末点或 Enter 完成；
- reversal 保持 footprint，canonical authored order 不被静默重写；
- sampled vertices、closing duplicate 和 Polygon ring 全部派生。

### `area.gathering-place`

固定三个 authored controls：

```text
0 flank A
1 front crown
2 flank B
```

契约：

- 两个 flank 是无序语义对，只允许 indices 0/2 的确定性 permutation；
- crown 必须保持 exact index 1；
- rear closure anchor 从 flank midpoint 和 crown direction 派生；
- 第三次点击自动完成；
- derived rear anchor 不进入 Store、History、handles 或 PlotJSON；
- 与三点 closed curve 保持独立语义和默认样式。

### 共享纯几何基础

`packages/geometry/src/closed-area.ts` 负责：

- WGS84 authored controls 的局部米制投影；
- 顺序无关的 circular-longitude/mean-latitude projection origin；
- periodic Hermite/Catmull–Rom sampling；
- authored control interpolation；
- gathering-place rear-anchor derivation；
- explicit ring closure；
- counterclockwise winding normalization；
- finite、area 和 simple-ring validation；
- WGS84 反投影。

共享基础不包含 arrow head、neck、notch、shaft width 或 route ribbon 语义。

### 失败策略

以下情况在 Store mutation 前 fail closed：

- 控制点数量错误；
- 非有限 WGS84 坐标；
- pairwise duplicate controls；
- 无法确定稳定局部投影中心的全球尺度输入；
- 参数越界；
- derived rear anchor collapse；
- zero/near-zero area；
- sampled ring self-intersection。

不允许静默删除 controls、polygonize 自交或回退到 raw authored polygon。

### PlotJSON 契约

只持久化：

```text
plotType
Definition version
ordered canonical authored controls
explicit parameters
style
metadata
revision
```

不得持久化：

```text
closing duplicate
sampled curve points
derived rear anchor
winding-normalized copies
Polygon coordinates
```

### Playground 与交互

- `area.closed-curve`：至少三个点；pointer candidate 形成完整 draft；双击/Enter 完成；
- `area.gathering-place`：第三个 pointer candidate 形成完整 draft；第三次点击自动完成；
- 两者均使用 schema-driven `MultiPointDrawSession`；
- committed handles 仅对应 authored controls；
- production selector 与样例总数为 16；
- 基础兼容 E2E 保留原九类 selector；
- extended E2E 使用 `?e2e=1&squad=1&paths=1&areas=1`；
- generic status listener 先绑定，symbol-specific guidance 后绑定。

### 006I 最终验证

```text
PR:                #31
squash merge SHA:  f873052d44a98f7029f0eda27ea70cda8b1af347
final head run:    #294 / 30883623452
Node 20.19:        success
Node 22:           success
Node tests:        163 passed
Chromium tests:    23 passed
Playground build: success
handover check:   success
review threads:   0 unresolved
```

## Milestone 006J：弧形与扇形区域组

候选研究对象：

```text
area.arc
area.sector
area.lune
```

006J 第一阶段是**语义设计**，不是立即实现。只有满足独立公共语义、可解释 authored controls、稳定拓扑和测试契约的候选才进入 runtime。

实现前冻结：

1. 哪些是 Polygon、LineString 或复合输出；
2. authored centre、radius、start/end bearing 的角色；
3. clockwise/counterclockwise arc direction；
4. 大于 180° 和跨 0° 方位行为；
5. 两点/三点输入是否等价；
6. radius 单位与 geodesic/local-metre 边界；
7. antimeridian/high-latitude 策略；
8. arc sampling 与 exact endpoint contract；
9. sector center 是否进入 ring；
10. lune 的两个圆弧如何选择合法交集区域；
11. canonicalization 是否仅做角色 permutation；
12. PlotJSON migration 和 deterministic fixtures；
13. 哪些候选只是参数变体，不能成为独立 Definition；
14. interaction completion 是 fixed-count 还是 explicit completion；
15. actual-rendered browser matrix 和 degenerate-input cases。

不得把三个名字实现成同一几何换默认样式。语义设计、clean-room reference matrix、license review 和测试计划未冻结前，不创建 geometry 或 public identifier。

## Milestone 007：专业编辑

- 多选、框选、套索；
- 对象平移、旋转、缩放；
- 分组与锁定；
- 触摸；
- 多对象事务和 rollback。

## Milestone 008：吸附和约束

- 空间索引；
- 顶点、线段、中点和交点吸附；
- 网格、角度、方位、平行和垂直约束；
- guides 与可解释吸附原因。

## Milestone 009：更多区域、旗帜和注记

- control measures 与更多 area families；
- triangle、rectangle、curve、swallowtail flags；
- callout、leader label、text、image 和 SVG annotation。

## Milestone 010：IO 和项目管理

- 正式 PlotJSON JSON Schema；
- document/definition migrations；
- unresolved definition preservation；
- GeoJSON、SVG、PNG import/export；
- 图层、分组和 z-order；
- 自动保存与恢复；
- 文件大小和输入复杂度限制。

## Milestone 011：MIL-STD/APP-6

- 可选符号后端；
- SIDC、modifiers；
- 单点和多点标准符号；
- 标准版本与授权边界。

## Milestone 012：框架与协作

- React、Vue、Vanilla integration guides；
- CRDT、持久化、审计、权限和 presence。

## Milestone 013：1.0

目标：

- 稳定 API；
- 50+ 原生参数化符号；
- 完整专业编辑；
- 浏览器兼容矩阵；
- 文档站与性能基准；
- 明确许可证；
- 统一 package version 和 release automation；
- migration 与长期支持政策。

## 跨阶段工程任务

1. 决定开源许可证并建立 notices；
2. 统一 workspace 与 package version 策略；
3. 引入 Changesets 或等价 release workflow；
4. 建立正式 PlotJSON JSON Schema；
5. 增加 transaction/rollback 设计；
6. 自动检查 README、LATEST、Playground 和 Registry 数量一致性；
7. 建立性能基准与大对象数量测试；
8. 在正式 0.1.0 前完成 npm package boundary review；
9. 评估 Playground 单 bundle 超过 1 MB 的 code splitting；
10. 持续区分 source/build ready、workflow deployed 与 live manually verified。

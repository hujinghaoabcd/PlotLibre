# PlotLibre 开发路线图

## 总体策略

采用“相关符号组完整纵向切片”：具有同一数学基础的 2–3 个符号可以在同一里程碑中完成共享几何、独立语义、Definition、PlotJSON、交互、Playground、浏览器测试、算法记录和交接。

禁止：

- 为增加数量复制整套生成器；
- 仅通过不同默认参数伪造新公共符号；
- 将 rendered GeoJSON 反写为 canonical controls；
- 为提高成功率关闭 topology 或完整生成 preflight；
- 在多个复杂符号族之间并行扩散范围；
- 在语义设计尚未合并时先写运行时代码。

钳形箭头边界加固继续冻结；路线头部变体暂不扩展。

## 当前基线

```text
main SHA:          b3a1a18c5aaf0b26a4c7c5e42a6e307eaa331873
workspace:         0.0.19
public symbols:    16 (14 Arrow + 2 Area)
Node tests:        163
Chromium tests:    23
completed:         006I implementation + post-merge finalization
active milestone:  006J circular arc family semantic design
active branch:     agent/006j-arc-sector-lune-design
runtime changes:   prohibited on the design branch
```

当前公开 Definitions：

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
| 006I | 闭合曲线 + 集结地共享周期闭合曲线基础 | PR #31、#32 已合并 |

## Milestone 006I：闭合行动区域组

最终公共范围：

```text
area.closed-curve@1.0.0
area.gathering-place@1.0.0
```

延期：

```text
area.route-loop
```

最终验证：

```text
implementation PR: #31
implementation SHA: f873052d44a98f7029f0eda27ea70cda8b1af347
finalization PR:   #32
final main SHA:    b3a1a18c5aaf0b26a4c7c5e42a6e307eaa331873
Node tests:        163 passed
Chromium tests:    23 passed
```

关键契约：

- closed curve 保存 3–64 个 authored boundary waypoints；
- gathering place 保存 flank / crown / flank 三控制点；
- closing duplicate、curve samples、rear anchor 和 Polygon ring 全部派生；
- local-metre projection、counterclockwise ring 和 simple-ring validation；
- invalid geometry 在 Store mutation 前 fail closed。

## Milestone 006J：圆弧族语义设计

### 设计冻结候选

```text
line.circular-arc@1.0.0
area.sector@1.0.0
area.circular-segment@1.0.0
```

延期：

```text
area.lune
```

### 命名决策

- open LineString 不使用 `area.arc`，而使用 `line.circular-arc`；
- 参考库的 `Lune/弓形` 是“一条圆弧 + 一条弦”的 circular segment；
- PlotLibre 使用 `area.circular-segment`，不在 1.0 中添加误导性 `area.lune` alias；
- 真正的数学 lune 需要两条圆弧和独立控制点语义，另行设计。

### `line.circular-arc`

固定三个 exact controls：

```text
0 start
1 through
2 end
```

契约：

- 三点定义稳定 circumcircle；
- through-point 选择 minor 或 major directed sweep；
- 输出一个 open LineString；
- start、through、end 必须在 samples 中精确存在；
- reversal 输出同一 footprint 的反向遍历；
- 第三次点击自动完成；
- 两点状态只能显示 semantic guide。

### `area.circular-segment`

固定三个 exact controls：

```text
0 arc/chord start
1 through-point on arc
2 arc/chord end
```

契约：

- 共享 three-point circular frame；
- boundary 为 selected arc + straight chord；
- minor 与 major circular segment 均可；
- 输出一个无孔 simple Polygon；
- ring winding normalization 不重写 authored order。

### `area.sector`

固定三个 controls：

```text
0 center
1 exact radius/start-boundary point
2 end-bearing handle
```

契约：

- control 1 定义唯一 radius 和 exact start；
- control 2 只定义 end bearing，其距离不定义第二 radius；
- rendered end-boundary point 在 start radius 上派生；
- 显式参数：`sweepDirection = clockwise | counterclockwise`；
- 支持 crossing 0° 与 sweep > 180°；
- 拒绝 zero/full sweep；
- 第三次点击自动完成；
- selected/draft state 需要 centre → bearing handle semantic guide。

### 共享数学基础

设计中的 pure circular frame 负责：

- local-metre projection；
- scale-aware three-point circumcentre；
- radius 与 angle derivation；
- clockwise/counterclockwise directed deltas；
- through-point minor/major sweep selection；
- crossing-0° angle unwrapping；
- two-sub-arc exact-through sampling；
- `segmentsPerCircle` density-only parameter；
- LineString、arc+chord ring 和 sector ring construction；
- finite、area 和 simple-ring validation。

### Coordinate-mode policy

Version 1.0 只允许 local-metre mode。以下输入 fail closed：

- antimeridian crossing；
- high latitude；
- extent 超过 local threshold；
- coincident controls；
- collinear/near-collinear controls；
- non-finite or excessive circumradius；
- ambiguous through sweep。

不允许 silent geodesic fallback。现有 `geodesic.ts` 可供未来版本使用，但 1.0 不混合算法。

### Clean-room references

```text
sakitam-fdd/ol-plot@c919e60b4edeaeca53c08f9552f793b2ae9537f0
sakitam-fdd/maptalks.plot@37dab8d0dd31650540146e1e0f03f54982f01799
```

两者均已核对 MIT License。用途仅限 public behavior、terminology 和 test expectation；code reuse 为 `none`。

### 设计 PR 完成条件

- public identifiers 与 output type 一致；
- controls 和 derived state 边界无歧义；
- direction、major/minor、crossing 0° 和 reversal 明确；
- local/geodesic 与 radius policy 明确；
- PlotJSON、interaction、failure policy 和 fixtures 完整；
- reference revision、license 和 no-code-reuse 完整；
- branch 中没有 geometry、Definition、Registry、Playground 或 tests；
- Node 20.19、Node 22、163 Node、23 Chromium、build 和 handover 全绿；
- 0 unresolved review threads。

### 实现顺序

设计 PR 合并后，从最终 `main` 创建：

```text
agent/006j-circular-arc-family
```

顺序：

1. pure circular frame；
2. deterministic Node fixtures；
3. circular arc LineString；
4. circular-segment ring；
5. sector ring；
6. Definition 与 Registry；
7. PlotJSON preflight；
8. interaction guides；
9. Playground selectors/samples；
10. actual-rendered Chromium matrix；
11. immutable handover；
12. current-head green 后 squash merge。

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
- callout、leader label、text、image 和 SVG annotation；
- true two-arc lune（如独立语义成立）。

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
9. 评估 Playground 单 bundle超过 1 MB 的 code splitting；
10. 持续区分 source/build ready、workflow deployed 与 live manually verified。

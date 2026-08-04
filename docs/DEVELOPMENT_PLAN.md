# PlotLibre 开发路线图

## 总体策略

采用“相关符号组完整纵向切片”：具有同一数学基础的 2–3 个符号可以在同一 PR 中完成共享几何、独立语义、Definition、PlotJSON、交互、Playground、浏览器测试、算法记录和交接。禁止为了批量开发而复制整套生成器，也禁止仅通过不同默认参数伪造新符号。

单个复杂耦合符号仍可独立成组。只有存在未解决的语义争议时才单独创建设计 PR。

当前用户目标是继续扩大真正具有独立语义的符号库。钳形箭头边界加固继续冻结；路线头部变体暂不继续扩展。完成一个相关符号组后直接进入下一组，公共稳定性问题集中在阶段性回归中处理。

## 当前基线

```text
main SHA:           e799b3263bc36410c4195225faad5d2fc36f494f
workspace:          0.0.18
public Arrow types: 14
Node tests:         154
Chromium tests:     20
handover branch:    agent/006i-handover-baseline
next milestone:     006I closed action area group
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
| 006H | 双向路线 + 双头路线共享多头路径基础 | 已完成并合并 |
| 006I | 闭合行动区域相关符号组 | 下一阶段 |

## Milestone 006I：闭合行动区域组

### 目标

项目第一次从 Arrow family 进入 Area family。该阶段不能只增加一个看起来闭合的 Polygon，而要建立可复用、可测试、可迁移的闭合区域语义基础。

候选公共标识符：

```text
area.closed-curve
area.gathering-place
area.route-loop
```

其中：

- `area.closed-curve`：面向用户定义边界控制点的平滑闭合区域；
- `area.gathering-place`：具有独立传统标绘语义、非普通闭合曲线默认样式的集结地区域；
- `area.route-loop`：只有在能够定义独立的方向、路线或流向语义时才进入公共 API；若只是闭合曲线换参数，则不实现。

### 第一阶段：语义冻结

实现 geometry 前必须确定：

1. 公共 identifier 与 Definition version；
2. authored controls 位于边界、中心路径还是具有特殊角色；
3. `minPoints`、`maxPoints` 和完成方式；
4. 是否允许两点或三点退化形态；
5. 自动闭合是否只存在于派生 ring；
6. 控制点顺序是否有方向含义；
7. 反转 authored controls 是否保持几何不变；
8. 输出一个 Polygon、MultiPolygon 或同时包含 LineString；
9. 是否允许孔洞；006I 默认不允许孔洞；
10. 自交、重复点、尖锐折返和极短边策略；
11. 参数、单位、范围和隔离性；
12. PlotJSON 中哪些内容必须持久化、哪些必须派生。

### 共享闭合区域基础

计划提取纯 `ClosedAreaFrame` 或等价共享组件，负责：

- WGS84 authored controls 的局部米制投影；
- 连续重复点清洗；
- 闭合控制路径分析；
- Catmull–Rom、Bezier 或独立闭合插值策略；
- 参数化采样；
- ring closure；
- finite、area、winding 和 simple-ring validation；
- 精确 authored control preservation policy；
- WGS84 反投影。

禁止：

- 在 `symbols` 中复制完整闭合曲线生成器；
- 直接把最终 ring 存成 `controlPoints`；
- 为了让复杂输入渲染而关闭自交检查；
- 在 `interaction` 或 Playground 中硬编码 area identifier；
- 将自由手绘 GeoJSON 当作 canonical parametric state。

### 交互契约

初始目标为 schema-driven `MultiPointDrawSession`：

```text
click authored controls
→ pointer candidate produces derived closed-area draft
→ double-click or Enter completes
→ automatic closure remains derived
```

要求：

- 完成结果只包含 authored controls，不附加重复首点；
- Backspace/Delete 逐点撤销未提交控制；
- Escape 取消；
- invalid closure 保留最后合法 draft 或 semantic guide；
- self-intersection 和退化 ring 不进入 Store/History；
- 每个 authored control 完成后均显示 semantic handle；
- 一次 handle drag 只产生一个 `ReplacePlotCommand`。

### PlotJSON 契约

```text
plotType
Definition version
ordered authored controls
explicit parameters
style
metadata
revision
```

以下内容不得序列化为 controls：

```text
closing duplicate point
sampled curve points
smoothed boundary vertices
winding-normalization vertices
ring repair points
Polygon coordinates
```

### 测试要求

006I 在现有 154 Node / 20 Chromium 基线上增加：

- deterministic golden fixture；
- exact authored control contract；
- automatic closure without extra control；
- duplicate-control policy；
- control-order and reversal behavior；
- interior-control influence；
- parameter isolation；
- finite/closed/CCW/simple ring；
- self-intersection rejection；
- antimeridian and high-latitude policy；
- Registry registration；
- PlotJSON round trip；
- schema-driven completion；
- invalid completion before Store mutation；
- committed and draft Source coverage；
- actual `queryRenderedFeatures()` coverage；
- handle edit, revision, history and undo；
- style reload restoration；
- current fourteen Arrow regressions remain green。

### 006I 完成条件

1. 语义设计经反例检查；
2. 只保留真正独立的公共 identifiers；
3. shared closed-area geometry 为纯函数；
4. 每个 Definition 独立 validate/generate；
5. PlotJSON 只保存 authored controls；
6. Playground 分类、说明和样例完成；
7. Node 20.19 success；
8. Node 22 success；
9. 全部 Node tests success；
10. 全部 Chromium tests success；
11. handover contract success；
12. unresolved review threads = 0；
13. merge SHA 与 `main` 一致；
14. `LATEST.md` 更新为真实 merged state。

## Milestone 006J：弧形与扇形区域组

开发共享圆弧、半径和方位角基础的区域符号，候选包括：

```text
area.arc
area.sector
area.lune
```

实现前必须明确中心、起始方位、终止方位、半径和弧方向的 authored/derived 边界。

## Milestone 007：专业编辑

- 多选；
- 框选；
- 套索；
- 对象平移；
- 旋转；
- 缩放；
- 分组；
- 锁定；
- 触摸；
- 多对象事务。

## Milestone 008：吸附和约束

- RBush 或等价空间索引；
- 顶点、线段、中点和交点吸附；
- 网格吸附；
- 角度和方位约束；
- 平行和垂直约束；
- guides 和可解释吸附原因。

## Milestone 009：更多区域、旗帜和注记

- 更多 closed curve 和 control measures；
- triangle、rectangle、curve、swallowtail flags；
- callout、leader label、text、image 和 SVG annotation。

## Milestone 010：IO 和项目管理

- 正式 PlotJSON JSON Schema；
- document/definition migrations；
- unresolved definition preservation；
- GeoJSON import/export；
- SVG/PNG export；
- 图层、分组和 z-order；
- 自动保存和文档恢复；
- 文件大小与输入复杂度限制。

## Milestone 011：MIL-STD/APP-6

- 可选符号后端；
- SIDC；
- modifiers；
- 单点和多点标准符号；
- 标准版本与授权边界。

## Milestone 012：框架与协作

- React；
- Vue；
- Vanilla integration guide；
- CRDT；
- 持久化；
- 审计；
- 权限；
- 协作 presence。

## Milestone 013：1.0

目标：

- 稳定 API；
- 50+ 原生参数化符号；
- 完整专业编辑；
- 浏览器兼容矩阵；
- 文档站；
- 性能基准；
- 明确许可证；
- 统一 package version 和发布流程；
- npm release automation；
- migration policy；
- 长期支持声明。

## 跨阶段工程任务

以下任务不能无限推迟，但不阻塞 006I 语义设计：

1. 决定开源许可证并建立 notices；
2. 统一 workspace 与 package version 策略；
3. 引入 Changesets 或等价 release workflow；
4. 建立正式 JSON Schema；
5. 增加 transaction/rollback 设计；
6. 为文档状态增加自动一致性检查；
7. 建立 docs/design 和 docs/algorithms 完整索引；
8. 把长期架构愿景与当前实现状态分离；
9. 建立性能基准和大对象数量测试；
10. 在正式 0.1.0 前完成 npm package boundary review。

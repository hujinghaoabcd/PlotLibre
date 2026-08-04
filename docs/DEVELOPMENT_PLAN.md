# PlotLibre 开发路线图

## 总体策略

采用“相关能力完整纵向切片”：符号族先冻结语义和数学，再完成共享纯几何、独立 Definition、Registry、PlotJSON、交互、Playground、浏览器测试、算法记录和交接；编辑能力同样先冻结状态模型、事务边界和失败策略，再进入 runtime。

禁止：

- 为增加数量复制完整生成器；
- 仅通过不同默认参数伪造新公共符号；
- 把 rendered GeoJSON 反写为 authored controls；
- 为提高成功率关闭 topology 或 generation preflight；
- 在多个复杂符号族之间并行扩散；
- 在设计冻结前先写运行时代码。

## 当前合并基线

```text
main SHA:          297d0a644eaa3427f8fd59b82b7bc3582221d49e
merged PR:         #34 Add circular arc family
workspace:         0.0.20
public symbols:    19 (14 Arrow + 1 Line + 4 Area)
Node tests:        184
Chromium tests:    28
completed:         006J circular arc family implementation
current slice:     006J post-merge documentation finalization
next milestone:    007 professional editing semantic design
finalization:      agent/006j-post-merge-finalization
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
| 006J Implementation | 三个 circular Definitions、semantic guides、19 类 Playground | PR #34 已合并 |

## Milestone 006J：圆弧族最终状态

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
- scale-aware three-point circumcenter；
- exact radius and angle derivation；
- through-point-directed minor/major sweep selection；
- clockwise/counterclockwise deltas；
- crossing-0° normalization；
- `start → through` 与 `through → end` 双子弧采样；
- exact authored control replacement；
- circular-segment arc+chord ring；
- directed sector ring；
- finite、area、winding 和 simple-ring validation。

### Definition-driven semantic guides

Core public extension：

```text
PlotDefinition.deriveSemanticGuidePaths(feature)
```

MapLibre layer：

```text
plotlibre-handle-guide
```

Sector 返回 `center → end-bearing handle`。该虚线在 complete draft、selection 和 handle drag 状态显示，但不进入 committed RenderBundle、Store、History 或 PlotJSON。

### Final validation and merge

```text
implementation PR: #34
validated head:    608567d4f8f662242b0356c54742a2ffcb087c66
CI run:            #337 / 30893450723
Node 20.19:        success
Node 22:           success
Node tests:        184 passed
Chromium tests:    28 passed
Playground build: success
handover check:   success
review threads:   0 unresolved
squash merge SHA: 297d0a644eaa3427f8fd59b82b7bc3582221d49e
```

### Current catalog and renderer

```text
arrowSymbols:   14
lineSymbols:     1
areaSymbols:     4
builtInSymbols: 19
MapLibre Sources: 3
MapLibre Layers:  8
```

Production Playground loads 19 selectors and 19南京 samples. Base `?e2e=1` retains the original nine-selector compatibility surface; full current E2E uses：

```text
?e2e=1&squad=1&paths=1&areas=1&circular=1
```

## Milestone 007：专业编辑语义设计

006J post-merge documentation 合并后，从最终 `main` 创建：

```text
agent/007-professional-editing-design
```

该阶段先做 documentation-only design，不立即实现 runtime。

### 7.1 Multi-selection model

必须冻结：

- `selectedIds` 是否有稳定有序语义；
- primary/active selection 与集合 selection 的区别；
- 单击、Ctrl/Cmd-click、Shift-click、空白点击的集合变更；
- 删除、锁定、隐藏或 import 后 selection cleanup；
- Store change 与 selection change 的事件顺序；
- selection 是否属于 document canonical state（初步建议：不属于 PlotJSON）。

### 7.2 Box and lasso selection

必须冻结：

- contain、intersect 或 configurable hit policy；
- 使用 authored controls、derived geometry、hit-area 或组合判定；
- Polygon holes、LineString、Point 和 compound output 的一致规则；
- 屏幕空间与地理空间的边界；
- additive、subtractive、toggle gestures；
- drag threshold、camera gesture 冲突和 touch behavior；
- 大对象数量时的索引和性能预算。

### 7.3 Whole-object translation

初步原则：

```text
translate authored controls only
→ canonicalize
→ validate/generate every affected feature
→ all valid: one batch command
→ any invalid: no mutation
```

必须明确：

- local-metre 与 geodesic translation；
- antimeridian、高纬度和大范围输入；
- Definition parameters 是否随平移变化（通常不变）；
- group translation；
- locked features；
- transient preview 与 final commit；
- one gesture = one undo step。

### 7.4 Rotation and scale

必须冻结：

- pivot：selection center、bounding-box center、primary feature anchor 或 authored pivot；
- local projection origin；
- rotation direction and angle normalization；
- uniform/non-uniform scale；
- negative scale/reflection 是否禁止；
- screen-sized parameters 与 ground-sized controls 的关系；
- scale 对 radius/width 参数的影响；
- local-only Definitions 在 transform 后的 coordinate-mode gate；
- invalid multi-feature transform 的 atomic rollback。

### 7.5 Groups, locks and z-order

必须冻结：

- group 是 document metadata、独立 entity 还是 feature relation；
- stable group identifiers；
- nested groups 是否允许；
- lock 对 selection、style edit、handle edit 和 transform 的影响；
- hidden/visible state；
- z-order 是全局、layer 内还是 group 内；
- PlotJSON schema 和 migration；
- import unresolved group references 的策略。

### 7.6 Multi-object commands and transactions

必须新增或冻结：

- batch create/replace/delete command；
- transaction preflight；
- all-or-nothing Store mutation；
- listener exception rollback policy；
- history entry shape and memory limits；
- undo/redo selection restoration；
- command serialization/audit boundary；
- future collaboration/CRDT compatibility。

### 7.7 Interaction and accessibility

- pointer capture；
- keyboard nudging and modifiers；
- Escape cancellation；
- touch transform gestures；
- focus and ARIA feedback；
- camera drag/box zoom conflicts；
- visible transform handles and guides；
- reduced-motion and high-contrast behavior。

### 7.8 Required design fixtures

设计 PR 必须先列出：

- mixed Point/Line/Polygon multi-selection；
- additive/subtractive/toggle selection；
- contain/intersect box fixtures；
- lasso self-intersection policy；
- translation across multiple Definitions；
- invalid member causing atomic rollback；
- rotation/scale around deterministic pivot；
- locked/grouped objects；
- one gesture / one history entry；
- undo/redo selection behavior；
- style reload and selection overlays；
- 100、1,000、10,000 features performance targets；
- actual-rendered Chromium interaction matrix。

### 7.9 Design merge gate

```text
no runtime changes
Node 20.19:       success
Node 22:          success
Node tests:       184 passed
Chromium tests:   28 passed
Playground build: success
handover check:  success
review threads:  0 unresolved
```

设计 PR 合并后，才创建 Milestone 007 implementation branch。

## Milestone 008：吸附与约束

- spatial index；
- vertex/segment/midpoint/intersection snapping；
- grid、angle、bearing、parallel、perpendicular constraints；
- guides and explainable snap reasons。

## Milestone 009：更多符号与注记

- more control measures and Area families；
- rectangle、triangle、flags；
- callout、leader label、text、image、SVG annotation；
- true two-arc lune（若独立语义成立）。

## Milestone 010：IO 与项目管理

- formal PlotJSON JSON Schema；
- document/Definition migrations；
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
5. 实现 transaction/rollback；
6. 自动检查 README、LATEST、Playground 和 Registry 数量一致性；
7. 建立 performance benchmarks；
8. 正式 0.1.0 前完成 npm package-boundary review；
9. 处理 Playground bundle 超过 1 MB 的 code splitting；
10. 持续区分 source/build ready、workflow deployed 与 live manually verified。

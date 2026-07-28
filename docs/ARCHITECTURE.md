# PlotLibre 完整架构设计

## 1. 项目目标

PlotLibre 的目标是构建一个以 MapLibre GL JS 为首要渲染引擎、但几何算法和业务模型不依赖地图引擎的完整态势标绘框架。

项目最终应覆盖：

- 普通 GIS 几何绘制；
- 直箭头、细箭头、攻击箭头、燕尾攻击箭头、双箭头、钳击箭头、分队战斗箭头等传统态势标绘；
- 曲线、旗帜、集结地、扇形、弓形、走廊和区域控制措施；
- 选择、多选、框选、套索、移动、旋转、缩放、复制、分组和锁定；
- 顶点、线段、中点、交点、网格、角度、平行和垂直吸附；
- 撤销、重做、事务和操作历史；
- PlotJSON、GeoJSON、SVG、图片和标准军标数据交换；
- MIL-STD-2525D/E 与 APP-6D 的可选扩展；
- Vanilla、React、Vue 和后续协作扩展。

## 2. 关键架构原则

### 2.1 控制点是唯一事实来源

态势标绘对象通常由少量控制点和参数生成复杂几何。最终 Polygon 只是渲染缓存，不是原始数据。

一个完整对象由以下内容定义：

```text
PlotFeature
├── id
├── plotType
├── definitionVersion
├── controlPoints
├── parameters
├── style
├── metadata
└── revision
```

因此，编辑箭头时必须移动控制点或参数控制柄，然后重新生成几何，不能直接编辑派生 Polygon 的全部顶点。

### 2.2 几何算法不依赖 MapLibre

`@plotlibre/geometry` 只能处理坐标、数学参数和几何结果。它不能引用：

- MapLibre `Map`；
- MapLibre Source 或 Layer；
- DOM Event；
- React/Vue；
- 浏览器渲染状态。

这样可以进行纯单元测试，并为未来 OpenLayers、Leaflet、Cesium 或服务端渲染保留可能性。

### 2.3 符号采用注册定义而不是大型继承树

每个标绘类型由 `PlotDefinition` 描述：

```ts
interface PlotDefinition {
  type: string;
  title: string;
  category: string;
  version: string;
  controlSchema: ControlSchema;
  defaultParameters: Record<string, JsonValue>;
  defaultStyle: PlotStyle;
  generate(context: GenerateContext): RenderBundle;
  validate?(context: GenerateContext): ValidationResult;
}
```

该模式便于：

- 插件注册；
- 按需加载符号包；
- 算法版本管理；
- 自定义业务标绘；
- 统一 UI 符号目录；
- 避免大量相似子类。

### 2.4 渲染结果允许多部件组合

复杂态势标绘不应被强制表示为单个 Polygon。生成器返回 `RenderBundle`：

```text
fills
lines
points
labels
hitAreas
```

一个标准控制措施可同时包含填充区域、边界线、重复标记、文字和扩大后的点击区域。

### 2.5 MapLibre 是 peer dependency

应用程序决定其 MapLibre 版本。PlotLibre 适配器只依赖稳定的结构化地图接口，并在浏览器集成测试中验证 MapLibre 5.x 和 6.x。

## 3. 总体分层

```text
┌──────────────────────────────────────────────┐
│ Applications / React / Vue / Vanilla         │
├──────────────────────────────────────────────┤
│ @plotlibre/ui                                │
│ toolbar · catalog · style panel · layer tree │
├──────────────────────────────────────────────┤
│ PlotLibre Controller                         │
│ create · draw · edit · select · import       │
├──────────────────────────────────────────────┤
│ @plotlibre/core                              │
│ registry · store · commands · history        │
│ validation · transactions · PlotJSON         │
├──────────────────────────────────────────────┤
│ @plotlibre/interaction                       │
│ draw sessions · semantic state machines      │
├──────────────────────────────────────────────┤
│ @plotlibre/symbols / @plotlibre/milstd       │
│ declarative plot definitions                 │
├──────────────────────────────────────────────┤
│ @plotlibre/geometry                          │
│ projection · vectors · curves · topology     │
├──────────────────────────────────────────────┤
│ @plotlibre/maplibre                          │
│ renderer · sources · layers · hit testing    │
├──────────────────────────────────────────────┤
│ MapLibre GL JS                               │
└──────────────────────────────────────────────┘
```

## 4. 包设计

### 4.1 `@plotlibre/core`

职责：

- `PlotFeature`、`PlotDefinition` 和 `RenderBundle` 类型；
- `PlotRegistry`；
- `PlotStore`；
- Command 和 History；
- PlotJSON 解析、序列化和迁移；
- 事件和事务；
- 通用验证和错误类型。

禁止依赖地图引擎、DOM 和 UI。

当前已实现：基础类型、注册器、存储、三个命令、撤销重做和 PlotJSON 1.0。

### 4.2 `@plotlibre/geometry`

职责：

- 二维向量；
- 局部投影和测地计算；
- 曲线插值；
- 箭头公共构造；
- 面裁剪、布尔运算和拓扑验证；
- 几何简化和平滑；
- 反经线处理。

当前已实现：向量工具、局部米制投影、距离计算和直箭头面生成。

### 4.3 `@plotlibre/symbols`

职责：

- 基础几何符号包；
- Arrow 符号包；
- Tactical 区域与旗帜符号包；
- 符号分类、默认参数和默认样式；
- 控制点规则和自定义验证。

当前已实现：`arrow.straight`。

### 4.4 `@plotlibre/interaction`

职责：

- engine-independent `DrawSession` 契约；
- 状态快照和完成结果；
- 两点、后续多点和参数化绘制会话；
- 键盘行为；
- 不依赖 MapLibre、DOM 或 WebGL。

当前已实现：`TwoPointDrawSession`，支持 ready/drawing/completed/cancelled、pointer preview、Enter 完成、Escape 取消和 Backspace/Delete 重置。

### 4.5 `@plotlibre/maplibre`

职责：

- 创建和维护 committed、draft、handles GeoJSON Source；
- 创建 fill、line、circle 和 handles 图层；
- 把 `RenderBundle` 转换为 MapLibre 数据；
- 把 MapLibre 点击、移动、拖动、键盘和 style 事件转换为语义交互；
- 高层 `PlotLibre` 控制器；
- hit testing、选择和控制点编辑。

当前已实现：三套 Source、七个图层、两点交互绘制、动态预览、对象选择、语义控制点拖动、单命令撤销、`style.load` 恢复和 PlotJSON 导入导出。

### 4.6 计划包

```text
@plotlibre/ui
@plotlibre/io
@plotlibre/milstd
@plotlibre/react
@plotlibre/vue
@plotlibre/collab
```

交互内核已经确认独立为 `@plotlibre/interaction`。MapLibre 包只保留地图事件、命中测试、cursor、dragPan 和 Source/Layer 生命周期适配。

## 5. 数据流

### 5.1 创建流程

```text
用户输入控制点
→ DrawSession 更新草图状态
→ PlotDefinition.validate
→ PlotDefinition.generate
→ RenderBundle
→ Draft Source
→ 完成命令
→ PlotStore
→ Committed Source
→ History
```

### 5.2 编辑流程

```text
选择 PlotFeature
→ 根据 PlotDefinition 创建语义控制柄
→ 拖动控制柄
→ 修改 controlPoints 或 parameters
→ 重新生成 RenderBundle
→ Draft preview
→ pointerup 提交单个 ReplacePlotCommand
```

拖动期间不得产生数百条历史命令。一次 pointerdown 到 pointerup 是一个事务。

### 5.3 导入流程

```text
PlotJSON
→ schema validation
→ version migration
→ definition availability check
→ semantic validation
→ PlotStore
→ renderer regeneration
```

缺失 definition 时，默认不猜测算法。后续可提供 unresolved feature 状态，允许保留数据但不渲染。

## 6. 交互状态机

完整状态计划：

```text
idle
preparing
collecting-control-points
previewing
completing
selected
editing-control-point
editing-parameter
translating
rotating
scaling
committing
cancelled
```

每个 `DrawSession` 必须定义：

- 开始条件；
- 最少和最多控制点；
- 单击、双击、Enter、Escape、Backspace 行为；
- 动态预览；
- 完成条件；
- 取消后的清理；
- 地图平移手势冲突策略；
- 触摸长按和拖动策略。

## 7. 控制柄模型

计划控制柄类型：

```text
vertex
midpoint
width
head-length
neck-width
tail-depth
curve
radius
rotation
scale
virtual
```

控制柄本身也是语义对象：

```ts
interface PlotHandle {
  id: string;
  plotId: string;
  kind: PlotHandleKind;
  coordinate: Position;
  cursor: string;
  apply(context: HandleDragContext): PlotFeature;
}
```

攻击箭头应只展示有意义的控制柄，而不是暴露派生面上的每一个顶点。

## 8. 吸附系统

吸附候选类型：

- vertex；
- segment；
- midpoint；
- intersection；
- grid；
- angle；
- bearing；
- parallel；
- perpendicular；
- external source。

设计要求：

- 使用屏幕像素容差；
- 空间索引筛选候选；
- 可配置优先级；
- 支持 Alt 临时禁用；
- 支持 Shift 角度约束；
- 返回吸附原因和辅助线；
- 不直接修改数据，由交互会话决定是否采用候选。

## 9. MapLibre 渲染

### 9.1 Source 规划

完整版本计划：

```text
plotlibre-committed
plotlibre-draft
plotlibre-handles
plotlibre-guides
plotlibre-labels
plotlibre-hitareas
```

当前已经实现前三套 Source：`committed` 保存 Store 派生结果，`draft` 承担高频预览，`handles` 显示语义控制点。`guides`、独立标签和扩大命中区域将在后续里程碑增加。

### 9.2 图层顺序

```text
fill
main line
outline
dashed line
symbol
text
hover
selection
hit area
guides
handles
```

选择态和 hover 态尽量使用 feature-state 或独立 overlay source，避免重建全部数据。

### 9.3 Style reload

MapLibre `setStyle()` 会删除自定义 source/layer。适配器监听 `style.load`，幂等恢复三套 Source、七个图层、Store 数据、活动 draft 和选择 handles。

### 9.4 增量更新

大量标绘对象时，应保持稳定的 Feature ID，优先更新变化对象。当前 `setData()` 全量更新适用于基础阶段，后续评估 MapLibre `updateData()`、分块 Source 和 dirty-feature 更新。

## 10. 坐标和尺寸模式

### 10.1 坐标模式

```text
local
geodesic
```

短距离态势图形在局部切平面中计算。长距离、跨区域和高纬度对象必须使用测地算法。

### 10.2 尺寸模式

```text
ground
screen
relative
```

- `ground`：宽度和半径以米表示；
- `screen`：视觉宽度以像素近似保持；
- `relative`：宽度由控制线长度比例计算。

当前直箭头使用 `relative`，并以米制最小/最大宽度限制。

## 11. 符号目录

### 11.1 基础几何

```text
point
text
polyline
polygon
freehand-line
freehand-polygon
rectangle
rotated-rectangle
circle
ellipse
arc
sector
lune
bezier
spline
closed-curve
corridor
buffer
```

### 11.2 箭头

```text
arrow.straight
arrow.fine
arrow.fine.tailed
arrow.assault-direction
arrow.curved
arrow.attack
arrow.attack.tailed
arrow.squad-combat
arrow.squad-combat.tailed
arrow.double
arrow.pincer
arrow.route
arrow.corridor
arrow.multi-head
```

### 11.3 旗帜和注记

```text
flag.triangle
flag.rectangle
flag.curve
flag.swallowtail
annotation.callout
annotation.leader-label
annotation.image
annotation.svg
```

### 11.4 区域和控制措施

```text
area.gathering
area.assembly
area.search
area.warning
area.restricted
area.evacuation
area.safe
route.control
boundary
phase-line
axis
obstacle
minefield
bridgehead
air-corridor
```

## 12. 命令和事务

当前命令：

- `CreatePlotCommand`；
- `DeletePlotCommand`；
- `ReplacePlotCommand`。

计划命令：

- MoveControlPoint；
- InsertControlPoint；
- RemoveControlPoint；
- UpdateParameters；
- UpdateStyle；
- TransformSelection；
- Group/Ungroup；
- ImportDocument。

事务要求：

- 多对象移动只生成一个撤销步骤；
- 连续拖动可合并；
- redo 后执行新命令必须清空 redo 栈；
- 命令必须保存足够的前后状态；
- 命令执行失败不得污染历史栈。

## 13. 性能目标

v1.0 目标：

| 场景 | 目标 |
|---|---:|
| 可浏览普通标绘 | 10,000 个 |
| 屏幕内复杂标绘 | 2,000 个 |
| 当前对象拖动 | 接近 60 FPS |
| 指针预览主线程计算 | 通常小于 8 ms |
| Undo/Redo | 至少 200 步 |
| PlotJSON 导入 | 10,000 对象可接受时间完成 |

实现措施：

- requestAnimationFrame 合并 pointermove；
- draft source 与 committed source 分离；
- RBush 空间索引；
- geometry worker；
- 算法缓存；
- 增量更新；
- 缩放级别相关简化；
- 军标符号按需加载。

## 14. 测试体系

### 14.1 数值测试

检查：

- 输出有限；
- Polygon 闭合；
- 参数边界；
- 退化输入；
- 面积和方向；
- 平移、旋转和缩放不变量。

### 14.2 黄金几何和视觉快照

每种符号保存固定控制点及基准输出。浏览器阶段增加 SVG/PNG 快照，避免数值变化不明显但形状退化。

### 14.3 性质测试

随机生成控制点，验证不出现 NaN、Infinity、非闭合环和异常全球环绕面。

### 14.4 浏览器测试

计划使用 Playwright 覆盖 Chromium、Firefox、WebKit，并验证 MapLibre 5.x 和 6.x。

## 15. 版本策略

- `0.0.x`：基础架构可能快速调整；
- `0.1.x`：核心和首批箭头可用；
- `0.2.x`：传统态势符号完整；
- `0.3.x`：专业编辑和吸附；
- `0.4.x`：MIL-STD/APP-6；
- `1.0.0`：稳定 API、迁移策略和完整文档。

PlotJSON 的 `schemaVersion` 与各符号的 `definitionVersion` 独立。算法变化若会改变同一控制点的几何结果，必须提升 definition version 并提供迁移说明。

## 16. 当前实现与下一步

当前已完成两个纵向里程碑：

```text
PlotFeature
→ Registry
→ StraightArrow geometry
→ RenderBundle
→ committed / draft / handles sources
→ engine-independent TwoPointDrawSession
→ MapLibre event adapter
→ semantic handle editing
→ Store / CommandHistory
→ PlotJSON
→ 15 tests
```

当前交互保证：

1. 首次点击只采集起点，不生成无效几何；
2. pointermove 只更新 draft，不写 Store；
3. 第二次点击或 Enter 只提交一个 CreatePlotCommand；
4. Escape 取消并清理 draft；
5. 拖动控制点期间只渲染 preview；
6. mouseup 只提交一个 ReplacePlotCommand；
7. undo/redo 后 handles 跟随 Store；
8. `style.load` 后幂等恢复全部 PlotLibre 图层和状态。

下一里程碑是浏览器示例与 GitHub Pages：

1. 建立 `apps/playground`；
2. 使用真实 MapLibre GL JS 6 ESM 构建；
3. 增加工具栏、状态提示和 JSON 导入导出；
4. 加入 Playwright Chromium 测试；
5. 建立 MapLibre 5/6 测试矩阵；
6. 建立 GitHub Pages 构建与部署；
7. 示例应用仅调用公开 API；
8. 完成后再进入箭头公共几何基础和攻击箭头系列。

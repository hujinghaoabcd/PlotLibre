# PlotLibre Development Handover — Milestone 005A Fine Arrow

日期：2026-07-29  
仓库：`hujinghaoabcd/PlotLibre`  
目标分支：`main`  
开发分支：`agent/arrow-fine-vertical-slice`  
PR：`#7 Add fine arrow vertical slice`  
基线提交：`06e392aaec42bd89ee4856244be49df7a9d934ba`

## Current state

Milestone 004 已通过 PR #6 合并到最新 `main`，包括公共箭头几何基础、GitHub Pages 底图降级和完整 MapLibre GL JS 6 Worker 模块打包。

Milestone 005A 在此基础上只实现一个新符号：

```text
arrow.fine
```

当前 workspace 版本：

```text
0.0.5
```

权威验证运行：

```text
Initial full implementation: 30387914395
Documentation-synchronized: 30388427130
```

两次运行均为：

```text
validate (20.19): success
validate (22): success
browser: success
Node tests: 33 passed
```

当前状态：**`arrow.fine` 完整纵向切片已实现并通过两轮全套 CI；等待最终 handover 同步检查和 PR #7 合并。**

## Completed in this milestone

### 1. 新公共类型

```text
arrow.fine
```

公开常量：

```ts
FINE_ARROW_TYPE = "arrow.fine"
```

它是独立 PlotDefinition 和独立参数契约，不是 `arrow.straight` 的别名或仅样式变化。

### 2. 语义控制点

```text
controlPoints[0] = tail center
controlPoints[1] = tip
```

两个控制点是 PlotJSON 和编辑系统中的源数据。Polygon 顶点是派生结果。

### 3. 几何实现

新增：

```text
packages/geometry/src/fine-arrow.ts
```

公开 API：

```ts
FineArrowParameters
ResolvedFineArrowParameters
DEFAULT_FINE_ARROW_PARAMETERS
resolveFineArrowParameters()
buildFineArrowRing()
```

默认参数：

```text
tailWidthRatio       = 0.055
headLengthRatio      = 0.22
headWidthRatio       = 1.9
neckWidthRatio       = 0.42
minimumWidthMeters   = 1
maximumWidthMeters   = 100000
```

构造流程：

```text
WGS84 tail/tip
→ local metre projection at tail
→ normalized direction and left normal
→ clamped narrow tail width
→ shared buildArrowHead()
→ tapered body ring
→ WGS84 derived polygon
→ exact semantic tip restoration
```

Ring 顺序：

```text
tailLeft
→ neckLeft
→ headLeft
→ tip
→ headRight
→ neckRight
→ tailRight
→ tailLeft
```

几何特点：

- 比默认直箭头更窄；
- 尾部向颈部明显收窄；
- 箭翼比直箭头克制；
- 使用公共箭头头部组件；
- 最短经差支持反经线附近的小范围箭头；
- 精确保留第二控制点作为箭尖。

### 4. 参数校验

约束：

```text
tailWidthRatio       [0.005, 0.3]
headLengthRatio      [0.05, 0.7]
headWidthRatio       [1, 6]
neckWidthRatio       [0.05, 1]
minimumWidthMeters   > 0
maximumWidthMeters   >= minimumWidthMeters
```

错误策略：

- 重合控制点：`RangeError`；
- 非有限坐标：local projection 拒绝；
- 纬度越界：Registry 拒绝；
- 参数越界：`RangeError`；
- 极点不稳定：要求后续 geodesic mode。

### 5. 符号定义

新增：

```text
packages/symbols/src/fine-arrow.ts
```

定义：

```ts
fineArrowDefinition
```

能力：

- `minPoints = 2`；
- `maxPoints = 2`；
- 独立默认参数；
- 公共默认样式；
- 生成 fill；
- 生成 outline；
- 生成 hit-area；
- render properties 中保留 `plotType = arrow.fine`。

更新：

```text
packages/symbols/src/catalog.ts
packages/symbols/src/index.ts
packages/geometry/src/index.ts
```

`builtInSymbols` 现在包含：

```text
arrow.straight
arrow.fine
```

### 6. DrawSession 和编辑

没有创建第二套两点交互代码。

`MapLibrePlotInteraction.startDraw()` 已支持所有满足以下条件的定义：

```text
minPoints = 2
maxPoints = 2
```

因此 `arrow.fine` 复用：

- `TwoPointDrawSession`；
- click tail；
- pointer preview；
- click/Enter complete；
- Escape cancel；
- 两个语义控制点 handle；
- handle drag preview；
- 单次拖动单一 ReplacePlotCommand；
- undo/redo；
- style reload recovery。

### 7. PlotJSON

`arrow.fine` 保存：

```text
plotType
controlPoints
parameters
style
metadata
revision
```

测试确认 `serializePlotDocument()` 与 `parsePlotDocument()` 往返后语义对象完全一致。

### 8. 数值和黄金测试

新增：

```text
tests/fine-arrow.test.mjs
tests/fixtures/fine-arrow.json
```

黄金样例：

```text
tail = [0, 0]
tip  = [0.01, 0]
```

预期环坐标基于赤道局部米制投影，使用 `1e-12` 度容差比较。

覆盖：

- 确定性黄金坐标；
- ring 长度；
- ring 闭合；
- 所有坐标有限；
- 箭尖精确等于第二控制点；
- 默认细箭头比默认直箭头窄；
- 重合点拒绝；
- 参数边界；
- built-in registry；
- fill、outline、hit-area；
- PlotJSON round trip。

Node 测试由 27 项增加到：

```text
33 passed
```

### 9. Playground 符号选择器

更新：

```text
apps/playground/src/template.ts
apps/playground/src/playground-app.ts
apps/playground/src/main.ts
```

新增：

```text
apps/playground/src/symbol-controls.css
```

工具栏选择器：

```text
直箭头 → arrow.straight
细箭头 → arrow.fine
```

行为：

- 点击“开始绘制”读取当前选项；
- 绘制期间禁用选择器；
- 状态文字显示当前符号；
- 样式面板对两种箭头通用；
- v0.0.5 demo 标识。

### 10. 南京混合示例

生产页面三个样例现在包含：

```text
2 × arrow.straight
1 × arrow.fine
```

示例加载仍清空 History、自动选择第一个对象并 fitBounds。

### 11. Chromium E2E

更新：

```text
apps/playground/e2e/playground.spec.ts
```

新增或加强验证：

- 符号选择器默认 `arrow.straight`；
- `selectOption("arrow.fine")`；
- 两点绘制完成；
- Store 选中对象 `plotType = arrow.fine`；
- 控制点数量为 2；
- `queryRenderedFeatures()` 返回 `arrow.fine`；
- 生产式南京样例包含直箭头和细箭头；
- committed Source 中包含 `arrow.fine`；
- Worker entry/shared 模块测试继续通过；
- 直箭头、撤销重做、样式、删除和 PlotJSON 均不回归。

### 12. 文档

新增：

```text
docs/algorithms/arrow-fine.md
docs/handover/2026-07-29-milestone-005a-fine-arrow.md
```

更新：

```text
AGENTS.md
README.md
docs/DEVELOPMENT_PLAN.md
docs/PLAYGROUND.md
docs/handover/LATEST.md
package.json
```

算法文档记录：

- 控制点语义；
- 参数和单位；
- 构造公式；
- 与直箭头差异；
- 退化策略；
- 测试；
- clean-room 来源；
- 后续演化。

### 13. Clean-room provenance

使用通用公共领域数学：

- 二维向量归一化；
- 左法向量；
- 局部等距近似；
- 按比例构造细身和箭头；
- Polygon ring 闭合。

代码复用：

```text
none
```

没有复制或翻译 OpenLayers、Maptalks、Mars3D、Cesium、Mapbox、ol-plot、tactical-draw 或其他标绘库源码。

## Validation

### Initial implementation

```text
Run ID: 30387914395
```

结果：

- Node 20.19：success；
- Node 22：success；
- TypeScript：success；
- 33 Node tests：success；
- Playground typecheck：success；
- `/PlotLibre/` build：success；
- handover contract：success；
- Chromium：success；
- real fine-arrow rendered feature：success。

### Documentation-synchronized

```text
Run ID: 30388427130
```

结果：

- Node 20.19：success；
- Node 22：success；
- 33 Node tests：success；
- README/roadmap/Playground docs build：success；
- symbol selector CSS build：success；
- Chromium：success。

### Required commands

```bash
npm run typecheck
npm test
npm run playground:typecheck
npm run playground:build
npm run handover:check
npm run playground:e2e
```

## Next tasks

### 合并收尾

1. 确认最终 handover 同步 CI 绿色；
2. 将 PR #7 标记为 Ready；
3. 合并 PR #7 到 `main`；
4. 确认 Pages workflow 重新部署；
5. 从最新 `main` 创建 Milestone 005B 分支。

### Milestone 005B：`arrow.fine.tailed`

1. 提取 `arrow.fine` 的内部两点箭身构造结果，避免复制完整函数；
2. 定义燕尾深度参数，例如 `tailNotchRatio`；
3. 明确缺口点相对于尾中心和箭身方向的语义；
4. 实现 `buildTailedFineArrowRing()`；
5. 防止缺口越过颈部或形成自交；
6. 实现 `arrow.fine.tailed` PlotDefinition；
7. 复用 TwoPointDrawSession 和两个 handles；
8. 添加黄金坐标、退化和参数测试；
9. 添加 PlotJSON round trip；
10. 加入 Playground selector 和南京示例；
11. 添加真实 Chromium rendered-feature 测试；
12. 编写 `docs/algorithms/arrow-fine-tailed.md`；
13. 更新 handover。

在完成 `arrow.fine.tailed` 前，不并行实现 `arrow.assault-direction`、`arrow.curved` 或攻击箭头。

## Risks and decisions

- `arrow.fine` 当前是两点短程 local projection 符号，不是完整椭球测地构造；
- 极高纬度应拒绝 local mode，后续需明确 geodesic generator；
- 默认尺寸为 ground-relative，不包含 pixel/screen size mode；
- 参数控制柄尚未实现，当前只能通过 API 或 PlotJSON 修改几何参数；
- 当前黄金测试是数值坐标，不是截图像素黄金基线；
- `arrow.fine` 与 `arrow.straight` 有相同 ring topology，但拥有独立类型、参数、函数、测试和演化契约；
- 后续 tailed 版本必须抽取共享主体组件，不能复制整个 `buildFineArrowRing()`；
- 当前 Store/History 对不同两点符号通用，这是有意的组合式复用；
- Playground selector 是第一个 catalog UI，后续符号增多后需要数据驱动而不是继续手写 option；
- 仓库仍为 `UNLICENSED`，公开发布前必须决定许可证；
- Pages 的在线 raster 底图仍是可选外部服务，但标绘和 E2E 不依赖其可用性。

## Continuation instructions

新的开发者或对话必须：

1. 阅读 `AGENTS.md`；
2. 阅读 `docs/ARCHITECTURE.md`；
3. 阅读 `docs/GEOMETRY_FOUNDATION.md`；
4. 阅读 `docs/algorithms/arrow-fine.md`；
5. 阅读 `docs/MAPLIBRE_WORKER_PACKAGING.md`；
6. 阅读本文件；
7. 确认 PR #7 是否已合并；
8. 从最新 `main` 创建 `arrow.fine.tailed` 分支；
9. 先抽取可复用细箭身内部构造；
10. 不修改已发布的 `arrow.fine` 默认视觉契约而不提供迁移说明；
11. 所有浏览器测试继续验证实际 rendered feature；
12. 完成后更新 `LATEST.md` 并添加新的不可变交接文件。

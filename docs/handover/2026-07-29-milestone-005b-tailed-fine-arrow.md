# PlotLibre Development Handover — Milestone 005B Tailed Fine Arrow

日期：2026-07-29  
仓库：`hujinghaoabcd/PlotLibre`  
目标分支：`main`  
开发分支：`agent/tailed-fine-arrow-vertical-slice`  
PR：`#8 Add tailed fine arrow vertical slice`  
基线提交：`c738d72b0ccf49f3487697791083ba0d15286a75`

## Current state

Milestone 005A 已合并，`arrow.fine` 已成为稳定的两点细箭头基线。Milestone 005B 在该基线上完成：

```text
arrow.fine.tailed
```

当前 workspace：

```text
0.0.6
```

完整能力链：

```text
shared fine-arrow frame
→ tailed geometry
→ PlotDefinition
→ built-in registry
→ PlotJSON
→ TwoPointDrawSession
→ semantic handles
→ MapLibre committed Source/Layers
→ Playground selector and sample
→ Chromium rendered-feature test
```

权威 CI：

```text
30389925716  initial implementation
30390499066  documentation and topology validation sync
```

两次均通过：

```text
validate (20.19): success
validate (22): success
browser: success
```

Node 测试由 33 项增加至 39 项。

当前状态：**功能、测试、算法文档和对外文档已经完成；等待最终 handover 同步 CI、PR #8 Ready 和合并。**

## Completed in this milestone

### 1. 共享细箭头 frame

新增内部文件：

```text
packages/geometry/src/fine-arrow-frame.ts
```

内部结构：

```ts
FineArrowFrame
buildFineArrowFrame()
unprojectFineArrowRing()
```

统一计算：

- local projection；
- tail center；
- projected tip；
- normalized direction；
- left normal；
- total arrow length；
- clamped tail half-width；
- shared `ArrowHeadGeometry`。

该文件未从 `@plotlibre/geometry` 的公共 index 导出，是 geometry 包内部复用边界。

### 2. `arrow.fine` 回归重构

更新：

```text
packages/geometry/src/fine-arrow.ts
```

`buildFineArrowRing()` 不再重复投影、宽度和箭头头部计算，而是消费 `FineArrowFrame`。

保持不变：

- 公开函数名；
- 参数接口；
- 默认参数；
- ring 顶点顺序；
- 精确语义箭尖；
- 黄金 fixture；
- PlotJSON；
- Playground 行为。

既有 `tests/fine-arrow.test.mjs` 全部通过，证明共享 frame 重构没有改变 `arrow.fine` 的视觉和数据契约。

### 3. 燕尾细箭头几何

新增：

```text
packages/geometry/src/tailed-fine-arrow.ts
```

公开 API：

```ts
TailedFineArrowParameters
ResolvedTailedFineArrowParameters
DEFAULT_TAILED_FINE_ARROW_PARAMETERS
resolveTailedFineArrowParameters()
buildTailedFineArrowRing()
```

燕尾版本继承全部 `FineArrowParameters`，新增：

```text
tailNotchRatio = 0.9
```

定义：

```text
fullTailWidth = 2 × tailHalfWidth
notchDepth = fullTailWidth × tailNotchRatio
notch = tailCenter + direction × notchDepth
```

约束：

```text
tailNotchRatio ∈ [0.05, 4]
```

### 4. Ring 拓扑

燕尾 ring：

```text
tailLeft
→ neckLeft
→ headLeft
→ tip
→ headRight
→ neckRight
→ tailRight
→ notch
→ tailLeft
```

总坐标数：

```text
9
```

与平尾细箭头相比，唯一尾部拓扑差异为：

```text
tailRight → notch → tailLeft
```

### 5. 动态拓扑安全

生成器执行：

1. 静态 `tailNotchRatio` 范围校验；
2. `notchDepth < 0.8 × shaftLength`；
3. 缺口必须位于 neck center 后方；
4. 局部 ring 必须通过 `isSimpleRing()`；
5. 非有限坐标由 local projection/vector 层拒绝；
6. tip 恢复为原始第二控制点。

错误不会被静默裁剪。过深缺口或自交明确抛出 `RangeError`。

### 6. Symbol definition

新增：

```text
packages/symbols/src/tailed-fine-arrow.ts
```

公开：

```ts
TAILED_FINE_ARROW_TYPE = "arrow.fine.tailed"
tailedFineArrowDefinition
generateTailedFineArrow()
```

Definition：

- `minPoints = 2`；
- `maxPoints = 2`；
- definition version `1.0.0`；
- 完整默认参数；
- fill；
- outline；
- hit-area；
- render properties 保留正确 `plotType`。

更新：

```text
packages/geometry/src/index.ts
packages/symbols/src/catalog.ts
packages/symbols/src/index.ts
```

`builtInSymbols`：

```text
arrow.straight
arrow.fine
arrow.fine.tailed
```

### 7. PlotJSON

测试确认以下数据完整往返：

```text
plotType = arrow.fine.tailed
definitionVersion = 1.0.0
controlPoints
fine-arrow base parameters
tailNotchRatio
style
metadata
revision
```

`tailNotchRatio = 0.9` 在序列化和解析后保持不变。

### 8. 数值和黄金测试

新增：

```text
tests/fixtures/tailed-fine-arrow.json
tests/tailed-fine-arrow.test.mjs
```

黄金控制点：

```text
tail = [0, 0]
tip  = [0.01, 0]
```

默认缺口：

```text
[0.000495, 0]
```

测试覆盖：

- 确定性黄金坐标；
- 9 点闭合 ring；
- 所有坐标有限；
- 精确 tip；
- `isSimpleRing()`；
- 缺口位于中心线；
- 增大 `tailNotchRatio` 只改变 notch，不改变其余顶点；
- 比例下界和上界；
- 动态过深缺口拒绝；
- built-in Registry；
- fill、outline、hit-area；
- PlotJSON round trip。

现有测试继续覆盖平尾细箭头、直箭头、公共几何、Store、History、Interaction 和 MapLibre adapter。

### 9. Playground

更新：

```text
apps/playground/src/template.ts
apps/playground/src/playground-app.ts
apps/playground/e2e/playground.spec.ts
```

选择器现在包含：

```text
直箭头
细箭头
燕尾细箭头
```

Demo badge：

```text
v0.0.6 demo
```

南京示例：

```text
1 × arrow.straight
1 × arrow.fine
1 × arrow.fine.tailed
```

三种类型共享：

- TwoPointDrawSession；
- pointer preview；
- Enter/Escape；
- 两个语义 handles；
- style panel；
- History；
- PlotJSON。

### 10. Chromium E2E

新增/加强：

- selector option 数量为 3；
- 生产式示例包含三种类型；
- committed Source 包含三种类型；
- 绘制 `arrow.fine.tailed`；
- Store 类型正确；
- 控制点数量为 2；
- 派生 ring 长度为 9；
- `queryRenderedFeatures()` 返回实际燕尾细箭头；
- Worker entry/shared 模块继续通过；
- 直箭头、细箭头、undo/redo、style、delete 和 PlotJSON 无回归。

### 11. 文档

新增：

```text
docs/algorithms/arrow-fine-tailed.md
docs/handover/2026-07-29-milestone-005b-tailed-fine-arrow.md
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

文档记录：

- frame 复用；
- 参数定义；
- notch 公式；
- ring 拓扑；
- 动态安全策略；
- PlotJSON；
- 测试；
- clean-room 来源。

### 12. Clean-room provenance

使用通用公共领域数学：

- 二维方向向量和法向量；
- local projection；
- 比例宽度；
- 沿中心方向放置缺口；
- Polygon ring 自交检测。

代码复用：

```text
none
```

没有复制或翻译 ol-plot、Maptalks、Mars3D、Cesium、Mapbox、tactical-draw 或其他标绘库源码。

## Validation

### Initial implementation

```text
Run ID: 30389925716
```

结果：

- Node 20.19：success；
- Node 22：success；
- TypeScript/build：success；
- Node tests：success；
- Playground build：success；
- handover contract：success；
- Chromium：success；
- actual `arrow.fine.tailed` rendered feature：success。

### Documentation and topology validation sync

```text
Run ID: 30390499066
```

结果：

- dynamic `isSimpleRing()` validation：success；
- README/roadmap/Playground/AGENTS：success；
- Node 20.19：success；
- Node 22：success；
- Chromium：success。

Required commands：

```bash
npm run typecheck
npm test
npm run playground:typecheck
npm run playground:build
npm run handover:check
npm run playground:e2e
```

## Next tasks

### Merge and deploy

1. 运行最终 handover 同步 CI；
2. 将 PR #8 标记 Ready；
3. 合并 PR #8 到 `main`；
4. 确认 Pages workflow 重新部署；
5. 从最新 `main` 创建 Milestone 005C 分支。

### Milestone 005C：`arrow.assault-direction`

开始写代码前必须完成设计判断：

1. 明确与 `arrow.fine` 的语义差异；
2. 明确与 `arrow.straight` 的视觉差异；
3. 确认是否仍为 tail center + tip 两点语义；
4. 定义使用场景；
5. 设计独立参数，禁止只更换 fine-arrow 默认值；
6. 决定是否新建 body strategy/frame；
7. 记录 clean-room 来源。

完整纵向切片必须包含：

- geometry；
- Definition；
- 参数和退化策略；
- golden fixture；
- PlotJSON；
- DrawSession/handles；
- Playground selector/sample；
- real Chromium rendered feature；
- 算法文档和 handover。

在 `arrow.assault-direction` 完成前，不并行实现 curved、attack 或 double arrows。

## Risks and decisions

- 当前细箭头系列使用短程 local projection，不是完整椭球测地构造；
- 极高纬度应拒绝 local mode；
- 当前尺寸为 ground-relative，没有 pixel/screen mode；
- `tailNotchRatio` 相对尾部完整宽度，而非总长度；
- 动态 80% shaft limit 是当前安全策略，后续改变属于算法契约变化；
- `FineArrowFrame` 是内部 API，不保证对外稳定；
- parameter handles 尚未实现；
- 黄金测试是数值坐标，不是截图像素基线；
- selector 当前仍手写 option，符号继续增多后应改为数据驱动；
- 仓库仍为 `UNLICENSED`；
- 在线 raster 底图是可选外部服务，标绘和 E2E 不依赖它。

## Continuation instructions

新的开发者或对话必须：

1. 阅读 `AGENTS.md`；
2. 阅读 `docs/ARCHITECTURE.md`；
3. 阅读 `docs/GEOMETRY_FOUNDATION.md`；
4. 阅读 `docs/algorithms/arrow-fine.md`；
5. 阅读 `docs/algorithms/arrow-fine-tailed.md`；
6. 阅读 `docs/MAPLIBRE_WORKER_PACKAGING.md`；
7. 阅读本文件；
8. 确认 PR #8 合并后从最新 `main` 开发；
9. 下一步只设计和实现 `arrow.assault-direction`；
10. 不把它做成 fine-arrow 的简单默认参数别名；
11. 保持 actual rendered-feature 浏览器测试；
12. 完成后更新 `LATEST.md` 和新的不可变交接文件。

# PlotLibre Development Handover — Milestone 005A Fine Arrow

日期：2026-07-29  
仓库：`hujinghaoabcd/PlotLibre`  
目标分支：`main`  
开发分支：`agent/arrow-fine-vertical-slice`  
PR：`#7 Add fine arrow vertical slice`  
基线提交：`06e392aaec42bd89ee4856244be49df7a9d934ba`  
最终功能提交：`42dd74f73dd9121e0dcbbe06a2d7cf4e61b581f9`

## Current state

Milestone 005A 已完成独立参数化符号：

```text
arrow.fine
```

当前 workspace 版本：

```text
0.0.5
```

该符号已贯通：

```text
semantic control points
→ geometry
→ PlotDefinition
→ built-in registry
→ PlotJSON
→ TwoPointDrawSession
→ semantic handles
→ MapLibre committed source/layers
→ Playground selector
→ Chromium rendered-feature test
```

最终 handover 写入前已经完成三轮权威 CI：

```text
30387914395  initial full implementation
30388427130  documentation and selector styling
30388669059  handover-synchronized validation
```

三次均为：

```text
validate (20.19): success
validate (22): success
browser: success
Node tests: 33 passed
```

当前状态：**功能、测试、文档和交接均完成，PR #7 可标记 Ready 并合并到 `main`。**

## Completed in this milestone

### 1. Geometry

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

语义控制点：

```text
controlPoints[0] = tail center
controlPoints[1] = tip
```

默认参数：

| 参数 | 默认值 | 约束 |
|---|---:|---|
| `tailWidthRatio` | `0.055` | `[0.005, 0.3]` |
| `headLengthRatio` | `0.22` | `[0.05, 0.7]` |
| `headWidthRatio` | `1.9` | `[1, 6]` |
| `neckWidthRatio` | `0.42` | `[0.05, 1]` |
| `minimumWidthMeters` | `1` | `> 0` |
| `maximumWidthMeters` | `100000` | `>= minimum` |

构造流程：

```text
WGS84 tail/tip
→ local metre projection
→ normalized direction and left normal
→ clamped narrow tail width
→ shared buildArrowHead()
→ tapered body ring
→ WGS84 derived polygon
→ exact semantic tip restoration
```

Ring：

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

特性：

- 独立于 `arrow.straight`；
- 默认比直箭头更窄；
- 尾部向颈部明显收窄；
- 箭翼宽度更克制；
- 复用公共 `buildArrowHead()`；
- 支持最短反经线经差；
- 精确保留第二语义控制点作为箭尖；
- 重合点和越界参数明确抛错。

更新：

```text
packages/geometry/src/index.ts
```

### 2. Symbol definition

新增：

```text
packages/symbols/src/fine-arrow.ts
```

公开：

```ts
FINE_ARROW_TYPE = "arrow.fine"
fineArrowDefinition
generateFineArrow()
```

Definition：

- `minPoints = 2`；
- `maxPoints = 2`；
- 独立默认参数；
- 公共默认样式；
- 输出 fill；
- 输出 outline；
- 输出 hit-area；
- render properties 保留 `plotType = arrow.fine`。

更新：

```text
packages/symbols/src/catalog.ts
packages/symbols/src/index.ts
```

`builtInSymbols` 当前包含：

```text
arrow.straight
arrow.fine
```

### 3. Interaction reuse

没有创建重复交互系统。

`arrow.fine` 复用：

- engine-independent `TwoPointDrawSession`；
- click tail；
- pointer preview；
- click/Enter complete；
- Escape cancel；
- 两个语义控制点 handles；
- handle drag preview；
- 一次拖动一个 ReplacePlotCommand；
- undo/redo；
- style reload recovery。

这证明当前 Registry + 通用两点 session 的组合式设计可以扩展第二个真实符号。

### 4. PlotJSON

测试确认以下语义数据完整往返：

```text
plotType = arrow.fine
controlPoints
parameters
style
metadata
revision
```

`serializePlotDocument()` 与 `parsePlotDocument()` 后对象完全一致。

### 5. Numerical and golden tests

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

覆盖：

- 赤道向东确定性坐标；
- `1e-12` 度坐标容差；
- ring 长度与闭合；
- 所有坐标有限；
- 精确语义箭尖；
- 比默认直箭头更窄；
- 重合控制点；
- 参数边界；
- built-in Registry；
- fill、outline、hit-area；
- PlotJSON round trip。

Node 测试：

```text
27 → 33 passed
```

### 6. Playground selector and examples

更新：

```text
apps/playground/src/template.ts
apps/playground/src/playground-app.ts
apps/playground/src/main.ts
apps/playground/e2e/playground.spec.ts
```

新增：

```text
apps/playground/src/symbol-controls.css
```

选择器：

```text
直箭头 → arrow.straight
细箭头 → arrow.fine
```

行为：

- “开始绘制”读取当前类型；
- 绘制中锁定选择器；
- 状态栏显示当前符号；
- 两种符号共享样式面板；
- demo 标识更新至 `0.0.5`。

南京示例：

```text
2 × arrow.straight
1 × arrow.fine
```

### 7. Chromium coverage

Playwright 现在验证：

- 选择器默认 `arrow.straight`；
- 选择 `arrow.fine`；
- 两点绘制细箭头；
- Store 中 `plotType = arrow.fine`；
- 控制点数量为 2；
- committed Source 中存在细箭头；
- `queryRenderedFeatures()` 返回实际 `arrow.fine` fill/line；
- 生产式南京示例包含两类符号；
- Worker entry 和 shared module 仍是正确 JavaScript；
- 直箭头、撤销重做、样式、删除和 PlotJSON 无回归。

### 8. Documentation and contract

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
- 参数、单位与约束；
- 几何构造；
- 与直箭头差异；
- 退化策略；
- 数值和浏览器测试；
- clean-room 来源；
- 后续演化。

开发契约新增：

- 新 MapLibre 符号不能只验证 Store 数量；
- 必须验证 committed Source 和实际 rendered feature；
- 每个符号必须同阶段加入 Playground 入口；
- 下一阶段只做 `arrow.fine.tailed`。

### 9. Clean-room provenance

使用通用公共领域数学：

- 二维向量归一化；
- 左法向量；
- 局部等距近似；
- 参数化箭身和头部比例；
- Polygon ring 闭合。

代码复用：

```text
none
```

没有复制或翻译 OpenLayers、Maptalks、Mars3D、Cesium、Mapbox、ol-plot、tactical-draw 或其他标绘库源码。

## Validation

### Run `30387914395`

- initial geometry/symbol/tests：success；
- Node 20.19：success；
- Node 22：success；
- 33 Node tests：success；
- Pages build：success；
- Chromium fine-arrow rendered feature：success。

### Run `30388427130`

- README/roadmap/Playground docs：success；
- selector CSS：success；
- Node 20.19：success；
- Node 22：success；
- Chromium：success。

### Run `30388669059`

- final handover contract：success；
- Node 20.19：success；
- Node 22：success；
- 33 Node tests：success；
- `/PlotLibre/` build：success；
- Worker module tests：success；
- fine-arrow browser test：success。

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

1. 将 PR #7 标记为 Ready；
2. 合并 PR #7 到 `main`；
3. 确认 Pages workflow 重新部署；
4. 从最新 `main` 创建 Milestone 005B 分支。

### Milestone 005B：`arrow.fine.tailed`

1. 抽取可复用的细箭身内部构造结果；
2. 不复制完整 `buildFineArrowRing()`；
3. 定义 `tailNotchRatio` 或等价燕尾深度参数；
4. 明确缺口点相对尾中心和方向向量的语义；
5. 实现 `buildTailedFineArrowRing()`；
6. 防止尾缺口越过颈部或形成自交；
7. 实现 `arrow.fine.tailed` PlotDefinition；
8. 复用 TwoPointDrawSession 和两个 handles；
9. 添加黄金、退化和参数测试；
10. 添加 PlotJSON round trip；
11. 加入 Playground selector 和示例；
12. 添加真实 Chromium rendered-feature 测试；
13. 编写 `docs/algorithms/arrow-fine-tailed.md`；
14. 更新不可变交接。

在完成 `arrow.fine.tailed` 前，不并行实现 `arrow.assault-direction`、`arrow.curved` 或攻击箭头。

## Risks and decisions

- 当前 `arrow.fine` 使用短程 local projection，不是完整椭球测地构造；
- 极高纬度应拒绝 local mode，未来需 geodesic generator；
- 当前为 ground-relative 尺寸，不包含 pixel/screen size mode；
- 参数控制柄尚未实现；
- 黄金测试是数值坐标，不是截图像素基线；
- 与直箭头共享 ring topology，但类型、参数、函数、测试和演化契约独立；
- tailed 版本必须抽取共享主体，不能复制完整函数；
- Playground selector 当前手写两个 option，符号增多后应数据驱动；
- 仓库仍为 `UNLICENSED`；
- 在线 raster 底图是可选外部服务，但标绘和 E2E 不依赖它。

## Continuation instructions

新的开发者或对话必须：

1. 阅读 `AGENTS.md`；
2. 阅读 `docs/ARCHITECTURE.md`；
3. 阅读 `docs/GEOMETRY_FOUNDATION.md`；
4. 阅读 `docs/algorithms/arrow-fine.md`；
5. 阅读 `docs/MAPLIBRE_WORKER_PACKAGING.md`；
6. 阅读本文件；
7. 确认 PR #7 已合并后从最新 `main` 分支开发；
8. 下一步只实现 `arrow.fine.tailed`；
9. 先抽取共享细箭身构造；
10. 不修改 `arrow.fine` 默认视觉契约而不提供迁移说明；
11. 浏览器测试继续验证实际 rendered feature；
12. 完成后更新 `LATEST.md` 并添加新的不可变交接文件。

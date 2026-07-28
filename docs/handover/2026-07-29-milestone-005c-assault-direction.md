# PlotLibre Development Handover — Milestone 005C Assault Direction

日期：2026-07-29  
仓库：`hujinghaoabcd/PlotLibre`  
目标分支：`main`  
开发分支：`agent/assault-direction-vertical-slice`  
PR：`#9 Add assault direction vertical slice`  
基线提交：`994033a5d131e1221fc47cb19f96824d856d3c15`

## Current state

Milestone 005A 和 005B 已合并，当前主线拥有：

```text
arrow.straight
arrow.fine
arrow.fine.tailed
```

Milestone 005C 完成第四个两点符号：

```text
arrow.assault-direction
```

当前 workspace：

```text
0.0.7
```

完整能力链：

```text
independent assault geometry
→ PlotDefinition
→ built-in registry
→ PlotJSON
→ TwoPointDrawSession
→ semantic handles
→ MapLibre committed Source/Layers
→ Playground selector/sample
→ Chromium rendered-feature test
```

首轮权威 CI：

```text
Run ID: 30391839421
validate (20.19): success
validate (22): success
browser: success
Node tests: 47 passed
```

当前状态：**功能、测试、README、路线图、Playground 文档和开发契约已完成；等待最终 handover 同步 CI 和 PR #9 合并。**

## Completed in this milestone

### 1. 真实符号差异设计

开始编码前新增：

```text
docs/algorithms/arrow-assault-direction.md
```

明确四种符号差异：

```text
arrow.straight
  通用两点直箭头

arrow.fine
  细长、渐缩、轻量方向提示

arrow.fine.tailed
  带中心燕尾缺口的细箭头

arrow.assault-direction
  宽体近恒宽箭身、明显肩部、角度定义头部
```

`arrow.assault-direction` 不是 `arrow.fine` 的默认参数别名。

### 2. 公开参考与 clean-room 决策

公开参考：

```text
ol-plot AssaultDirection
ol-plot FineArrow
Mars3D public API catalog
```

公开行为显示“突击方向”通常表达粗单直箭头，并与普通细箭头在宽度和头角上区分。

PlotLibre 独立采用：

```text
broad near-constant shaft
+ explicit neck inset
+ angle-defined triangular head
+ pronounced shoulders
```

代码复用：

```text
none
```

没有复制或翻译参考库的类、字段、默认值、工具函数或源码表达。

### 3. Geometry

新增：

```text
packages/geometry/src/assault-direction.ts
```

公开 API：

```ts
AssaultDirectionParameters
ResolvedAssaultDirectionParameters
DEFAULT_ASSAULT_DIRECTION_PARAMETERS
resolveAssaultDirectionParameters()
buildAssaultDirectionRing()
```

默认参数：

| 参数 | 默认值 | 约束 |
|---|---:|---|
| `bodyWidthRatio` | `0.18` | `[0.04, 0.4]` |
| `headLengthRatio` | `0.30` | `[0.12, 0.55]` |
| `headAngleDegrees` | `42` | `[18, 68]` |
| `neckWidthRatio` | `0.72` | `[0.35, 1]` |
| `minimumWidthMeters` | `2` | `> 0` |
| `maximumWidthMeters` | `100000` | `>= minimum` |

语义控制点：

```text
controlPoints[0] = assault origin / tail center
controlPoints[1] = objective / tip
```

### 4. 数学模型

设：

```text
T = tail center
P = tip
d = normalize(P - T)
n = leftNormal(d)
L = |P - T|
```

箭身宽度：

```text
bodyWidth = clamp(L × bodyWidthRatio, minimumWidthMeters, maximumWidthMeters)
bodyHalfWidth = bodyWidth / 2
```

头部：

```text
headLength = min(L × headLengthRatio, 0.7L)
shoulderCenter = P - d × headLength
headHalfWidth = headLength × tan(headAngleDegrees)
headHalfWidth <= 0.65L
```

颈部：

```text
neckHalfWidth = bodyHalfWidth × neckWidthRatio
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

总坐标数：

```text
8
```

### 5. 结构区别

FineArrow：

```text
narrow shaft
strong taper to neck
head width from tail-width multipliers
```

AssaultDirection：

```text
bodyWidthRatio = 0.18
near-constant broad shaft
explicit neck inset
head flare controlled by angle
pronounced shoulder
```

默认测试要求突击方向尾部半宽超过 FineArrow 三倍。

### 6. 安全和退化策略

- 重合控制点：`RangeError`；
- 非有限坐标：projection/vector 层拒绝；
- 参数越界：`RangeError`；
- 极点 local projection：明确拒绝；
- 箭翼宽度动态限制为 `0.65L`；
- ring 必须通过 `isSimpleRing()`；
- tip 直接恢复为原始第二控制点；
- 所有输出坐标必须有限。

### 7. Symbol definition

新增：

```text
packages/symbols/src/assault-direction.ts
```

公开：

```ts
ASSAULT_DIRECTION_TYPE = "arrow.assault-direction"
assaultDirectionDefinition
generateAssaultDirection()
```

Definition：

- `minPoints = 2`；
- `maxPoints = 2`；
- version `1.0.0`；
- 独立默认参数；
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

Built-ins：

```text
arrow.straight
arrow.fine
arrow.fine.tailed
arrow.assault-direction
```

### 8. Tests

新增：

```text
tests/fixtures/assault-direction.json
tests/assault-direction.test.mjs
```

黄金控制点：

```text
tail = [0, 0]
tip = [0.01, 0]
```

覆盖：

- 赤道向东确定性黄金坐标；
- 8 点闭合 ring；
- finite coordinates；
- exact tip；
- `isSimpleRing()`；
- 默认宽体显著宽于 FineArrow；
- 尾部半宽大于或等于颈部半宽；
- 改变 `headAngleDegrees` 只改变左右箭翼；
- body ratio、head angle 和 width 参数边界；
- coincident controls；
- Registry；
- fill/outline/hit-area；
- PlotJSON round trip。

Node 测试：

```text
39 → 47 passed
```

### 9. PlotJSON

保存：

```text
plotType = arrow.assault-direction
definitionVersion = 1.0.0
controlPoints
bodyWidthRatio
headLengthRatio
headAngleDegrees
neckWidthRatio
minimumWidthMeters
maximumWidthMeters
style
metadata
revision
```

测试确认完整序列化/解析往返。

### 10. Interaction reuse

未创建重复的两点交互。

复用：

- `TwoPointDrawSession`；
- pointer preview；
- click/Enter complete；
- Escape cancel；
- 两个语义 handles；
- transactional drag；
- undo/redo；
- style reload recovery。

### 11. Playground

更新：

```text
apps/playground/src/template.ts
apps/playground/src/playground-app.ts
apps/playground/e2e/playground.spec.ts
```

选择器第四项：

```text
突击方向 → arrow.assault-direction
```

Demo badge：

```text
v0.0.7 demo
```

南京示例：

```text
1 × arrow.straight
1 × arrow.fine
1 × arrow.fine.tailed
1 × arrow.assault-direction
```

### 12. Chromium

Playwright 验证：

- selector option 数量 4；
- 生产式示例数量 4；
- committed Source 含四种 `plotType`；
- 绘制突击方向；
- Store 中类型正确；
- 两个控制点；
- `bodyWidthRatio = 0.18`；
- `headAngleDegrees = 42`；
- 派生 ring 长度 8；
- `queryRenderedFeatures()` 返回实际突击方向；
- Worker entry/shared、其他三种箭头、undo/redo、style、delete 和 PlotJSON 无回归。

### 13. Documentation

新增：

```text
docs/algorithms/arrow-assault-direction.md
docs/handover/2026-07-29-milestone-005c-assault-direction.md
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

README 和 Playground 更新至 `0.0.7`。路线图下一阶段为第一个多点符号 `arrow.curved`。

## Validation

首轮完整 CI：

```text
Run ID: 30391839421
```

结果：

- Node 20.19：success；
- Node 22：success；
- TypeScript/build：success；
- 47 Node tests：success；
- Playground typecheck：success；
- `/PlotLibre/` build：success；
- handover contract：success；
- Chromium：success；
- actual assault rendered feature：success。

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
2. 将 PR #9 标记 Ready；
3. 合并 PR #9 到 `main`；
4. 检查 Pages 重新部署；
5. 从最新 `main` 创建 Milestone 005D 分支。

### Milestone 005D：`arrow.curved`

这是第一个多点符号，必须先完成通用交互基础。

#### A. `MultiPointDrawSession`

- minimum points；
- maximum points optional；
- click append；
- pointer preview；
- double-click complete；
- Enter complete；
- Backspace remove last；
- Escape cancel；
- engine-independent snapshots；
- unit tests。

#### B. curved-arrow geometry

建议语义：

```text
controlPoints[0] = tail center
controlPoints[1..n-2] = centerline controls
controlPoints[n-1] = tip
minimum points = 3
```

复用：

- `cleanPolyline()`；
- Catmull-Rom/Hermite；
- centerline sampling；
- variable-width offset；
- shared arrow head；
- ring winding；
- self-intersection validation；
- coordinate-mode analysis。

#### C. 完整纵向切片

- Definition；
- PlotJSON；
- golden/property tests；
- multi-point handles；
- Playground selector；
- Chromium actual rendered feature；
- algorithm doc；
- handover。

在 curved arrow 完成前，不并行实现 attack、double、route 或 corridor。

## Risks and decisions

- 当前为 short-range local projection，不是完整椭球测地构造；
- `headAngleDegrees` 的含义是箭翼相对反向轴线的张角；
- `0.65L` 箭翼动态上限是当前算法契约；
- 当前为 ground-relative 尺寸，无 pixel mode；
- parameter handles 尚未实现；
- 黄金测试是数值坐标，无截图基线；
- selector 仍为手写 option，进入多点符号阶段前后应评估数据驱动 catalog；
- 仓库仍为 `UNLICENSED`；
- 在线底图是可选外部服务，标绘与 E2E 不依赖其可用性。

## Continuation instructions

新的开发者或对话必须：

1. 阅读 `AGENTS.md`；
2. 阅读 `docs/ARCHITECTURE.md`；
3. 阅读 `docs/INTERACTION_MODEL.md`；
4. 阅读 `docs/GEOMETRY_FOUNDATION.md`；
5. 阅读 `docs/algorithms/arrow-assault-direction.md`；
6. 阅读 `docs/MAPLIBRE_WORKER_PACKAGING.md`；
7. 阅读本文件；
8. 确认 PR #9 合并后从最新 `main` 开发；
9. 先实现通用 `MultiPointDrawSession`，再实现 `arrow.curved`；
10. 不在 curved 完成前并行开发其他复杂箭头；
11. 保持 actual rendered-feature 浏览器验证；
12. 完成后更新 `LATEST.md` 和新的不可变交接文件。

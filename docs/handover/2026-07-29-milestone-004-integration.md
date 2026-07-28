# PlotLibre Development Handover — Milestone 004 Integration

日期：2026-07-29  
仓库：`hujinghaoabcd/PlotLibre`  
目标分支：`main`  
开发分支：`agent/milestone-004-integration`  
PR：`#6 Integrate shared arrow geometry foundation after Pages hotfixes`  
基线提交：`c00f589078c8ae5ac2d01bc02441619004a413a6`  
首个集成提交：`0f5f5d8f78e2136787f7db4b9cf90b86a151d384`

## Current state

Milestone 003、底图启动热修复和 MapLibre Worker 热修复已经进入 `main`。原 Milestone 004 PR #3 基于较早的 `main`，在两次紧急 Pages 修复后变为不可直接合并。

为避免丢失已经验证的 Worker/Pages 代码，也避免手工重写几何源码，本次建立 PR #6：

```text
latest main tree
+ exact verified Milestone 004 Git blobs
= integrated Milestone 004 branch
```

当前 workspace 版本为：

```text
0.0.4
```

PR #6 的权威 CI 运行：

```text
30386539579
```

结果：

```text
validate (20.19): success
validate (22): success
browser: success
27 Node tests: passed
Chromium E2E: passed
```

当前阶段状态：**Milestone 004 已在最新 Pages/Worker 主线上完成集成和验证，等待 PR #6 合并。**

## Completed in this milestone

### 1. 集成策略

PR #6 以最新 `main` 提交 `c00f589078c8ae5ac2d01bc02441619004a413a6` 为父提交。

保留最新主线中的：

- 本地 bootstrap MapLibre style；
- 可选 OpenStreetMap raster 底图；
- `?basemap=none` 离线模式；
- `setWorkerUrl()`；
- `maplibre-gl-worker.mjs` 构建复制；
- `maplibre-gl-shared.mjs` 构建复制；
- Worker MIME 与模块图测试；
- committed Source Feature 测试；
- 实际 fill/line rendered-feature 测试；
- Pages 与 Worker 热修复不可变交接文件。

从原 PR #3 精确引入 19 个 Git blob。没有重新输入、翻译或改写几何算法源码。

### 2. 项目与文档文件

```text
AGENTS.md
README.md
package.json
docs/ALGORITHM_POLICY.md
docs/DEVELOPMENT_PLAN.md
docs/GEOMETRY_FOUNDATION.md
docs/handover/2026-07-28-milestone-004.md
```

### 3. 几何源码

```text
packages/geometry/src/vector.ts
packages/geometry/src/polyline.ts
packages/geometry/src/curves.ts
packages/geometry/src/offset.ts
packages/geometry/src/ring.ts
packages/geometry/src/geodesic.ts
packages/geometry/src/local-projection.ts
packages/geometry/src/arrow-components.ts
packages/geometry/src/straight-arrow.ts
packages/geometry/src/index.ts
```

### 4. 测试与黄金样例

```text
tests/geometry-foundation.test.mjs
tests/fixtures/geometry-foundation.json
```

### 5. Vector primitives

已提供：

- finite-value validation；
- vector add、subtract、scale；
- dot 和 2D cross；
- magnitude、squared magnitude 和 distance；
- normalize 与 fallback normalize；
- left/right normal；
- linear interpolation；
- tolerance comparison；
- validated clamp。

零向量不能 normalize，非有限值明确抛出错误。

### 6. Polyline metrics and sampling

已提供：

```text
cleanPolyline
measurePolyline
sampleMeasuredPolyline
samplePolylineAtDistance
samplePolylineAtRatio
resamplePolylineByCount
```

`MeasuredPolyline` 保存点、每段长度、累计长度和总长度。沿线采样返回点、切向量、段索引、段内比例和实际距离。

### 7. Curves

已实现：

- cubic Bezier sampling；
- tension-controlled Catmull-Rom sampling；
- cubic Hermite 表达；
- 首尾控制点精确保留；
- 每段采样密度配置。

### 8. Variable-width offsets

已实现：

- constant half-width；
- per-vertex variable half-width；
- left/right boundary generation；
- adjacent-normal miter join；
- `miterLimit`；
- 宽度 profile 校验；
- 重复点拒绝。

偏移器只生成边界，不自动隐藏或修复自交。

### 9. Ring operations

已实现：

```text
closeRing
signedRingArea
ringWinding
ensureRingWinding
segmentsIntersect
findRingSelfIntersections
isSimpleRing
```

相邻边不会被误报为自交，非相邻交叉返回 segment index 对。

### 10. Geodesic and antimeridian

已实现：

```text
normalizeLongitude
shortestLongitudeDelta
crossesAntimeridian
unwrapLongitudes
haversineDistance
initialBearingDegrees
destinationPoint
geodesicPath
analyzeCoordinateMode
```

默认建议使用 geodesic 模式的条件：

- 跨越反经线；
- 最大绝对纬度超过 80°；
- 相对起点范围超过 250 km。

### 11. Local projection correction

局部投影现在：

- 使用最短经差；
- 反投影时归一化经度；
- 拒绝非有限输入；
- 在极点要求 geodesic mode。

因此 `[179.999, 0] -> [-179.999, 0]` 被处理为约 222.6 m，而不是接近地球周长。

### 12. Shared arrow components

新增 `buildArrowHead()`，以 tip、方向、头部长度、头部半宽和颈部半宽构造：

```text
neckCenter
neckLeft
headLeft
tip
headRight
neckRight
outline
```

`buildStraightArrowRing()` 已复用该组件。

### 13. Semantic endpoint preservation

箭尖经过局部投影往返时可能出现约 `1e-13` 度浮点误差。直箭头现在直接保留原始 `end` 语义控制点作为箭尖，不通过放宽测试容差掩盖误差。

### 14. Clean-room provenance

公共几何使用通用数学：

- 欧氏向量运算；
- 线性插值；
- Bernstein cubic Bezier；
- Catmull-Rom/Hermite；
- miter join；
- shoelace signed area；
- orientation 与 segment intersection；
- Haversine；
- spherical bearing 与 destination point；
- longitude modulo normalization；
- local equirectangular approximation。

代码复用记录：

```text
none
```

没有复制 Leaflet、OpenLayers、Maptalks、Cesium、Mapbox 或其他标绘插件源码。

## Validation

权威 CI：

```text
Run ID: 30386539579
```

通过项目：

- Node.js 20.19；
- Node.js 22；
- TypeScript packages；
- workspace build；
- 27 项 Node 测试；
- Playground typecheck；
- `/PlotLibre/` Vite build；
- handover contract；
- Chromium 安装；
- Worker entry JavaScript 测试；
- Worker shared module JavaScript 测试；
- committed Source Feature 测试；
- 实际 fill/line rendered-feature 测试；
- 绘制、撤销、重做、样式、删除和 PlotJSON 回归测试。

Milestone 004 原始 CI 和集成 CI 都通过，说明几何基础与最新 Pages/Worker 方案兼容。

## Next tasks

### 合并收尾

1. 将 PR #6 标记为 Ready；
2. 合并 PR #6 到 `main`；
3. 关闭被 PR #6 替代的 PR #3；
4. 确认 `main` 上的 Pages workflow 重新部署；
5. 从最新 `main` 创建 Milestone 005 分支。

### Milestone 005：`arrow.fine` 单符号纵向切片

1. 建立 `docs/algorithms/arrow-fine.md`；
2. 定义控制点语义：tail center 与 tip；
3. 定义参数和单位；
4. 在 geometry 中实现纯函数 `buildFineArrowRing()`；
5. 复用 `buildArrowHead()` 和 local projection；
6. 实现 `arrow.fine` PlotDefinition；
7. 加入 built-in symbol registry；
8. 添加参数校验和退化策略；
9. 添加数值测试；
10. 添加黄金 fixture；
11. 添加 PlotJSON round-trip；
12. 复用两点 DrawSession；
13. 复用两个语义控制点 handle；
14. Playground 增加符号选择器；
15. 浏览器测试绘制 fine arrow；
16. 验证 Worker/Pages 不回归；
17. 更新交接文件。

`arrow.fine` 完成前，不同时实现 `arrow.attack`、`arrow.double` 或其他复杂箭头。

## Risks and decisions

- 原 PR #3 不应再直接合并，因为它缺少后续 Worker/Pages 热修复；
- PR #6 使用精确 Git blob，确保集成源码与原已验证 Milestone 004 一致；
- `LATEST.md` 在本次集成前保留 Worker 热修复内容，防止未验证代码覆盖当前故障交接；
- 集成 CI 通过后才把 `LATEST.md` 切换到 Milestone 004；
- 几何基础仍是低层纯函数，不依赖 MapLibre、DOM、Store 或 UI；
- 当前球面算法使用半径 6378137 m，不是完整椭球测地解；
- Catmull-Rom 当前为统一参数化基础版本；
- offset 可能自交，调用者必须通过 ring 工具验证；
- 仓库仍为 `UNLICENSED`，后续发布前必须决定许可证；
- Pages 仍依赖可选在线 raster 服务，但标绘不依赖底图可用性。

## Continuation instructions

新的开发者或对话必须：

1. 阅读 `AGENTS.md`；
2. 阅读 `docs/ARCHITECTURE.md`；
3. 阅读 `docs/GEOMETRY_FOUNDATION.md`；
4. 阅读 `docs/MAPLIBRE_WORKER_PACKAGING.md`；
5. 阅读本文件；
6. 确认 PR #6 是否已合并；
7. 不再使用 PR #3 作为开发基础；
8. 从最新 `main` 创建 Milestone 005 分支；
9. 首先只完成 `arrow.fine`；
10. 每次完成任务更新 `LATEST.md` 并增加不可变交接文件。

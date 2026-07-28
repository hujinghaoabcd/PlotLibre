# PlotLibre Development Handover — Milestone 004

日期：2026-07-28  
仓库：`hujinghaoabcd/PlotLibre`  
目标分支：`main`  
开发分支：`agent/arrow-geometry-foundation`  
PR：`#3 Add shared arrow geometry foundation`  
基线提交：`a68cdd659861c6ee3d5523baca637958e8730def`

## Current state

PR #2 已合并到 `main`，合并提交：

```text
a68cdd659861c6ee3d5523baca637958e8730def
```

Milestone 004 已完成共享 Arrow 几何基础，workspace 开发基线提升为 `0.0.4`。当前代码位于 PR #3，等待最终 CI 和合并。

代码验证运行：

```text
GitHub Actions run: 30378763887
validate (20.19): success
validate (22): success
browser: success
27 Node tests: passed
4 Playwright tests: passed
```

GitHub Pages 预期地址：

```text
https://hujinghaoabcd.github.io/PlotLibre/
```

Pages workflow 已进入 `main`，但当前执行环境无法解析外部域名，尚未完成公开 URL 实际访问验证。验证前不能宣称站点已上线。

## Completed in this milestone

### Source files

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

### Tests and fixtures

```text
tests/geometry-foundation.test.mjs
tests/fixtures/geometry-foundation.json
tests/geometry.test.mjs
```

### Documentation and project state

```text
docs/GEOMETRY_FOUNDATION.md
docs/ALGORITHM_POLICY.md
docs/DEVELOPMENT_PLAN.md
docs/handover/2026-07-28-milestone-004.md
docs/handover/LATEST.md
README.md
AGENTS.md
package.json
```

### Vector primitives

`vector.ts` 现在提供：

- finite-value validation；
- add、subtract、scale；
- dot product 和 2D cross product；
- magnitude、squared magnitude 和 distance；
- normalize 和 fallback normalize；
- left/right normal；
- linear interpolation；
- tolerance comparison；
- validated clamp。

零向量不能 normalize，非有限输入会抛出 `RangeError`。

### Polyline metrics and sampling

`polyline.ts` 新增：

```text
cleanPolyline
measurePolyline
sampleMeasuredPolyline
samplePolylineAtDistance
samplePolylineAtRatio
resamplePolylineByCount
```

`MeasuredPolyline` 包含：

```text
points
segmentLengths
cumulativeLengths
totalLength
```

沿线采样返回：

```text
point
tangent
segmentIndex
segmentRatio
distance
```

连续重复或近重复点可清洗；不足两个不同点时抛出错误；路径外距离夹紧到首尾点。

### Curves

`curves.ts` 新增：

- standard cubic Bezier sampling；
- tension-controlled Catmull-Rom sampling；
- cubic Hermite expression；
- exact endpoint preservation；
- configurable segments per span。

当前 Catmull-Rom 为统一参数化基础版本。后续增加 centripetal 参数化时必须保持兼容或提供迁移说明。

### Variable-width offsets

`offset.ts` 新增：

- constant half-width profile；
- per-vertex half-width profile；
- left/right boundary generation；
- adjacent-normal miter join；
- configurable `miterLimit`；
- width-profile validation；
- duplicate-point rejection。

180°回折使用下一段法向量作为明确退化策略。偏移器只生成边界，不自动掩盖或修复自交。

### Ring operations

`ring.ts` 新增：

```text
closeRing
signedRingArea
ringWinding
ensureRingWinding
segmentsIntersect
findRingSelfIntersections
isSimpleRing
```

零面积 ring 不能强制调整方向。相邻边不报告为自交，非相邻交叉返回 segment index 对。

### Geodesic and antimeridian utilities

`geodesic.ts` 新增：

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

当前球形地球半径：

```text
6378137 m
```

默认建议切换到 `geodesic` 的条件：

- 路径跨越反经线；
- 最大绝对纬度超过 80°；
- 相对起点范围超过 250 km。

阈值可显式配置。

### Local projection corrections

`local-projection.ts` 已改为：

- 使用最短经差；
- unproject 时归一化经度；
- 拒绝非有限输入；
- 在极点明确要求 geodesic mode。

因此：

```text
[179.999, 0] -> [-179.999, 0]
```

被解释为约 222.6 m，而不是接近地球周长。

### Shared arrow components

`arrow-components.ts` 新增 `buildArrowHead()`，输入：

```text
tip
direction
head length
head half-width
neck half-width
```

输出：

```text
neckCenter
neckLeft
headLeft
tip
headRight
neckRight
outline
```

`buildStraightArrowRing()` 已重构为使用该组件。

### Semantic endpoint preservation

首轮 CI 唯一失败为：

```text
expected: 118.84
actual:   118.83999999999992
```

原因是箭尖经过投影和反投影产生极小浮点误差。修复后，输出 ring 的箭尖直接保留原始 `end` 语义控制点，而不是放宽测试容差。

### Provenance

`docs/ALGORITHM_POLICY.md` 已记录 Milestone 004 来源。

使用公共领域基础数学：

- Euclidean vector operations；
- linear interpolation；
- Bernstein cubic Bezier；
- Catmull-Rom/Hermite；
- adjacent-normal miter；
- shoelace signed area；
- orientation and segment intersection；
- Haversine；
- spherical bearing and destination point；
- longitude modulo normalization；
- local equirectangular approximation。

代码复用：

```text
none
```

没有翻译或复制 Leaflet、OpenLayers、Maptalks、Cesium、Mapbox 或其他战术标绘插件源代码。

## Validation

执行命令：

```bash
npm install
npm run typecheck
npm test
npm run playground:typecheck
npm run playground:build
npm run handover:check
npx playwright install --with-deps chromium
npm run playground:e2e
```

权威代码 CI：

```text
Run ID: 30378763887
Node 20.19: success
Node 22: success
TypeScript: success
Workspace build: success
Playground typecheck: success
Vite /PlotLibre/ build: success
Chromium: success
```

测试总数：

```text
27 Node tests
27 passed
0 failed

4 Playwright tests
4 passed
0 failed
```

原有 15 项测试继续通过；Milestone 004 新增 12 项几何基础测试。

黄金样例：

```text
tests/fixtures/geometry-foundation.json
```

固定验证：

- `[0,0] -> [3,0] -> [3,4]` 路径；
- cumulative lengths `[0,3,7]`；
- distance 5 sample `[3,2]`；
- tangent `[0,1]`；
- half-width 1 的 90° miter offset。

性质测试使用固定种子生成 100 组随机折线，验证：

- total length 为正；
- cumulative lengths 严格递增；
- sample point 全部有限；
- tangent 长度约为 1；
- variable-width offset 全部有限；
- CI 结果可复现。

Chromium 回归确认几何重构没有破坏现有直箭头绘制、编辑、撤销、样式和 PlotJSON 行为。

## Next tasks

Milestone 005：第一组传统箭头。

必须继续采用纵向切片，第一目标只实现：

```text
arrow.fine
```

推荐顺序：

1. 创建 `docs/algorithms/arrow-fine.md` provenance；
2. 明确控制点语义以及与 `arrow.straight` 的差异；
3. 定义参数、单位和默认值；
4. 使用 `measurePolyline()`；
5. 使用 shared curve primitives；
6. 使用 `offsetPolyline()`；
7. 使用 `buildArrowHead()`；
8. 统一 ring winding；
9. 检查 self-intersection；
10. 新建 `PlotDefinition`；
11. 新建支持所需点数的 DrawSession；
12. 定义控制点插入、删除和编辑策略；
13. PlotJSON round trip；
14. geometry golden fixture；
15. numerical and degenerate tests；
16. Playground symbol selector；
17. Chromium E2E；
18. 更新交接文件。

完成 `arrow.fine` 全链路后，再按顺序评估：

```text
arrow.fine.tailed
arrow.assault-direction
arrow.curved
arrow.attack
arrow.attack.tailed
```

## Risks and decisions

### Architectural decisions

1. 平面算法只接受 `Vec2`，不能直接把经纬度当 x/y。
2. 地理算法接受 WGS84 `Position`。
3. local/geodesic 决策必须显式，不能藏在符号算法内部。
4. 新箭头必须先复用共享 polyline、curve、offset、ring、geodesic 和 head API。
5. 偏移器只负责边界，最终自交由独立检查阶段处理。
6. 关键语义控制点在输出中应精确保留。
7. property-style tests 使用固定种子保证可复现。
8. 当前不增加第三方运行时几何依赖。
9. 复杂符号必须继续建立独立 provenance 记录。
10. Milestone 005 不并行实现六种符号，先完成一个完整纵向切片。

### Known limitations

- Catmull-Rom 当前是统一参数化，不是 centripetal；
- spherical geodesic 不是椭球 GeographicLib 精度；
- `geodesicPath()` 适合当前中短距离路径；
- offset 只有 miter join，尚无 bevel/round join；
- 偏移后自交只检测，不自动修复；
- 180°回折策略不保证符合所有军事制图规范；
- intersection 使用普通双精度 orientation，不是 adaptive robust predicates；
- 尚无 geometry benchmark；
- 尚无 geometry debug Playground 页面；
- 尚无 PNG/SVG 视觉 golden image；
- 目前只有 `arrow.straight` 使用共享 head component；
- Pages 公开 URL 尚未人工访问确认；
- 仓库仍未选择开源许可证；
- 尚未提交 lockfile。

### Continuation instructions

新的开发者或对话必须：

1. 阅读 `AGENTS.md`；
2. 阅读 `docs/handover/LATEST.md`；
3. 阅读 `docs/GEOMETRY_FOUNDATION.md`；
4. 阅读 `docs/ALGORITHM_POLICY.md`；
5. 查看 PR #3 和最新 CI；
6. CI 通过后将 PR #3 标记为 Ready；
7. 合并后从最新 `main` 创建 Milestone 005 分支；
8. 先写 `arrow.fine` 算法记录，再写实现；
9. 不批量复制传统标绘插件的 Arrow 代码；
10. 保持控制点和参数为语义源数据；
11. 每个完成任务更新 `LATEST.md` 并添加不可变交接文件。

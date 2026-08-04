# PlotLibre Playground 与 GitHub Pages

## 1. 入口与职责

```text
https://hujinghaoabcd.github.io/PlotLibre/
```

`apps/playground` 同时承担真实 MapLibre 浏览器应用、人工验收入口、Playwright 测试目标、GitHub Pages 站点和公共 API 使用示例。

Playground 只能通过公开 PlotLibre packages 工作，不得直接调用内部 geometry 或修改 MapLibre Source 绕过 Store、Registry 和 CommandHistory。

## 2. 当前技术基线

```text
PlotLibre workspace:  0.0.19
MapLibre GL JS:       6.0.0
Vite:                 8.1.5
Playwright:           1.61.1
Node.js:              20.19+
Pages base:           /PlotLibre/
Node tests:           163
Chromium tests:       23
public symbols:       16 (14 Arrow + 2 Area)
```

公共 packages 仍为开发期独立版本，Playground package 仍为 `0.0.3`。根 workspace `0.0.19` 是里程碑基线，不代表统一 npm release。

## 3. 当前公共符号

```text
arrow.straight              直箭头
arrow.fine                  细箭头
arrow.fine.tailed           燕尾细箭头
arrow.assault-direction     突击方向
arrow.curved                曲线箭头
arrow.attack                攻击箭头
arrow.attack.tailed         燕尾攻击箭头
arrow.double                双箭头
arrow.pincer                钳形箭头
arrow.squad-combat          分队战斗箭头
arrow.route                 路线箭头
arrow.corridor              走廊
arrow.route.bidirectional   双向路线箭头
arrow.route.double-head     双头路线箭头
area.closed-curve           闭合曲线区域
area.gathering-place        集结地
```

## 4. 绘制模式

### 4.1 精确两点符号

```text
arrow.straight
arrow.fine
arrow.fine.tailed
arrow.assault-direction
```

第二次点击自动完成。两个 authored controls 分别是 tail/origin 和 exact tip/objective。

### 4.2 可变路径箭头

```text
arrow.curved
arrow.attack
arrow.attack.tailed
arrow.squad-combat
arrow.route
arrow.corridor
arrow.route.bidirectional
arrow.route.double-head
```

双击末点或按 Enter 完成。Backspace/Delete 逐点回退，Escape 取消。Definition 决定控制点角色、两点最小形态、exact tip、tail edge 或 centre path 语义。

### 4.3 固定复合箭头

```text
arrow.double  4 controls
arrow.pincer  5 controls
```

达到最大 authored control 数量后自动尝试完成。无效候选保留 active session，并通过 `drawRejection` 暴露稳定 issue codes。派生的镜像目标、branch、bridge 或 curve samples 不持久化。

### 4.4 闭合曲线区域

`area.closed-curve@1.0.0` 使用 3–64 个有序边界途经点：

```text
0..n-1 authored boundary waypoints
```

操作：

1. 点击至少三个边界控制点；
2. 从第三个完整 candidate 开始显示 derived closed Polygon draft；
3. 双击末点或按 Enter 完成；
4. 自动闭合不增加 authored control；
5. Backspace/Delete 逐点撤销；
6. 完成后每个 authored waypoint 显示 semantic handle。

周期曲线、重复首点、winding normalization 和 final Polygon coordinates 均为派生数据。

### 4.5 集结地

`area.gathering-place@1.0.0` 固定三个 controls：

```text
0 flank A
1 front crown
2 flank B
```

操作：

1. 点击一侧翼点；
2. 点击前向冠点；
3. 移动指针时第三个 candidate 形成完整 draft；
4. 点击另一侧翼点后自动完成。

后部闭合锚点由两翼中点和 crown direction 派生，不能成为 handle 或 PlotJSON control。两个 flank 可以 canonical permutation，crown 必须保持 exact index 1。

## 5. Completion 与地图生命周期

固定最大点数：

```text
maximum-point candidate
→ Registry validation
→ full generation preflight
→ valid: auto-complete
→ invalid: active session + visible rejection
```

可变多点：

```text
double-click / Enter
→ authored candidate
→ Registry validation
→ full generation preflight
→ Command
→ Store
```

绘制多点符号期间临时关闭 MapLibre double-click zoom。恢复必须发生在当前原生 `dblclick` 调用栈结束后，避免完成时额外缩放。Cancel 与 destroy 可立即恢复。

## 6. Draft、Guide 与 Rejection

PlotLibre 区分：

- **完整合法 draft**：Definition 已生成 RenderBundle，但尚未进入 Store；
- **last-valid draft**：当前 pointer candidate 无效时保留最近合法图形；
- **semantic guide**：尚不能生成 Polygon 时显示 authored path/control guide；
- **completion rejection**：明确完成尝试失败后的结构化问题。

所有临时状态均不得进入 Store、History、handles 或 PlotJSON。

Playground 的通用事件监听器必须先注册，symbol-specific 监听器后注册。这样钳形等复杂符号的 actionable rejection guidance 不会被通用“继续点击”文案覆盖。

## 7. 示例数据

生产模式和 `?basemap=none` 模式加载 16 类南京示例：

```text
14 × Arrow Definitions
2 × Area Definitions
```

示例只通过公开 `create()` 和 Registry preflight 进入 Store。首次启动流程为：

```text
PlaygroundApp.start()
→ register generic listeners and base sample
→ install symbol-group wrappers/listeners
→ reload complete wrapped sample catalog
→ 16 semantic features
```

基础兼容 E2E `?e2e=1` 保持空 Store 和原九类 selector，以验证早期公共交互表面没有意外破坏。完整目录 E2E 使用显式 feature flags。

## 8. 启动、底图与 E2E 模式

在线资源不能阻塞标绘：

```text
local background style
→ MapLibre load
→ optional raster basemap
→ PlotLibre renderer
→ PlaygroundApp
```

禁用在线底图：

```text
?basemap=none
```

基础兼容 E2E：

```text
?e2e=1
```

完整 16 类功能 E2E：

```text
?e2e=1&squad=1&paths=1&areas=1
```

`basemap=none` 只能改变底图，不得改变符号目录、示例或 semantic behavior。

## 9. MapLibre 6 Worker

构建时从安装的 `maplibre-gl` 复制：

```text
maplibre-gl-worker.mjs
maplibre-gl-shared.mjs
```

创建地图前设置：

```ts
setWorkerUrl(`${import.meta.env.BASE_URL}assets/maplibre-gl-worker.mjs`);
```

Worker entry 和 shared module 必须来自同一 MapLibre 版本。详见 `MAPLIBRE_WORKER_PACKAGING.md`。

## 10. 本地运行与验证

```bash
npm install
npm run playground:dev
```

默认开发地址：

```text
http://127.0.0.1:5173/PlotLibre/
```

完整验证：

```bash
npm run typecheck
npm test
npm run playground:typecheck
npm run playground:build
npm run handover:check
npx playwright install --with-deps chromium
npm run playground:e2e
```

## 11. 当前 Chromium 覆盖

23 个 Chromium tests 覆盖：

- `/PlotLibre/` base path；
- Worker entry/shared module；
- 无远程底图启动；
- 基础 9-selector compatibility surface；
- 生产 16-sample catalog；
- committed/draft/handles Sources；
- fill/line/handle Layers；
- actual `queryRenderedFeatures()`；
- 两点符号绘制；
- curved/attack/squad/path multi-point 绘制；
- double-arrow transient preview 与 fixed-four completion；
- pincer natural order、actionable rejection 与恢复；
- route/corridor/multi-head route；
- closed-curve draft、double-click completion 和 rendered Polygon；
- gathering-place third-pointer draft、fixed-three completion 和 rendered Polygon；
- 14 Arrow visibility matrix；
- 16 类 sample committed layer presence；
- handle edit、revision、history 和 undo；
- style reload、delete、PlotJSON；
- camera stability 和 zoom restoration。

当前目标权威基线：

```text
Node tests:      163 passed
Chromium tests:  23 passed
public symbols:  16
```

## 12. `querySourceFeatures()` 注意事项

MapLibre 可以按瓦片返回同一 GeoJSON Feature 的多个副本。语义 handle 数量必须按：

```text
plotId + handleIndex
```

去重。Store 中 `controlPoints.length` 才是 authored semantic control 数量的权威值。

## 13. Geometry validation policy

所有 topology-sensitive Definitions 在 Store mutation 前完成 full generation preflight：

- controls 满足 Definition 数量和角色；
- 参数有限且处于范围；
- 输出 geometry 有限；
- Polygon ring 闭合并规范化方向；
- simple-ring validation；
- exact authored controls 按 Definition contract 保留；
- invalid handle preview 不进入 Store/History；
- derived samples、heads、notches、bridges、offsets、closure anchors 和 final vertices 不作为 handles。

## 14. Pages 部署

`.github/workflows/pages.yml` 仅从 `main` 部署，监听：

```text
apps/playground/**
packages/**
package.json
tsconfig*.json
.github/workflows/pages.yml
```

构建命令：

```bash
npm run playground:build
```

部署目录：

```text
apps/playground/dist
```

必须区分：

```text
source/build ready
workflow deployed
live page manually verified
```

不能仅根据源码或 workflow 配置宣称线上缓存已人工核验。

## 15. 强制约束

- Playground 不直接编辑 MapLibre Source；
- Polygon 不是原始数据；
- 应用层不复制 geometry；
- 底图失败不能阻塞 PlotLibre；
- dev、preview、E2E 和 Pages 统一 `/PlotLibre/`；
- 每个新公共符号同阶段加入 selector、样例和 browser coverage；
- browser tests 必须验证 actual rendered feature；
- completion instructions 与 Definition schema 一致；
- topology-sensitive symbols 验证 invalid preview 不进入 Store/History；
- derived controls 与 generated vertices 不暴露为 canonical handles；
- Playground 错误提示使用 Registry issue codes，不复制 geometry validation；
- Area family 使用独立命名、样式与说明；
- generic/specialized listener ordering 必须有回归测试保护。

## 16. 下一步

006I 在 PR #31 完成最终 CI、交接与 squash merge 后，进入 006J：

1. 研究 arc/sector/lune 的公共行为和许可证；
2. 冻结 center、radius、bearings 和 arc direction roles；
3. 明确 Polygon/LineString/compound output；
4. 决定 local-metre 与 geodesic 策略；
5. 建立共享 circular-arc frame；
6. 同阶段完成 Definition、Registry、PlotJSON、Playground 和浏览器纵向切片。

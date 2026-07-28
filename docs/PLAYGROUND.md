# PlotLibre Playground 与 GitHub Pages

## 1. 入口

```text
https://hujinghaoabcd.github.io/PlotLibre/
```

`apps/playground` 是真实 MapLibre 应用、人工验收入口、Playwright 测试目标和 GitHub Pages 站点。它只能使用公开 PlotLibre API。

## 2. 技术基线

```text
PlotLibre demo:       0.0.7
MapLibre GL JS:       6.0.0
Vite:                 8.1.5
Playwright:           1.61.1
Node.js:              20.19+
Pages base:           /PlotLibre/
```

## 3. 当前符号

选择器包含：

```text
arrow.straight           直箭头
arrow.fine               细箭头
arrow.fine.tailed        燕尾细箭头
arrow.assault-direction  突击方向
```

四种类型当前都使用两点语义：

```text
第一次点击 = tail center / origin
第二次点击 = tip / objective
```

交互：

- pointer move 动态预览；
- 第二次点击或 Enter 完成；
- Escape 取消；
- Backspace/Delete 重置已收集起点；
- 点击选择；
- 拖动两个语义 handles；
- undo/redo；
- 样式编辑；
- PlotJSON 导入导出。

## 4. 南京示例

生产页面自动加载：

```text
1 × arrow.straight
1 × arrow.fine
1 × arrow.fine.tailed
1 × arrow.assault-direction
```

突击方向使用独立紫色样式，便于与细箭头系列比较宽体箭身、肩部和角度定义箭头。

## 5. 底图与启动

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

E2E 模式：

```text
?e2e=1
```

两种模式都运行真实 PlotLibre 和 MapLibre Worker，只是不依赖远程瓦片。

## 6. MapLibre 6 Worker

构建时从已安装的 `maplibre-gl` 复制：

```text
maplibre-gl-worker.mjs
maplibre-gl-shared.mjs
```

创建地图前设置：

```ts
setWorkerUrl(`${import.meta.env.BASE_URL}assets/maplibre-gl-worker.mjs`);
```

详见 [`MAPLIBRE_WORKER_PACKAGING.md`](MAPLIBRE_WORKER_PACKAGING.md)。

## 7. 本地运行

```bash
npm install
npm run playground:dev
```

地址：

```text
http://127.0.0.1:5173/PlotLibre/
```

构建和测试：

```bash
npm run playground:typecheck
npm run playground:build
npx playwright install --with-deps chromium
npm run playground:e2e
```

## 8. Chromium 覆盖

Playwright 验证：

- `/PlotLibre/` project path；
- Worker entry/shared 为 JavaScript；
- 无在线底图时立即启动；
- selector 有四个 option；
- 四类南京示例；
- committed Source 包含四种 `plotType`；
- fill/line Layers 可见；
- `queryRenderedFeatures()` 返回真实图形；
- 绘制四种两点箭头；
- 突击方向默认 `bodyWidthRatio = 0.18`；
- 突击方向默认 `headAngleDegrees = 42`；
- undo/redo、style、delete 和 PlotJSON 无回归。

Milestone 005C 首轮：

```text
Run ID: 30391839421
Node tests: 47 passed
validate 20.19: success
validate 22: success
browser: success
```

## 9. Pages 部署

`.github/workflows/pages.yml` 仅从 `main` 部署。

仓库设置：

```text
Settings → Pages → Build and deployment → GitHub Actions
```

## 10. 强制约束

- Playground 不直接编辑 MapLibre Source；
- Polygon 不是原始数据；
- 应用层不复制几何算法；
- 底图不能阻塞 PlotLibre；
- dev、preview、E2E、Pages 统一 `/PlotLibre/`；
- 每个新符号同阶段加入 selector、示例和浏览器测试；
- 浏览器测试必须验证 actual rendered feature，而不是只检查 Store 数量。

## 11. 下一步

`arrow.curved` 将是第一个多点符号，需要先增加通用 `MultiPointDrawSession`，再接入曲线中心线、variable-width offset、控制点编辑和实际 Chromium 渲染测试。

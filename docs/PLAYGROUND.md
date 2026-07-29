# PlotLibre Playground 与 GitHub Pages

## 1. 入口

```text
https://hujinghaoabcd.github.io/PlotLibre/
```

`apps/playground` 是真实 MapLibre 应用、人工验收入口、Playwright 测试目标和 GitHub Pages 站点。它只能使用公开 PlotLibre API。

## 2. 技术基线

```text
PlotLibre demo:       0.0.11
MapLibre GL JS:       6.0.0
Vite:                 8.1.5
Playwright:           1.61.1
Node.js:              20.19+
Pages base:           /PlotLibre/
```

## 3. 当前符号

```text
arrow.straight           直箭头
arrow.fine               细箭头
arrow.fine.tailed        燕尾细箭头
arrow.assault-direction  突击方向
arrow.curved             曲线箭头
arrow.attack             攻击箭头
arrow.attack.tailed      燕尾攻击箭头
```

### 3.1 两点符号

前四种类型使用 tail/origin 与 tip/objective 两个语义控制点，支持 preview、点击/Enter 完成、Escape、Backspace/Delete、handles、drag 和 undo/redo。

### 3.2 曲线箭头

`arrow.curved` 使用三至 64 个语义控制点：tail center、path controls 和 exact tip。第三个候选点开始显示合法 draft，双击或 Enter 完成。

### 3.3 攻击箭头家族

`arrow.attack` 与 `arrow.attack.tailed` 使用相同控制点：

```text
第一个点   = exact tail edge A
第二个点   = exact tail edge B
中间点     = attack-spine controls
最后一个点 = exact objective/tip
```

操作：

1. 点击尾缘 A；
2. 在初始进攻方向另一侧点击尾缘 B；
3. 移动到第一个 spine candidate，产生合法 draft；
4. 点击一个或多个 spine controls；
5. 双击 objective 或按 Enter 完成；
6. Backspace/Delete 逐点回退；
7. Escape 取消；
8. 完成后拖动任一 tail/spine handle；
9. 无效 preview 保留最后一个合法状态，不进入 Store；
10. 一次合法拖动只生成一个可撤销命令。

燕尾攻击箭头只改变派生尾部闭合策略：

```text
right tail edge
→ right notch root
→ inward notch tip
→ left notch root
→ left tail edge
```

notch roots/tip 不是语义 handles，也不进入 PlotJSON。

## 4. Double-click zoom 生命周期

多点绘制期间 MapLibre double-click zoom 暂时关闭。

```text
dblclick completion
→ preventDefault + stopPropagation
→ create/select semantic feature
→ current browser event ends
→ restore previous double-click zoom state
```

恢复不能发生在同一个原生 `dblclick` 事件栈内，否则 MapLibre 默认处理器可能执行一次 2× 缩放。Cancel 和 destroy 仍立即恢复原状态。

## 5. 南京示例

生产页面自动加载七个示例：

```text
1 × arrow.straight
1 × arrow.fine
1 × arrow.fine.tailed
1 × arrow.assault-direction
1 × arrow.curved
1 × arrow.attack
1 × arrow.attack.tailed
```

平尾和燕尾攻击箭头使用相同的“两个精确尾缘 + spine + objective”语义，但使用不同配色和尾部派生几何。

## 6. 底图与启动

在线资源不能阻塞标绘：

```text
local background style
→ MapLibre load
→ PlotLibre renderer
→ PlaygroundApp
→ optional raster basemap
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

## 7. MapLibre 6 Worker

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

## 8. 本地运行

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

## 9. Chromium 覆盖

Playwright 验证：

- `/PlotLibre/` project path；
- Worker entry/shared 为 JavaScript；
- 无在线底图时立即启动；
- selector 有七个 option；
- 七类南京示例；
- committed Source 包含七种 `plotType`；
- fill/line Layers 可见；
- `queryRenderedFeatures()` 返回真实图形；
- 四种两点箭头绘制；
- 曲线箭头 draft/double-click/handle edit；
- 平尾与燕尾攻击箭头 tail-edge draft、spine 和 completion；
- double-click completion 后相机稳定且 zoom 恢复；
- notch defaults、body parameters 和 simple derived ring；
- handles 按语义 `handleIndex` 去重验证；
- 燕尾攻击箭头 tail handle drag；
- revision、History、one ReplacePlotCommand 和 undo；
- style、delete、PlotJSON 和 Worker 无回归。

当前第一轮权威测试：

```text
Node tests: 90 passed
Chromium: 12 passed
Run ID: 30419114264
```

## 10. `querySourceFeatures()` 注意事项

MapLibre 可以按瓦片返回同一 GeoJSON Feature 的多个副本。语义 handle 数量必须按 `plotId + handleIndex` 去重，而不是使用原始 Feature 数量。

Store 中的 `controlPoints.length` 仍是语义控制点数量的权威值。

## 11. Geometry validation policy

曲线箭头和攻击箭头不会静默输出自交 Polygon。

攻击箭头家族要求：

- 两个尾缘具有有效距离；
- 尾缘横跨初始 spine direction；
- 参数产生有限、闭合、逆时针、简单 ring；
- Definition validation 在 Store mutation 前完成完整可生成性检查；
- 燕尾深度不能侵入 neck；
- 燕尾开口宽度必须留在两个语义尾缘之间。

Playground 当前：

- 不提交无效 draft；
- 无效 handle preview 不进入 Store 或 History；
- 保留最后一个合法 preview；
- 用户可调整尾缘、减少弯曲、简化控制点或减小 notch depth；
- 后续 UI 将增加可见 validation feedback。

## 12. Pages 部署

`.github/workflows/pages.yml` 仅从 `main` 部署。

```text
Settings → Pages → Build and deployment → GitHub Actions
```

PR #13 合并后必须验证在线页面已包含七种符号，再宣布 0.0.11 Playground 发布完成。

## 13. 强制约束

- Playground 不直接编辑 MapLibre Source；
- Polygon 不是原始数据；
- 应用层不复制几何算法；
- 底图不能阻塞 PlotLibre；
- dev、preview、E2E、Pages 统一 `/PlotLibre/`；
- 每个新符号同阶段加入 selector、示例和浏览器测试；
- 浏览器测试必须验证 actual rendered feature；
- 多点测试必须覆盖 double-click、相机稳定、缩放恢复和语义 handle；
- topology-sensitive symbol 必须验证 invalid preview 不进入 Store/History；
- derived notch vertices 不得暴露为 semantic handles。

## 14. 下一步

下一单一纵向切片是 `arrow.double`。开始编码前必须先确定双头、共享分叉 body、左右 handedness、最小控制点和 topology policy；不得把它实现为两个普通箭头组成的集合。

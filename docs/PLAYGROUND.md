# PlotLibre Playground 与 GitHub Pages

## 1. 入口

```text
https://hujinghaoabcd.github.io/PlotLibre/
```

`apps/playground` 是真实 MapLibre 应用、人工验收入口、Playwright 测试目标和 GitHub Pages 站点。它只能使用公开 PlotLibre API。

## 2. 技术基线

```text
PlotLibre demo:       0.0.12
MapLibre GL JS:       6.0.0
Vite:                 8.1.5
Playwright:           1.61.1
Node.js:              20.19+
Pages base:           /PlotLibre/
Node tests:           101
Chromium tests:       13
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
arrow.double             双箭头
```

### 3.1 两点符号

前四种类型使用 tail/origin 与 tip/objective 两个语义控制点，支持 preview、第二次点击完成、Escape、handles、drag 和 undo/redo。

### 3.2 曲线箭头

`arrow.curved` 使用三至 64 个语义控制点：tail center、path controls 和 exact tip。第三个候选点开始显示合法 draft，双击或 Enter 完成。

### 3.3 攻击箭头家族

`arrow.attack` 与 `arrow.attack.tailed` 使用：

```text
第一个点   = exact tail edge A
第二个点   = exact tail edge B
中间点     = attack-spine controls
最后一个点 = exact objective/tip
```

操作：

1. 点击尾缘 A；
2. 在初始进攻方向另一侧点击尾缘 B；
3. 移动到第一个 spine candidate 产生 draft；
4. 点击一个或多个 spine controls；
5. 双击 objective 或按 Enter 完成；
6. Backspace/Delete 逐点回退；
7. Escape 取消；
8. 完成后拖动任一 tail/spine handle；
9. 无效 preview 不进入 Store；
10. 一次合法拖动只生成一个可撤销命令。

燕尾攻击箭头只改变派生尾部闭合策略；notch roots/tip 不是 semantic handles，也不进入 PlotJSON。

### 3.4 双箭头

`arrow.double` 固定四个语义控制点：

```text
第一个点 = exact tail edge A
第二个点 = exact tail edge B
第三个点 = exact objective A
第四个点 = exact objective B
```

操作：

1. 点击 tail A；
2. 点击 tail B；
3. 点击 objective A；
4. 移动鼠标到 objective B，显示完整双箭头 draft；
5. 第四次点击自动完成，不需要双击；
6. 完成后显示四个 semantic handles；
7. 拖动任一 tail/objective handle 重建共享 body、双翼、双头和 inner bridge；
8. 一次合法拖动产生一个 `ReplacePlotCommand`；
9. undo 恢复原 exact control；
10. invalid/self-intersecting preview 不进入 Store 或 History。

Tail pair 与 objective pair 均为无序对，交换任一对不会改变派生 geometry。Branch center、wing samples、heads 和 bridge 不是 handles，也不进入 PlotJSON。

## 4. Completion 与 zoom 生命周期

固定点数符号：

```text
maximum point candidate
→ legal draft
→ maximum-point click
→ auto-complete
```

`arrow.double` 使用上述通用 `completeAtMaximum` 路径。

可变多点符号在绘制期间暂时关闭 MapLibre double-click zoom：

```text
dblclick completion
→ preventDefault + stopPropagation
→ create/select semantic feature
→ current browser event ends
→ restore previous double-click zoom state
```

恢复不能发生在同一原生 `dblclick` 事件栈内，否则 MapLibre 可能执行一次默认缩放。Cancel 和 destroy 立即恢复原状态。

## 5. 南京示例

生产页面加载八个示例：

```text
1 × arrow.straight
1 × arrow.fine
1 × arrow.fine.tailed
1 × arrow.assault-direction
1 × arrow.curved
1 × arrow.attack
1 × arrow.attack.tailed
1 × arrow.double
```

双箭头示例使用两个横向尾缘和两个分离目标，生成一个共享尾部的 connected simple Polygon。

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

两种模式都运行真实 PlotLibre 和 MapLibre Worker，不依赖远程瓦片。

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

Playwright 当前验证：

- `/PlotLibre/` project path；
- Worker entry/shared 为 JavaScript；
- 无在线底图时立即启动；
- selector 有八个 option；
- 八类南京示例；
- committed Source 包含八种 `plotType`；
- fill/line Layers 可见；
- `queryRenderedFeatures()` 返回真实图形；
- 四种两点箭头绘制；
- 曲线箭头 draft/double-click/handle edit；
- 平尾与燕尾攻击箭头绘制与 edit；
- double-click completion 后相机稳定且 zoom 恢复；
- 双箭头第四候选点 draft 与第四次点击完成；
- 双箭头 four unique handles；
- 双箭头 objective edit/revision/history/undo；
- style、delete、PlotJSON 和 Worker 无回归。

权威全功能运行：

```text
Run ID: 30447472242
Node tests: 101 passed
Chromium: 13 passed
Node 20.19: success
Node 22: success
```

## 10. `querySourceFeatures()` 注意事项

MapLibre 可以按瓦片返回同一 GeoJSON Feature 的多个副本。语义 handle 数量必须按 `plotId + handleIndex` 去重，而不是使用原始 Feature 数量。

Store 中的 `controlPoints.length` 是语义控制点数量的权威值。

## 11. Geometry validation policy

曲线、攻击和双箭头不会静默输出自交 Polygon。

通用要求：

- semantic controls 满足 Definition 数量和角色约束；
- 参数生成 finite、closed、counterclockwise、simple ring；
- Definition validation 在 Store mutation 前完成完整可生成性检查；
- derived vertices 不作为 handles；
- invalid handle preview 不进入 Store/History。

双箭头附加要求：

- tail/objective pairs 均有有效距离并横跨 primary direction；
- objective separation 足以容纳两个独立 heads；
- 两个 objectives 位于派生 forward tail plane 前；
- branch/bridge 位于有效范围；
- shaft boundary 不越过 head neck plane；
- two wings、heads、inner bridge 与 shared body 不交叉。

## 12. Pages 部署

`.github/workflows/pages.yml` 仅从 `main` 部署。

```text
Settings → Pages → Build and deployment → GitHub Actions
```

PR #15 合并前，不声称公开页面已有八个符号。合并后必须验证 Pages workflow，并读取在线 selector/sample 状态后才能宣布 0.0.12 Playground 发布完成。

## 13. 强制约束

- Playground 不直接编辑 MapLibre Source；
- Polygon 不是原始数据；
- 应用层不复制几何算法；
- 底图不能阻塞 PlotLibre；
- dev、preview、E2E、Pages 统一 `/PlotLibre/`；
- 每个新符号同阶段加入 selector、示例和浏览器测试；
- 浏览器测试必须验证 actual rendered feature；
- completion instructions 必须匹配 Definition schema；
- topology-sensitive symbol 必须验证 invalid preview 不进入 Store/History；
- derived notch/head/body/branch/bridge vertices 不得暴露为 semantic handles。

## 14. 下一步

完成 PR #15 最终 CI、Ready、合并与 Pages 八符号验证。之后先单独设计 `arrow.pincer` 的 canonical semantic contract；不得把它实现为 `arrow.double` 的别名，也不得并行开发多个复杂符号。

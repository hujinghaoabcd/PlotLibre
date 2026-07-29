# PlotLibre Playground 与 GitHub Pages

## 1. 入口

```text
https://hujinghaoabcd.github.io/PlotLibre/
```

`apps/playground` 是真实 MapLibre 应用、人工验收入口、Playwright 测试目标和 GitHub Pages 站点。它只能使用公开 PlotLibre API。

## 2. 技术基线

```text
PlotLibre demo:       0.0.10
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
arrow.curved             曲线箭头
arrow.attack             攻击箭头
```

### 3.1 两点符号

前四种类型使用：

```text
第一次点击 = tail center / origin
第二次点击 = tip / objective
```

支持 pointer preview、点击/Enter 完成、Escape 取消、Backspace/Delete 重置、两个语义 handles、drag、undo/redo。

### 3.2 曲线箭头

`arrow.curved` 使用三至 64 个语义控制点：

```text
第一个点   = tail center
中间点     = curve path controls
最后一个点 = exact tip
```

操作：

1. 点击 tail；
2. 点击一个或多个 path controls；
3. 第三个候选点开始显示合法 Polygon draft；
4. 双击最后一点或按 Enter 完成；
5. Backspace/Delete 每次移除一个未提交点；
6. Escape 取消；
7. 完成后拖动任一语义 handle；
8. 一次合法拖动只生成一次历史命令。

### 3.3 攻击箭头

`arrow.attack` 使用三至 64 个语义控制点：

```text
第一个点   = exact tail edge A
第二个点   = exact tail edge B
中间点     = attack-spine controls
最后一个点 = exact objective/tip
```

尾缘 A/B 必须横跨初始进攻方向，二者距离定义语义尾宽。

操作：

1. 点击尾缘 A；
2. 在初始进攻方向另一侧点击尾缘 B；
3. 移动鼠标到第一个 spine candidate，产生首个合法 draft；
4. 点击一个或多个 spine controls；
5. 双击 objective 或按 Enter 完成；
6. Backspace/Delete 每次移除一个未提交点；
7. Escape 取消；
8. 完成后拖动任一 tail/spine handle；
9. 无效或自交 preview 保留最后一个合法状态，不进入 Store；
10. 一次合法拖动只生成一次历史命令，undo 恢复原控制点。

## 4. Double-click zoom 生命周期

多点绘制期间 MapLibre double-click zoom 暂时关闭。

完成时不能在同一个原生 `dblclick` 事件栈内立即重新启用，否则 MapLibre 默认处理器可能仍执行一次 2× 缩放，使刚绘制图形跳出视口。

当前策略：

```text
dblclick completion
→ preventDefault + stopPropagation
→ create/select semantic feature
→ current browser event ends
→ restore previous double-click zoom state
```

Cancel 和 destroy 仍立即恢复原状态。Chromium 测试验证完成攻击箭头后相机不跳变。

## 5. 南京示例

生产页面自动加载：

```text
1 × arrow.straight
1 × arrow.fine
1 × arrow.fine.tailed
1 × arrow.assault-direction
1 × arrow.curved
1 × arrow.attack
```

曲线箭头使用四个语义控制点和独立青绿色样式。攻击箭头使用两个精确尾缘、一个中间 spine control 和一个 objective。

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
- selector 有六个 option；
- 六类南京示例；
- committed Source 包含六种 `plotType`；
- fill/line Layers 可见；
- `queryRenderedFeatures()` 返回真实图形；
- 四种两点箭头绘制；
- 曲线箭头 draft/double-click/handle edit；
- 攻击箭头 tail-edge draft、spine、double-click completion；
- double-click completion 后相机稳定且 zoom 恢复；
- 攻击箭头参数和 simple derived ring；
- handles 按语义 `handleIndex` 去重验证；
- tail handle drag；
- revision 和 History 增加；
- one ReplacePlotCommand；
- undo 恢复尾缘；
- style、delete、PlotJSON 和 Worker 无回归。

当前权威测试：

```text
Node tests: 78 passed
Chromium: 12 passed
Run ID: 30413156622
```

## 10. `querySourceFeatures()` 注意事项

MapLibre 可以按瓦片返回同一 GeoJSON Feature 的多个副本。因此浏览器测试不能把原始返回数量直接解释为语义对象或 handles 数量。

正确验证方法：

```text
filter by plotId
→ map handleIndex
→ Set(handleIndex)
→ assert semantic count
```

Store 中的 `controlPoints.length` 仍是语义控制点数量的权威值。

## 11. Geometry validation policy

曲线箭头和攻击箭头不会静默输出自交 Polygon。

攻击箭头额外要求：

- 两个尾缘必须具有有效距离；
- 尾缘必须横跨初始 spine direction；
- 参数必须产生有限、闭合、逆时针、简单 ring；
- Definition validation 必须在 Store mutation 前完成完整可生成性检查。

Playground 当前：

- 不提交无效 draft；
- 无效 handle preview 不进入 Store 或 History；
- 保留最后一个合法 preview；
- 用户可调整尾缘、减少弯曲、简化控制点或收窄 body；
- 后续 UI 将增加可见 validation feedback。

## 12. Pages 部署

`.github/workflows/pages.yml` 仅从 `main` 部署。

仓库设置：

```text
Settings → Pages → Build and deployment → GitHub Actions
```

PR #12 合并后必须验证在线页面已包含六种符号，再宣布 0.0.10 Playground 发布完成。

## 13. 强制约束

- Playground 不直接编辑 MapLibre Source；
- Polygon 不是原始数据；
- 应用层不复制几何算法；
- 底图不能阻塞 PlotLibre；
- dev、preview、E2E、Pages 统一 `/PlotLibre/`；
- 每个新符号同阶段加入 selector、示例和浏览器测试；
- 浏览器测试必须验证 actual rendered feature，而不是只检查 Store 数量；
- 多点测试必须覆盖 double-click、相机稳定、缩放恢复和语义 handle；
- topology-sensitive symbol 必须验证 invalid preview 不进入 Store/History。

## 14. 下一步

下一单一纵向切片是 `arrow.attack.tailed`。它必须复用 `AttackArrowFrame` 并新增独立 inward swallowtail closing strategy，不能复制平尾攻击箭头 generator，也不能只是修改默认参数。

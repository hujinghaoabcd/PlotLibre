# PlotLibre Playground 与 GitHub Pages

## 1. 入口与职责

```text
https://hujinghaoabcd.github.io/PlotLibre/
```

`apps/playground` 同时承担：

- 真实 MapLibre 浏览器应用；
- 人工验收入口；
- Playwright 测试目标；
- GitHub Pages 站点；
- 公共 API 使用示例。

Playground 只能通过公开 PlotLibre packages 工作，不得直接调用内部 geometry 或修改 MapLibre Source 来绕过 Store、Registry 和 CommandHistory。

## 2. 当前技术基线

```text
PlotLibre workspace:  0.0.18
MapLibre GL JS:       6.0.0
Vite:                 8.1.5
Playwright:           1.61.1
Node.js:              20.19+
Pages base:           /PlotLibre/
Node tests:           154
Chromium tests:       20
public Arrow types:   14
```

公共 packages 当前仍为 `0.0.2`，Playground package 为 `0.0.3`。根 workspace `0.0.18` 是当前开发里程碑基线，不应被误解为已经完成统一 npm release。

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
```

## 4. 绘制模式

### 4.1 精确两点符号

```text
arrow.straight
arrow.fine
arrow.fine.tailed
arrow.assault-direction
```

语义控制：

```text
0 = tail / origin
1 = exact tip / objective
```

操作：

1. 点击起点；
2. 移动指针显示 draft；
3. 第二次点击完成；
4. Enter 可用当前 pointer preview 完成；
5. Backspace/Delete 返回 ready；
6. Escape 取消；
7. 完成后显示两个 semantic handles；
8. 一次合法拖动产生一个可撤销命令。

### 4.2 曲线箭头

`arrow.curved` 使用 3–64 个 authored controls：

```text
0      tail centre
1..n-2 path controls
n-1    exact tip
```

第三个有效候选点开始显示完整 draft。双击或 Enter 完成。派生 Catmull–Rom 样本、offset 边界和 arrow-head vertices 不进入 Store、handles 或 PlotJSON。

### 4.3 攻击箭头家族

```text
arrow.attack
arrow.attack.tailed
```

控制语义：

```text
0 + 1   exact tail edges
2..n-2  attack-spine controls
n-1     exact objective/tip
```

操作：

1. 点击 tail edge A；
2. 点击 tail edge B；
3. 点击或移动到 spine/objective candidates；
4. 双击 objective 或按 Enter 完成；
5. Backspace/Delete 逐点回退；
6. Escape 取消；
7. 完成后所有 authored tail/spine controls 均为 handles。

燕尾攻击箭头只改变派生尾部闭合策略。notch roots 和 notch tip 不是 controls。

### 4.4 双箭头

`arrow.double` 固定四个 authored controls：

```text
0 tail edge A
1 tail edge B
2 objective A
3 objective B
```

第三次点击后，Definition 可以生成一个临时镜像 objective 用于完整 draft。该点只是 transient draft control：

```text
不能完成
不能进入 Store
不能成为 handle
不能写入 PlotJSON
```

第四个真实控制点点击后通过 fixed-maximum path 自动完成。

### 4.5 钳形箭头

`arrow.pincer@1.1.0` 固定五个 canonical controls：

```text
0 outer tail A
1 outer tail B
2 objective A
3 objective B
4 shared inner junction
```

用户可以按左右任意顺序点击两个 objectives。当原始目标配对会造成 crossed arms、而交换 controls 2/3 能生成合法钳形时，Definition 只做 permutation-only canonicalization。

第五个点不合法时：

- 会话保持 active；
- candidate 不进入 Store、History 或 PlotJSON；
- `drawRejection` 暴露稳定 validation issues；
- Playground 将 issue code 翻译为中文调整建议；
- 移动指针或删除点后清除旧 rejection。

### 4.6 分队战斗箭头

`arrow.squad-combat` 保存 centre action path：

```text
0      tail centre
1..n-2 optional path controls
n-1    exact objective/tip
```

两个 tail edges 和 tail width 在局部米制空间中对称派生。它与 `arrow.attack` 的区别是后者的两个 tail edges 为 authored controls。

两点可以生成直线形式；更多点生成曲线路径；双击或 Enter 完成。

### 4.7 路线和走廊

`arrow.route`：

```text
0      route origin
1..n-2 optional path controls
n-1    exact objective/tip
```

派生 constant-width shaft、neck plane 和 exact-tip head。

`arrow.corridor`：

```text
0      endpoint A
1..n-2 optional path controls
n-1    endpoint B
```

输出 flat-cap undirected ribbon。它不是隐藏或退化 head 的 route arrow。

两者均支持两点直线和多点曲线路径，双击或 Enter 完成。

### 4.8 路线多头组

`arrow.route.bidirectional`：

```text
0      exact start tip
1..n-2 optional path controls
n-1    exact end tip
```

两个 authored endpoints 均为精确箭尖，输出一个 closed simple Polygon。

`arrow.route.double-head`：

```text
0      route origin
1..n-2 optional path controls
n-1    exact primary objective/tip
```

primary body 保持普通 route 语义。secondary emphasis head 在 primary neck 后方派生并作为第二个 Polygon component 渲染。secondary head 不进入 Store、History、handles 或 PlotJSON。

## 5. Completion 与地图交互生命周期

### 固定最大点数

```text
maximum-point candidate
→ Registry validation
→ full generation preflight
→ valid: auto-complete
→ invalid: active session + visible rejection
```

### 可变多点

```text
double-click / Enter
→ authored candidate
→ Registry validation
→ full generation preflight
→ Command
→ Store
```

绘制多点符号期间，MapLibre double-click zoom 被暂时关闭。完成需要：

```text
dblclick completion
→ preventDefault + stopPropagation
→ create/select semantic feature
→ current browser event ends
→ restore previous zoom state
```

不能在同一原生 `dblclick` 调用栈中过早恢复，否则地图可能额外缩放一次。Cancel 和 destroy 立即恢复原状态。

## 6. Draft、Guide 与 Rejection

PlotLibre 区分三种临时可视状态：

### 完整合法 draft

Definition 可以生成完整 RenderBundle，但尚未进入 Store。

### Last-valid draft

当前 pointer candidate 暂时无效，仍保留最近一次合法完整 draft，避免图形闪烁消失。

### Semantic guide

在还不能生成完整 Polygon 时，显示 authored path/control guide。Guide：

- 只用于可见性和调整；
- 不能完成对象；
- 不进入 Store、History、handles 或 PlotJSON。

Completion rejection 描述一次明确完成尝试。它不是每一次 pointer movement 的连续错误检查。

## 7. 示例数据

完整功能模式加载 14 类南京示例：

```text
1 × arrow.straight
1 × arrow.fine
1 × arrow.fine.tailed
1 × arrow.assault-direction
1 × arrow.curved
1 × arrow.attack
1 × arrow.attack.tailed
1 × arrow.double
1 × arrow.pincer
1 × arrow.squad-combat
1 × arrow.route
1 × arrow.corridor
1 × arrow.route.bidirectional
1 × arrow.route.double-head
```

示例必须只通过公开 create/import API 进入 Store，不得直接注入 rendered GeoJSON。

## 8. 启动与底图

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

基础 E2E：

```text
?e2e=1
```

完整 path/squad 功能测试：

```text
?e2e=1&squad=1&paths=1
```

E2E 运行真实 PlotLibre、MapLibre 和 Worker，但不依赖远程瓦片。

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

Worker entry 和 shared module 必须保持同一 MapLibre 版本。详见 `MAPLIBRE_WORKER_PACKAGING.md`。

## 10. 本地运行

```bash
npm install
npm run playground:dev
```

默认开发地址：

```text
http://127.0.0.1:5173/PlotLibre/
```

验证：

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

当前 20 个 Chromium tests 覆盖：

- `/PlotLibre/` base path；
- Worker entry/shared module；
- 无远程底图启动；
- selector 和 sample 行为；
- committed/draft/handles Sources；
- fill/line/handle Layers；
- actual `queryRenderedFeatures()`；
- 两点符号绘制；
- curved/attack/squad/path multi-point 绘制；
- double-arrow transient preview 与 fixed-four completion；
- pincer natural objective order；
- pincer actionable rejection；
- route/corridor；
- bidirectional/double-head route；
- 14 类型 draft/committed visibility matrix；
- handle edit、revision、history 和 undo；
- style reload；
- delete 与 PlotJSON；
- camera stability 和 zoom restoration。

当前权威实现基线：

```text
Node tests:      154 passed
Chromium tests:  20 passed
public symbols:  14 Arrow types
```

## 12. `querySourceFeatures()` 注意事项

MapLibre 可以按瓦片返回同一 GeoJSON Feature 的多个副本。

语义 handle 数量必须按：

```text
plotId + handleIndex
```

去重，而不是使用原始 Feature 数量。Store 中 `controlPoints.length` 是 authored semantic control 数量的权威值。

## 13. Geometry validation policy

所有 topology-sensitive Definitions 必须在 Store mutation 前完成 full generation preflight。

通用要求：

- semantic controls 满足 Definition 数量和角色；
- 参数有限且处于范围；
- 输出 geometry 有限；
- Polygon ring 闭合；
- 方向规范化；
- simple-ring validation；
- exact authored tips/tails/junctions 按 Definition contract 保留；
- invalid handle preview 不进入 Store/History；
- derived samples、heads、notches、bridges、offsets 和 final vertices 不作为 handles。

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

文档不得仅根据源码或 workflow 配置就声称线上缓存已经人工核验。需要明确区分：

```text
source/build ready
workflow deployed
live page manually verified
```

## 15. 强制约束

- Playground 不直接编辑 MapLibre Source；
- Polygon 不是原始数据；
- 应用层不复制 geometry；
- 底图失败不能阻塞 PlotLibre；
- dev、preview、E2E 和 Pages 统一 `/PlotLibre/`；
- 每个新公共符号同阶段加入 selector、样例和 browser coverage；
- browser tests 必须验证 actual rendered feature；
- completion instructions 必须与 Definition schema 一致；
- topology-sensitive symbols 必须验证 invalid preview 不进入 Store/History；
- derived controls 与 generated vertices 不得暴露为 canonical handles；
- Playground 错误提示使用 Registry issue codes，不复制 geometry validation；
- 新 Area family 必须有清晰分类和独立说明，不能简单混入 Arrow 名称列表。

## 16. 下一步

Milestone 006H 已合并。当前进入 006I：

1. 同步剩余历史状态文档；
2. 冻结闭合行动区域公共 identifiers；
3. 设计 `area.closed-curve` 与 `area.gathering-place` canonical controls；
4. 仅在证明独立方向语义后保留 `area.route-loop`；
5. 建立 pure closed-area geometry frame；
6. 完成 Definition、Registry、PlotJSON、Playground 和浏览器纵向切片。

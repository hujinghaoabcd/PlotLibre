# PlotLibre Playground 与 GitHub Pages

## 1. 入口与职责

```text
https://hujinghaoabcd.github.io/PlotLibre/
```

`apps/playground` 同时承担真实 MapLibre 应用、人工验收入口、Playwright 测试目标、GitHub Pages 站点和公共 API 示例。它只能通过公开 PlotLibre packages 工作，不得绕过 Store、Registry、CommandHistory 或公开 renderer API。

## 2. 当前技术基线

```text
workspace:          0.0.20
MapLibre GL JS:     6.0.0
Vite:               8.1.5
Playwright:         1.61.1
Node.js:            20.19+
Pages base:         /PlotLibre/
Node tests:         184
Chromium tests:     28
public symbols:     19 (14 Arrow + 1 Line + 4 Area)
```

公共 packages 仍使用开发期独立版本。根 workspace `0.0.20` 是里程碑基线，不代表统一 npm release。

## 3. 当前公共目录

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
line.circular-arc           三点圆弧
area.closed-curve           闭合曲线区域
area.gathering-place        集结地
area.circular-segment       圆弓形区域
area.sector                 扇形区域
```

## 4. 绘制模式

### 4.1 精确两点

```text
arrow.straight
arrow.fine
arrow.fine.tailed
arrow.assault-direction
```

第二次点击自动完成。

### 4.2 可变路径

```text
arrow.curved
arrow.attack
arrow.attack.tailed
arrow.squad-combat
arrow.route
arrow.corridor
arrow.route.bidirectional
arrow.route.double-head
area.closed-curve
```

双击末点或按 Enter 完成。Backspace/Delete 逐点回退，Escape 取消。

### 4.3 固定复合箭头

```text
arrow.double  4 controls
arrow.pincer  5 controls
```

达到最大 authored controls 后自动尝试完成。无效候选保留 active session 和结构化 rejection。

### 4.4 固定三点符号

```text
area.gathering-place
line.circular-arc
area.circular-segment
area.sector
```

第三个 pointer candidate 可形成完整 draft，第三次有效点击自动完成。

#### Circular arc

```text
0 start
1 through
2 end
```

输出 open LineString。经过点精确选择小弧或大弧。

#### Circular segment

```text
0 arc/chord start
1 through-point on arc
2 arc/chord end
```

输出 selected arc + exact chord 的 Polygon。

#### Sector

```text
0 center
1 exact radius/start-boundary point
2 end-bearing handle
```

第三点只定义结束方位，其距离不改变半径。默认顺时针，Definition 参数可选择逆时针。

## 5. Draft、Guide 与 Rejection

PlotLibre 区分：

- **complete draft**：完整合法派生图形，尚未进入 Store；
- **last-valid draft**：当前 pointer 无效时保留最近合法图形；
- **incomplete semantic guide**：控制点不足时的临时路径/点；
- **Definition semantic guide path**：完整图形中仍需解释 authored control 与 rendered geometry 关系的路径；
- **completion rejection**：明确完成失败后的结构化问题。

Sector 使用 Definition hook：

```text
deriveSemanticGuidePaths(feature)
```

返回 `center → end-bearing handle`。MapLibre 在以下状态渲染 `plotlibre-handle-guide` 虚线：

- 完整 draft；
- 已选中；
- handle drag preview。

该 guide 不进入：

```text
committed source
Store
History
PlotJSON
Definition committed RenderBundle
```

MapLibre style reload 必须恢复该 layer 和选中对象的 guide。

## 6. Completion transaction

固定最大点数：

```text
maximum-point candidate
→ canonical authored controls
→ Registry validation
→ full generation preflight
→ valid: auto-complete
→ invalid: active session + rejection
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

绘制多点符号期间临时关闭 double-click zoom。恢复必须在当前原生 `dblclick` 调用栈结束后进行。

## 7. 示例数据

生产模式和 `?basemap=none` 加载 19 类南京示例：

```text
14 Arrow
1 Line
4 Area
```

示例只通过公开 `create()` 与 Registry preflight 进入 Store。

启动流程：

```text
PlaygroundApp.start()
→ bind generic listeners
→ install symbol-group wrappers/listeners
→ reload complete wrapped sample catalog
→ 19 semantic features
```

基础兼容 E2E `?e2e=1` 保持空 Store 和原九类 selector，验证早期公共交互表面没有意外破坏。

## 8. 启动与 E2E 模式

禁用在线底图：

```text
?basemap=none
```

基础兼容 E2E：

```text
?e2e=1
```

完整 19 类 E2E：

```text
?e2e=1&squad=1&paths=1&areas=1&circular=1
```

底图状态只能改变背景，不能改变符号目录、示例或语义行为。

## 9. MapLibre Sources 与 Layers

Sources：

```text
plotlibre-committed
plotlibre-draft
plotlibre-handles
```

新增 guide layer：

```text
plotlibre-handle-guide
```

完整 layer 数量当前为 8。`style.load` 后 renderer 必须幂等恢复 Sources、Layers、committed features、draft 和 selected handles/guides。

`querySourceFeatures()` 可按瓦片返回重复 Feature。控制点数量必须按 `plotId + handleIndex` 去重，Store 中 `controlPoints.length` 才是权威值。

## 10. 本地运行与验证

```bash
npm install
npm run playground:dev
```

默认地址：

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

## 11. Chromium 覆盖

28 项 Chromium tests 覆盖：

- Pages base、Worker entry/shared module；
- remote-basemap-independent startup；
- base 9-selector compatibility surface；
- production 19-symbol catalog and samples；
- actual committed/draft/handle-guide rendering；
- 两点、可变路径、固定三/四/五点 completion；
- pincer actionable rejection and recovery；
- route/corridor/multi-head route；
- closed curve and gathering place；
- circular arc LineString；
- circular-segment Polygon；
- sector derived endpoint and authored bearing handle；
- sector transient radial guide；
- committed source 不包含 guide；
- handles、edit、revision、undo；
- style reload、delete、PlotJSON、camera and zoom restoration。

目标权威基线：

```text
Node:      184 passed
Chromium:  28 passed
symbols:   19
```

## 12. Pages 部署

`.github/workflows/pages.yml` 仅从 `main` 构建并部署：

```text
apps/playground/dist
```

必须区分：

```text
source/build ready
workflow deployed
live page manually verified
```

不能仅凭源码或 workflow 声称线上缓存已人工核验。

## 13. 强制约束

- Playground 不直接编辑 MapLibre Sources；
- rendered geometry 不是原始数据；
- UI 不复制 geometry validation；
- 底图失败不能阻塞 PlotLibre；
- 每个新公共符号同阶段加入 selector、sample、instructions 和 actual-rendered tests；
- semantic guides 必须由 Definition 声明并保持 transient；
- completion 文案必须与 `controlSchema` 一致；
- invalid preview 不进入 Store/History；
- generic listeners 先绑定，specialized listeners 后绑定；
- dev、preview、E2E 和 Pages 统一 `/PlotLibre/`。

## 14. 下一步

PR #34 完成最终 current-head CI、交接与 squash merge 后，进入 Milestone 007 专业编辑语义设计：多选、框选/套索、整体平移、旋转/缩放、多对象 transaction 和 atomic rollback。006J PR 不再增加新符号或 geodesic circular fallback。

# PlotLibre Playground 与 GitHub Pages

## 1. 入口与职责

```text
https://hujinghaoabcd.github.io/PlotLibre/
```

`apps/playground` 同时承担真实 MapLibre 应用、人工验收入口、Playwright 测试目标、GitHub Pages 站点和公共 API 示例。它只能通过公开 PlotLibre packages 工作，不得绕过 Store、Registry、CommandHistory 或公开 renderer API。

## 2. 当前合并基线

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
main SHA:           297d0a644eaa3427f8fd59b82b7bc3582221d49e
merged PR:          #34
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

### 精确两点

```text
arrow.straight
arrow.fine
arrow.fine.tailed
arrow.assault-direction
```

第二次有效点击自动完成。

### 可变多点

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

### 固定四/五点

```text
arrow.double  4 controls
arrow.pincer  5 controls
```

达到最大 authored controls 后自动尝试完成。无效候选保留 active session 和结构化 rejection。

### 固定三点

```text
area.gathering-place
line.circular-arc
area.circular-segment
area.sector
```

第三个 pointer candidate 可形成完整 draft，第三次有效点击自动完成。

Circular roles：

```text
line.circular-arc:
  start / through / end

area.circular-segment:
  arc-chord start / through / arc-chord end

area.sector:
  center / exact radius-start / end-bearing handle
```

Sector 第三点只定义结束方位，其距离不改变半径。

## 5. Draft、Guide 与 Rejection

PlotLibre 区分：

- complete draft；
- last-valid draft；
- incomplete semantic guide；
- Definition semantic guide path；
- structured completion rejection。

Sector 使用：

```text
PlotDefinition.deriveSemanticGuidePaths(feature)
```

返回 `center → end-bearing handle`。MapLibre 在完整 draft、selection 和 handle drag 状态渲染 `plotlibre-handle-guide` 虚线。

该 guide 不进入：

```text
committed source
committed RenderBundle
Store
History
PlotJSON
```

## 6. Completion transaction

```text
candidate
→ canonical authored controls
→ Registry validation
→ full generation preflight
→ valid: Command + Store
→ invalid: active session + rejection, no mutation
```

绘制多点符号期间临时关闭 double-click zoom，并在原生 `dblclick` 调用结束后恢复。

## 7. Production samples and E2E modes

生产模式和 `?basemap=none` 加载：

```text
19 samples
14 Arrow + 1 Line + 4 Area
```

基础兼容 E2E：

```text
?e2e=1
```

保持空 Store 和原九类 selector。

完整 E2E：

```text
?e2e=1&squad=1&paths=1&areas=1&circular=1
```

底图状态只能改变背景，不能改变符号目录、示例或语义行为。

## 8. MapLibre Sources and Layers

Sources：

```text
plotlibre-committed
plotlibre-draft
plotlibre-handles
```

Layers 当前为 8 个，包括：

```text
plotlibre-handle-guide
plotlibre-handle
```

`style.load` 后 renderer 必须幂等恢复 Sources、Layers、committed features、draft、selected handles 和 semantic guides。

`querySourceFeatures()` 可能返回瓦片重复项。控制点数量按 `plotId + handleIndex` 去重；Store 中 `controlPoints.length` 才是权威值。

## 9. Validation

```bash
npm run typecheck
npm test
npm run playground:typecheck
npm run playground:build
npm run handover:check
npx playwright install --with-deps chromium
npm run playground:e2e
```

权威 PR #34 验证：

```text
CI:        #337 / 30893450723
Node:      184 passed
Chromium:  28 passed
symbols:   19
```

28 项 Chromium tests 覆盖实际 committed/draft/guide rendering、全部 completion modes、历史 Arrow/Area regressions、19 类 samples、style reload、editing、undo、PlotJSON 和 Worker packaging。

## 10. Pages deployment

`.github/workflows/pages.yml` 仅从 `main` 部署 `apps/playground/dist`。

必须区分：

```text
source/build ready
workflow deployed
live page manually verified
```

不能仅凭源码或 workflow 声称线上缓存已人工核验。

## 11. 强制约束

- Playground 不直接编辑 MapLibre Sources；
- rendered geometry 不是原始数据；
- UI 不复制 geometry validation；
- basemap failure 不阻塞 PlotLibre；
- 每个 public Definition 同阶段加入 selector、sample、instruction 和 actual-rendered tests；
- semantic guides 必须由 Definition 声明并保持 transient；
- invalid preview 不进入 Store/History；
- generic listeners 先绑定，specialized listeners 后绑定；
- dev、preview、E2E 和 Pages 统一 `/PlotLibre/`。

## 12. 下一步

006J 已通过 PR #34 合并。完成 documentation-only post-merge finalization 后，进入 Milestone 007 professional editing semantic design：multi-selection、box/lasso、whole-object transforms、groups/locks/z-order、multi-object transactions 和 atomic rollback。设计 PR 合并前不写 runtime。

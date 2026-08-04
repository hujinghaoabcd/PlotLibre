# PlotLibre Playground 与 GitHub Pages

## 1. 入口与职责

```text
https://hujinghaoabcd.github.io/PlotLibre/
```

`apps/playground` 同时承担真实 MapLibre 应用、人工验收入口、Playwright 测试目标、GitHub Pages 站点和公共 API 示例。它只能通过公开 PlotLibre packages 工作，不得绕过 Store、Registry、CommandHistory、SelectionController 或公开 renderer API。

## 2. 当前 007A 候选基线

```text
workspace:          0.0.21
MapLibre GL JS:     6.0.0
Vite:               8.1.5
Playwright:         1.61.1
Node.js:            20.19+
Pages base:         /PlotLibre/
Node tests:         219
Chromium tests:     30
public symbols:     19 (14 Arrow + 1 Line + 4 Area)
MapLibre Sources:   4
MapLibre Layers:    10
PR:                 #38
branch:             agent/007a-selection-batch-translation
```

公共 packages 仍使用开发期独立版本。根 workspace `0.0.21` 是里程碑基线，不代表统一 npm release。

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

## 5. Selection 与 Primary

Playground 直接展示 `plot.selectedIds` 和 `plot.selectedId`：

- 选择数量显示完整 ordered selection；
- `selectedId` 表示 Primary；
- 只有 Primary 显示 authored handles、Definition guides 和样式面板；
- secondary selections 只显示轻量边界/线/点 overlay；
- selection 不进入 PlotJSON，不改变 PlotFeature revision。

输入语义：

```text
plain click       替换选择；已选 secondary 可成为 Primary
Shift + click     添加到选择
Ctrl/Cmd + click  切换选择状态
Alt + click       从选择中移除
empty plain click 清空选择
Escape            非绘制/非拖动状态清空选择
```

PlotLibre 安装期间保留并关闭 MapLibre box zoom，使 Shift 专用于 additive selection。销毁 PlotLibre 时恢复原 box-zoom 状态。

## 6. Batch delete

Playground 的“批量删除选中”按钮与 Delete/Backspace 使用同一个 `plot.removeSelected()` 路径：

```text
ordered selected ids
→ one BatchEditCommand
→ one Store transaction
→ after selection empty
→ one History entry
```

Undo 必须恢复：

```text
exact feature values
exact document order
exact selectedIds membership/order
exact Primary id
```

Redo 回放 exact after-state，不再次增加 revisions。

## 7. Whole-selection translation

拖动任一 selected object 的主体会启动整体平移：

```text
pointer down on selected body
→ capture original selected features
→ derive one shared local projection
→ pointer movement becomes one metre delta
→ render transient translated selection overlay
→ Store remains unchanged
→ pointer up: preflight all candidates and commit one BatchEditCommand
```

交互状态：

- authored handle drag 优先于 body translation；
- 平移开始后临时关闭 dragPan；
- movement threshold 以下仍按 click 处理；
- Escape 取消全部 preview；
- 任一 candidate 无效时整批拒绝；
- parameters/style/metadata 保持不变；
- one gesture = one history entry。

Playground status bar 会显示 selection count、Primary、translation preview、commit、cancel 或 rejection 状态。

## 8. Draft、Guide 与 Rejection

PlotLibre 区分：

- complete draft；
- last-valid draft；
- incomplete semantic guide；
- Definition semantic guide path；
- selection overlay；
- translation preview；
- structured completion/transform rejection。

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

## 9. Completion 与 batch transaction

单对象绘制完成：

```text
candidate
→ canonical authored controls
→ Registry validation
→ full generation preflight
→ valid: Command + Store
→ invalid: active session + rejection, no mutation
```

批量平移/删除：

```text
capture exact before state
→ stage every candidate
→ validate full staged state/order
→ any error: no mutation
→ commit once
→ one Store event
→ restore explicit after selection
→ one History entry
```

绘制多点符号期间临时关闭 double-click zoom，并在原生 `dblclick` 调用结束后恢复。

## 10. Production samples and E2E modes

生产模式和 `?basemap=none` 加载：

```text
19 samples
14 Arrow + 1 Line + 4 Area
```

基础兼容 E2E：

```text
?e2e=1
```

保持空 Store 和原九类 selector，同时可通过 `window.__plotlibrePlayground` 使用公开 PlotLibre 实例进行真实 MapLibre 纵向测试。

完整 E2E：

```text
?e2e=1&squad=1&paths=1&areas=1&circular=1
```

底图状态只能改变背景，不能改变符号目录、示例或语义行为。

## 11. MapLibre Sources and Layers

Sources：

```text
plotlibre-committed
plotlibre-selection
plotlibre-draft
plotlibre-handles
```

Layers：

```text
plotlibre-fill
plotlibre-line
plotlibre-point
plotlibre-selection-line
plotlibre-selection-point
plotlibre-draft-fill
plotlibre-draft-line
plotlibre-draft-point
plotlibre-handle-guide
plotlibre-handle
```

`style.load` 后 renderer 必须幂等恢复 Sources、Layers、committed features、selection overlays、translation preview、draft、Primary handles 和 semantic guides。

`querySourceFeatures()` 可能返回瓦片重复项。控制点数量按 `plotId + handleIndex` 去重；Store 中 `controlPoints.length` 才是权威值。

Selection hit testing 可查询 committed 和 selection layers。Selection source 中的 `primary` 仅为 transient derived style property，不得写入 canonical feature。

## 12. Validation

```bash
npm run typecheck
npm test
npm run playground:typecheck
npm run playground:build
npm run handover:check
npx playwright install --with-deps chromium
npm run playground:e2e
```

007A runtime 验证：

```text
head:       07449e7fda66069b148fa08c865b209d7dc365a3
CI:         #398 / 30904843935
Node:       219 passed on Node 20.19 and 22
Chromium:   30 passed
build:      success
handover:   success
```

30 项 Chromium tests 覆盖实际 committed/draft/guide rendering、全部 completion modes、历史 Arrow/Area regressions、19 类 samples、style reload、editing、undo、PlotJSON、Worker packaging，以及真实 Shift multi-selection、body translation、Escape rollback 和 batch Delete/undo/redo。

版本与文档同步后的最终 PR head 必须重新运行完整 CI。

## 13. Pages deployment

`.github/workflows/pages.yml` 仅从 `main` 部署 `apps/playground/dist`。

必须区分：

```text
source/build ready
workflow deployed
live page manually verified
```

不能仅凭源码或 workflow 声称线上缓存已人工核验。

## 14. 强制约束

- Playground 不直接编辑 MapLibre Sources；
- rendered geometry 和 selection overlay 不是原始数据；
- UI 不复制 geometry/transaction validation；
- basemap failure 不阻塞 PlotLibre；
- 每个 public Definition 同阶段加入 selector、sample、instruction 和 actual-rendered tests；
- semantic guides 和 translation preview 必须保持 transient；
- invalid preview 不进入 Store/History；
- Primary-only handle/style semantics 不得退化成每个 selected feature 都可编辑；
- batch mutation 必须 all-or-nothing；
- dev、preview、E2E 和 Pages 统一 `/PlotLibre/`。

## 15. 下一步

PR #38 完成最终文档 CI、Ready review 和 squash merge 后，下一 runtime 前先设计 Milestone 007B box/lasso selection。007B 不得同时混入 rotation/scale、groups/locks、snapping 或新符号。

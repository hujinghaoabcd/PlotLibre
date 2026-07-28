# PlotLibre Development Handover — Milestone 002

日期：2026-07-28  
仓库：`hujinghaoabcd/PlotLibre`  
目标分支：`main`  
开发分支：`agent/bootstrap-foundation`  
草稿 PR：`#1 Bootstrap PlotLibre foundation`

## Current state

PlotLibre 当前版本提升为开发基线 `0.0.2`。在 Milestone 001 的语义对象、几何生成、Store、History 和 MapLibre committed renderer 之上，本里程碑完成了第一个完整交互纵向切片。

当前用户已经可以：

1. 调用 `plot.draw("arrow.straight")` 开始绘制；
2. 第一次点击确定箭尾；
3. 移动鼠标动态预览；
4. 第二次点击或 Enter 完成；
5. Escape 取消；
6. 点击图形选择；
7. 拖动两个语义控制点；
8. 一次拖动通过一次 `undo()` 整体撤销；
9. MapLibre `style.load` 后自动恢复图层和状态。

尚未创建真实浏览器 Playground。下一里程碑专门完成 Vite、真实 MapLibre 6、Playwright 和 GitHub Pages。

## Completed in this milestone

### 新增 `@plotlibre/interaction`

新增文件：

```text
packages/interaction/package.json
packages/interaction/tsconfig.json
packages/interaction/src/index.ts
packages/interaction/src/types.ts
packages/interaction/src/two-point-draw-session.ts
```

实现：

- `DrawSession` 接口；
- `DrawSessionStatus`；
- `DrawSessionSnapshot`；
- `TwoPointDrawSessionOptions`；
- `TwoPointDrawSession`；
- ready/drawing/completed/cancelled 状态；
- click、pointerMove、keyDown 和 cancel；
- Enter 完成；
- Escape 取消；
- Backspace/Delete 清空起点并返回 ready；
- distinct-point 检查；
- 语义 `PlotFeatureInput` 输出；
- 不依赖 MapLibre、DOM 或浏览器全局变量。

### MapLibre renderer 扩展

`MapLibrePlotRenderer` 从单一 Source 扩展为：

```text
plotlibre-committed
plotlibre-draft
plotlibre-handles
```

新增图层：

```text
plotlibre-fill
plotlibre-line
plotlibre-point
plotlibre-draft-fill
plotlibre-draft-line
plotlibre-draft-point
plotlibre-handle
```

新增：

- `renderDraft()`；
- `renderHandles()`；
- `clearDraft()`；
- `clearHandles()`；
- `sourceIds` getter；
- draft 透明和虚线视觉区分；
- 控制点白色填充、蓝色描边；
- 幂等 Source/Layer 初始化；
- 全部 Source/Layer 的逆序销毁。

### MapLibre interaction adapter

新增：

```text
packages/maplibre/src/interaction.ts
```

实现 `MapLibrePlotInteraction`：

- MapLibre click 到 DrawSession 的转换；
- mousemove 动态草图；
- canvas keyboard 事件；
- committed fill/line 点击选择；
- handles hit testing；
- mousedown 开始控制点拖动；
- 拖动期间关闭 `dragPan`；
- mousemove 生成语义 preview；
- Registry 验证 preview；
- mouseup 提交一次 ReplacePlotCommand；
- Escape 取消拖动并恢复原对象；
- Store 更新后同步选择 handles；
- style.load 后恢复 renderer、数据、draft 和 handles；
- cursor：crosshair/grab/grabbing/idle；
- map canvas 自动变为 keyboard focusable；
- 可注入 `idFactory` 便于测试和业务 ID 策略。

### `PlotLibre` 高层 API

新增：

```ts
plot.draw(plotType, options)
plot.cancelDrawing()
plot.select(id)
plot.replace(feature)
plot.interaction
```

行为：

- `draw()` 当前只接受控制点要求恰好为 2 的 definition；
- `replace()` 自动把 revision 提升 1；
- `clear()` 和 `importDocument()` 会取消 drawing 和 selection；
- `destroy()` 先解绑交互，再销毁 renderer；
- 创建和编辑都通过 CommandHistory。

### Core 类型更新

`PlotRenderRole` 新增：

```text
handle
```

`PlotRenderProperties` 新增可选字段：

```text
handleKind
handleIndex
plotRenderId
```

### 工程配置

更新：

- workspace 版本到 `0.0.2`；
- internal package dependency 版本到 `0.0.2`；
- TypeScript paths；
- project references；
- clean script；
- workspace link script；
- MapLibre package dependency graph。

新的依赖方向：

```text
core <- geometry <- symbols
core <- interaction
core + interaction <- maplibre
```

### 测试

新增：

```text
tests/interaction.test.mjs
```

重写和扩展：

```text
tests/maplibre.test.mjs
```

FakeMap 现在模拟：

- Source；
- Layer；
- Evented on/off/fire；
- Canvas keyboard；
- cursor；
- queryRenderedFeatures；
- dragPan；
- style reset。

新增测试覆盖：

- TwoPointDrawSession preview 和 complete；
- keyboard reset/complete/cancel；
- interactive click drawing；
- draft source；
- automatic selection；
- Escape cancel；
- semantic handle drag；
- revision increment；
- single-command undo；
- style.load restoration。

### 文档

新增：

```text
docs/INTERACTION_MODEL.md
```

更新：

```text
README.md
AGENTS.md
CONTRIBUTING.md
docs/ARCHITECTURE.md
docs/DEVELOPMENT_PLAN.md
docs/handover/LATEST.md
```

README 已改用符合 MapLibre 6 ESM 的 named import 示例，并增加 interactive API、键盘行为和 Source 架构说明。

## Validation

环境：

```text
Node.js v22.16.0
npm 10.9.2
TypeScript 5.8.3
```

运行：

```bash
tsc -b --pretty false
```

结果：通过，0 TypeScript errors。

运行：

```bash
npm test
```

结果：

```text
15 tests
15 passed
0 failed
```

运行：

```bash
npm run handover:check
```

结果：通过。

注意：当前环境不能从容器直接访问 GitHub/npm 网络，因此尚未安装和启动真实 MapLibre 6。当前浏览器交互通过结构化 MapLibre 接口和 FakeMap 验证。真实浏览器验证明确列入下一里程碑。

## Architectural decisions

1. **Interaction 独立成包。** 两点会话只依赖 Core，不依赖地图引擎。
2. **MapLibre 只做适配。** 它处理事件、命中测试、cursor、dragPan 和 Source/Layer 生命周期。
3. **三 Source 分离。** committed、draft、handles 不共享高频更新路径。
4. **Preview 不进入 Store。** pointermove 不产生历史命令。
5. **控制点是编辑对象。** 不暴露派生 Polygon 顶点。
6. **一次拖动是一个事务。** pointerup 才提交 ReplacePlotCommand。
7. **选择是运行时状态。** 不写入 PlotJSON。
8. **Style reload 采用幂等恢复。** 监听 `style.load` 而不是依赖一次性初始化。
9. **结构化 MapLibre 类型。** 当前库编译时不直接依赖 maplibre-gl 包，真实版本由 peer dependency 和 E2E 验证。
10. **示例部署单独里程碑。** 不在未真实运行前声称 GitHub Pages 可用。

## Known limitations

- 只支持控制点数量恰好为 2 的交互 definition；
- 没有多点 DrawSession 和双击完成；
- 没有 snapping、guides 或角度约束；
- 没有 width/head-length/curve 等参数控制柄；
- 没有触摸专项交互；
- 没有多选、框选和套索；
- hit testing 目前使用 fill/line 图层，没有独立 expanded hit-area layer；
- 拖动 preview 仍同步执行几何生成，尚未 requestAnimationFrame 合并；
- 未真实验证 MapLibre 5/6；
- 未创建 Vite Playground；
- 未创建 Playwright E2E；
- 未创建 GitHub Pages workflow；
- 未生成 package-lock；
- 项目仍为 `UNLICENSED`。

## Next tasks

下一里程碑：**Milestone 003 — Browser Playground and GitHub Pages**。

优先顺序：

1. 创建 `apps/playground`；
2. 引入真实 MapLibre GL JS 6；
3. 使用 ESM named import；
4. 选择无需私有 Key 的公开样式；
5. 绘制、取消、选择、撤销、重做、删除、清空工具栏；
6. 样式编辑面板；
7. PlotJSON 导入导出；
8. 状态栏和操作提示；
9. Playwright Chromium；
10. 测试 click draw、Escape、handle drag、undo、style reload；
11. 建立 GitHub Pages workflow；
12. Vite base 设置为 `/PlotLibre/`；
13. README 增加在线 Demo；
14. 再评估 MapLibre 5 compatibility job；
15. 完成 Milestone 003 交接文件。

完成 Pages 示例后，再进入公共 Arrow 几何基础，不应提前批量添加攻击箭头。

## Risks and decisions

### MapLibre 6

MapLibre GL JS 6 已转为 ESM-only，并要求 WebGL2。Playground 必须使用现代 bundler 和 named/namespace import，不能继续依赖旧 UMD `<script>` 示例。

### MapLibre type compatibility

当前结构化接口只覆盖实际使用的方法。真实 MapLibre 6 接入时可能发现事件类型、queryRenderedFeatures 参数或 style lifecycle 的细节差异，应优先调整 adapter，不要让 interaction 包依赖 MapLibre。

### Pointer performance

当前 FakeMap 测试无法衡量 pointermove FPS。真实示例完成后应增加 requestAnimationFrame batching，再建立性能基准。

### GitHub Pages 路径

Pages 项目站点路径为 `/PlotLibre/`，Vite 静态资源 base、导入 URL 和刷新行为必须显式验证。

### 许可证

公开 Demo 和未来 npm 发布前，应尽快决定许可证；在此之前不得复制许可证不明的态势标绘算法。

## Continuation instructions

新的开发者或新对话应按顺序：

1. 阅读 `AGENTS.md`；
2. 阅读 `docs/ARCHITECTURE.md`；
3. 阅读 `docs/INTERACTION_MODEL.md`；
4. 阅读 `docs/DEVELOPMENT_PLAN.md` 的 Milestone 003；
5. 运行 `npm test`，确认 15/15；
6. 不要修改 control-points-as-source-of-truth 原则；
7. Playground 只能调用公开 `PlotLibre` API；
8. 优先真实 MapLibre 6 和 Pages，不先增加攻击箭头；
9. 完成后更新 `LATEST.md` 并添加 Milestone 003 文件。

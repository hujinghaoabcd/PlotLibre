# PlotLibre Development Handover — Milestone 005K Arrow Rendering Reliability

日期：2026-07-29  
仓库：`hujinghaoabcd/PlotLibre`  
目标分支：`main`  
开发分支：`agent/arrow-render-reliability`  
PR：`#19 Fix cross-symbol arrow rendering reliability`  
Workspace：`0.0.12`  
状态：系统级修复和完整功能验证已完成；等待文档包含的最终 CI、Ready 与合并

## Completed in this milestone

### Systemic failure model

本里程碑确认“多种箭头偶发不显示”不是多个独立算法故障，而是共享交互与渲染链路的组合问题：

1. 临时控制点可能生成重合、自交或其他不可渲染几何；
2. 原 MapLibre adapter 捕获异常后直接清空 draft，用户看到完全空白；
3. draw session 在完整 renderability preflight 之前即可进入 terminal；
4. `create`、`replace` 和 import 过去没有统一执行完整 `Registry.generate()` 预检；
5. fixed-count 类型的无效最后一点可能令交互难以恢复。

### Completion preflight

`TwoPointDrawSession` 和 `MultiPointDrawSession` 新增通用 `validateCompletion` hook：

```text
candidate semantic controls
→ materialize Definition defaults
→ Registry.generate()
→ renderable: terminal completion
→ invalid: remain drawing
```

保证：

- 无效 completion 不进入 Store 或 History；
- Enter、double-click 和 fixed maximum 均走相同预检；
- fixed-count 无效最后一点保留为可替换 pointer candidate，不会卡死在最大点数；
- interaction 和 MapLibre 层没有符号 ID 特判。

### Draft continuity

MapLibre draft 采用三级可见策略：

```text
valid current candidate
→ render complete derived symbol

invalid current candidate + prior valid full draft
→ preserve prior valid full draft

invalid current candidate + no prior valid full draft
→ render transient semantic guide line + control points
```

语义引导只进入 `plotlibre-draft` Source，属性包含 `draftKind = semantic-guide`。它不进入 Store、History、handles 或 PlotJSON。

### Store mutation safety

以下路径现在都在变更 Store 前执行完整 Registry generation：

- `PlotLibre.create()`；
- `PlotLibre.replace()`；
- `PlotLibre.importDocument()` 的全部 features；
- interactive completion；
- semantic handle drag candidate acceptance。

Import 会先验证整个文档，再清空当前 Store，避免 partial import。

### Regression coverage

新增或扩展：

```text
tests/interaction.test.mjs
tests/render-reliability.test.mjs
apps/playground/e2e/arrow-visibility-matrix.spec.ts
```

覆盖：

- two-point completion rejection and retry；
- fixed-four completion rejection and replacement；
- invalid create/replace 在 Store/History mutation 前失败；
- 首个完整 draft 无效时显示 semantic guide；
- 后续无效 pointer 保留 last valid full draft；
- 八个 public Arrow 类型逐一验证 draft Source、draft rendered feature、committed Source 和 committed rendered feature。

权威全功能 CI：

```text
Run ID: 30456378912
Node.js 20.19: success
Node.js 22: success
Node tests: 107 passed, 0 failed
Playground typecheck/build: success
handover contract: success
Chromium: 15 passed
```

关键日志：

```text
1..107
# pass 107
# fail 0

15 passed
```

### Files

运行代码：

```text
packages/interaction/src/types.ts
packages/interaction/src/two-point-draw-session.ts
packages/interaction/src/multi-point-draw-session.ts
packages/maplibre/src/interaction.ts
packages/maplibre/src/renderer.ts
packages/maplibre/src/plotlibre.ts
```

测试：

```text
tests/interaction.test.mjs
tests/render-reliability.test.mjs
apps/playground/e2e/arrow-visibility-matrix.spec.ts
```

文档：

```text
README.md
AGENTS.md
docs/handover/LATEST.md
docs/handover/2026-07-29-milestone-005k-arrow-render-reliability.md
```

## Next tasks

1. 等待 PR #19 最新 documentation-inclusive CI 全绿；
2. 更新 PR 描述中的权威 run 和测试数量；
3. 检查 unresolved review threads；
4. 将 PR #19 标记 Ready；
5. squash merge 到 `main`；
6. 确认 `main` 与 merge SHA identical；
7. 核验 main push 已满足 Pages workflow path trigger；
8. Pages 更新后重新测试八类箭头及无效候选的语义引导；
9. 下一开发里程碑仅开始 `arrow.pincer` canonical semantic design。

## Risks and decisions

### Guide is not a valid completed symbol

语义引导表示当前输入可见，不表示完整箭头几何已经合法。用户必须移动或替换控制点，直至 full Registry generation 通过，才能完成。

### Strict topology remains mandatory

本修复没有移除 finite、closed、simple 或 self-intersection 检查。无效几何仍被拒绝；变化仅在于保持交互可见和可恢复。

### Last valid versus current controls

当已有合法完整 draft 后，新的无效 pointer 会保留上一合法形状。这避免闪烁，但当前 pointer 位置可能暂时不反映在完整 polygon 中。若需要显示当前位置，后续可叠加单独 cursor guide，不得以放宽 topology 代替。

### Completion errors are recoverable

拒绝 completion 后 session 保持 drawing。Playground 目前尚未显示详细 validation issue 文本，因此用户主要通过语义引导和未完成状态识别需要调整点位。

### Programmatic API now fails earlier

`create`、`replace` 和 import 对生成阶段异常会在 Store mutation 前直接抛出。这是预期的 fail-closed 行为，调用方应捕获并向 UI 报告。

### Pages verification boundary

仓库连接器可确认 `main`、workflow 配置和 path trigger，但当前环境不能可靠直接打开 GitHub Pages 域名。不得在未独立访问页面时宣称线上响应已经验证。

### Continuation instructions

后续开发者或新对话应：

1. 阅读 `AGENTS.md`；
2. 阅读本 005K handover；
3. 保持 107 Node / 15 Chromium 最低基线；
4. 不删除 semantic-guide fallback；
5. 不允许 session 在 renderability preflight 前 terminal；
6. 不允许不可渲染 feature 进入 Store；
7. 新 public symbol 必须加入 all-arrow visibility matrix 或等价独立测试；
8. 每次完成任务更新 `LATEST.md` 并新增不可变 handover。

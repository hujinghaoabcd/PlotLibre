# PlotLibre Development Handover — Milestone 005K Arrow Rendering Reliability

日期：2026-07-29  
仓库：`hujinghaoabcd/PlotLibre`  
目标分支：`main`  
开发分支：`agent/arrow-render-reliability`  
PR：`#19 Fix cross-symbol arrow rendering reliability`  
Workspace：`0.0.12`  
状态：系统级代码与全功能验证完成；等待最终文档 CI、Ready、合并和 Pages 更新

## Current state

用户报告多个箭头类型存在绘制过程中不显示的问题。根因位于共享交互/渲染链路，而非八个独立符号算法：

```text
transient geometry exception
→ old adapter cleared draft
→ user saw blank canvas
```

当前分支已改为：

```text
valid candidate
→ complete derived arrow draft

invalid candidate + previous valid draft
→ keep previous valid draft

invalid candidate + no previous valid draft
→ semantic guide line + control points
```

Completion 同时采用统一预检：

```text
candidate
→ Registry.generate()
→ valid: complete
→ invalid: remain drawing, no Store/History mutation
```

当前回归基线：

```text
107 Node tests
15 Chromium tests
```

权威功能 CI：

```text
Run ID: 30456378912
Node 20.19: success
Node 22: success
Node tests: 107 passed
Playground typecheck/build: success
handover contract: success
Chromium: 15 passed
```

不可变记录：

```text
docs/handover/2026-07-29-milestone-005k-arrow-render-reliability.md
```

## Completed in this milestone

- 为两点和多点 session 添加通用 `validateCompletion`；
- 无效 completion 保持 active drawing，而非进入 terminal；
- fixed-count 无效最后点保持可替换，不会卡住；
- `create`、`replace`、import、drag 和 interactive completion 在 Store mutation 前执行完整 `Registry.generate()`；
- 暂时无效 pointer 保留 last valid full draft；
- 第一个完整 draft 尚无效时显示 transient semantic guide；
- semantic guide 不进入 Store、History、handles 或 PlotJSON；
- 新增八种 public Arrow 的 draft/committed Source 与 actual-rendered-feature Chromium 矩阵；
- 更新 README 和 AGENTS 基线与强制规则。

主要运行文件：

```text
packages/interaction/src/types.ts
packages/interaction/src/two-point-draw-session.ts
packages/interaction/src/multi-point-draw-session.ts
packages/maplibre/src/interaction.ts
packages/maplibre/src/renderer.ts
packages/maplibre/src/plotlibre.ts
```

主要测试：

```text
tests/interaction.test.mjs
tests/render-reliability.test.mjs
apps/playground/e2e/arrow-visibility-matrix.spec.ts
```

## Next tasks

1. 等待当前 head 的 documentation-inclusive CI 全绿；
2. 更新 PR #19 描述中的最终 run 与测试数量；
3. 检查 unresolved review threads；
4. 将 PR #19 标记 Ready；
5. squash merge 到 `main`；
6. 确认 `main` 与 merge SHA identical；
7. 确认 `packages/**` 与 `apps/playground/**` 变更触发 Pages workflow；
8. Pages 更新后强制刷新并人工复核八种箭头；
9. 下一阶段仅开始 `arrow.pincer` canonical semantic design。

## Risks and decisions

- semantic guide 仅表示输入可见，不表示完整箭头已经合法；
- strict finite/closed/simple/self-intersection validation 未放宽；
- last-valid 策略可能暂时显示上一个合法 polygon，而非当前无效 pointer 的完整形状；
- Playground 尚未显示具体 validation issue 文本，后续可增加错误提示，但不能以放宽 topology 代替；
- programmatic create/replace/import 现在会更早抛出 generation error，这是预期 fail-closed 行为；
- 当前环境不能可靠直接访问 GitHub Pages 域名，线上响应必须由部署记录或用户页面复核确认。

Continuation：后续开发必须先读 `AGENTS.md` 与 005K handover，保持 107/15 最低基线，不删除 semantic-guide fallback，不允许 session 在 renderability preflight 前 terminal，不允许不可渲染 feature 进入 Store。

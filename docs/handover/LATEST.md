# PlotLibre Development Handover — Milestone 005J Double Arrow Centerline Preview

日期：2026-07-29  
仓库：`hujinghaoabcd/PlotLibre`  
目标分支：`main`  
开发分支：`agent/double-arrow-preview-centerline`  
PR：`#18 Fix double-arrow preview near the centerline`  
Workspace：`0.0.12`  
状态：中心线第三点击预览修复已通过完整 Node/Chromium 验证；等待最终文档 CI、合并和 Pages 部署

## Current state

005I 已实现第三次点击立即生成临时第四目标，但存在一个实际盲区：第一目标点位于或接近双箭头前向中轴时，横向距离阈值会使 derivation 返回 `undefined`，因此线上仍可能没有草图。

005J 已将该行为修正为：

```text
click tail A
→ click tail B
→ click objective A（含中轴/近中轴）
→ generate deterministic preview-only lateral spread
→ immediately render transient complete draft
→ pointer movement replaces preview objective
→ fourth click commits real objective B
```

Canonical state 始终保持：

```text
controlPoints[0] = tail edge A
controlPoints[1] = tail edge B
controlPoints[2] = objective A
controlPoints[3] = objective B
```

临时目标不进入 Store、History、handles、PlotJSON 或 completion candidate。

权威功能 CI：

```text
Head: a7eaf59475055d74351b6f390c3c8c455bc3b5d0
Run ID: 30452991571
Node.js 20.19: success
Node.js 22: success
Node tests: 103 passed, 0 failed
Playground typecheck/build: success
handover contract: success
Chromium: 14 passed
```

不可变记录：

```text
docs/handover/2026-07-29-milestone-005j-double-arrow-centerline-preview.md
```

前序记录：

```text
docs/handover/2026-07-29-milestone-005h-double-arrow-implementation.md
docs/handover/2026-07-29-milestone-005h-double-arrow-finalization.md
docs/handover/2026-07-29-milestone-005i-double-arrow-third-click-preview.md
```

## Completed in this milestone

### Centerline blind-spot removal

删除了“横向距离过小就不产生草图”的提前返回。第三点只要具有足够前向距离，即使位于尾缘中点前方的中轴，也会产生临时完整预览。

### Deterministic preview spread

当第三点横向偏移不足时，派生第四目标使用本地米制最小展开：

```text
max(
  1 metre,
  1.25 × tail baseline length,
  min(0.35 × forward distance, 3 × tail baseline length)
)
```

已有足够横向偏移时保持原镜像逻辑；中心线时采用确定性侧向符号。前三个用户点击点完全不变。

### Regression coverage

Node 新增：

```text
tests/double-arrow-preview-centerline.test.mjs
```

覆盖 exact-centerline 与 near-centerline 两种输入，并验证派生四点可通过完整 Definition geometry validation。

Chromium 更新：

```text
apps/playground/e2e/double-arrow-preview.spec.ts
```

第三点改为真实中轴位置，验证无需额外 mousemove 就存在 draft，Store 仍为 0。

当前回归基线：

```text
103 Node tests
14 Chromium tests
```

### Files

```text
packages/symbols/src/double-arrow.ts
tests/double-arrow-preview-centerline.test.mjs
apps/playground/e2e/double-arrow-preview.spec.ts
docs/handover/LATEST.md
docs/handover/2026-07-29-milestone-005j-double-arrow-centerline-preview.md
```

## Validation

```text
npm run typecheck: success
npm test: 103 passed, 0 failed
npm run playground:typecheck: success
npm run playground:build: success
npm run handover:check: success
npm run playground:e2e: 14 passed
```

Node 20.19 与 Node 22 均成功。原有 double-arrow topology、golden、pair swaps、PlotJSON、fourth-click completion、edit/history/undo 回归继续通过。

## Next tasks

1. 确认文档提交后的最终 CI 全绿；
2. 检查 PR #18 unresolved review threads；
3. 将 PR #18 标记 Ready；
4. squash merge 到 `main`；
5. 确认 `main` 与 merge SHA identical；
6. 核验 main push 的 `Deploy Playground to GitHub Pages`；
7. 线上强制刷新后复测第三点位于中轴的场景；
8. 完成 005J 后，下一阶段仅开始 `arrow.pincer` canonical semantic design。

## Risks and decisions

### Preview-only permissiveness

临时草图允许扩大派生目标间距以保证可见反馈，但正式四点提交仍执行原有严格 geometry/topology validation。不得将 fallback 用于修改正式控制点。

### No hidden semantic state

派生第四目标不能持久化、成为 handle、进入 History、PlotJSON 或通过 Enter 完成。

### Local metre geometry

镜像和最小展开必须在 local metre projection 中完成，不得直接在经纬度坐标上偏移。

### Deployment boundary

PR CI 全绿不等于线上 Pages 已更新。只有合并到 `main` 后，Pages workflow 完成部署且 CDN/浏览器缓存刷新，公开页面才会出现修复。

### Scope control

本修复不修改正式 ring topology、参数 defaults、Definition version 或 PlotJSON schema，不并行实现 pincer、route、corridor 或 squad-combat。

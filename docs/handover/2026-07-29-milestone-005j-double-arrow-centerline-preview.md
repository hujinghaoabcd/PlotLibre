# PlotLibre Development Handover — Milestone 005J Double Arrow Centerline Preview

日期：2026-07-29  
仓库：`hujinghaoabcd/PlotLibre`  
目标分支：`main`  
开发分支：`agent/double-arrow-preview-centerline`  
PR：`#18 Fix double-arrow preview near the centerline`  
Workspace：`0.0.12`  
状态：代码、Node 与 Chromium 验证完成；等待文档包含式 CI、Ready、squash merge 和 Pages 部署

## Current state

用户在线上 Playground 继续遇到第三次点击后不显示双箭头草图。进一步检查发现并非只有 Pages 缓存问题：005I 的临时镜像逻辑对第一目标点的横向偏移设置了下限，当第三点位于或接近尾缘中点的前向中轴时，`deriveDoubleArrowDraftControlPoints()` 会返回 `undefined`，MapLibre 因而清空草图。

005J 修复后的交互：

```text
click tail A
→ click tail B
→ click objective A（允许在中轴或近中轴）
→ derive a renderable preview-only objective B
→ immediately render complete transient draft
→ pointer movement replaces the preview objective
→ fourth click commits the real objective B
```

Canonical state 仍为四个显式用户控制点；临时 counterpart 不进入 Store、History、handles 或 PlotJSON。

权威全功能验证：

```text
Head: a7eaf59475055d74351b6f390c3c8c455bc3b5d0
Run ID: 30452991571
Node.js 20.19: success
Node.js 22: success
TypeScript/workspace: success
Node tests: 103 passed, 0 failed
Playground typecheck/build: success
handover contract: success
Chromium: 14 passed
```

## Completed in this milestone

### Root-cause correction

移除了以下导致中心线盲区的逻辑：

```text
abs(lateralDistance) <= threshold
→ return undefined
```

现在仅在尾缘退化、输入非有限或目标前向距离不足时放弃草图。

### Preview-only minimum spread

当第三点位于中轴或横向偏移过小时，草图 derivation 在本地米制坐标中生成确定性的最小横向展开：

```text
minimumPreviewLateralDistance = max(
  1 metre,
  1.25 × tail baseline length,
  min(0.35 × forward distance, 3 × tail baseline length)
)
```

规则：

- 原有三个用户控制点保持不变；
- 只调整派生的第四个草图目标；
- 已有足够横向偏移时继续使用实际偏移；
- 恰好位于中轴时使用确定性侧向符号；
- 全部运算在 local metre projection 中完成；
- 正式四点 geometry、Definition version 和 PlotJSON schema 不变。

### Regression coverage

新增 Node 测试：

```text
tests/double-arrow-preview-centerline.test.mjs
```

覆盖：

- 第三点恰好位于中轴；
- 第三点接近中轴；
- 派生草图包含四点；
- 前三个点逐点保持；
- 派生第四点不同于第一目标；
- 完整 Definition validation 可通过。

Chromium 用例改为真实中心线点击：

```text
apps/playground/e2e/double-arrow-preview.spec.ts
```

验证第三次点击后无额外 `mousemove` 仍有 `plotlibre-draft`，同时 Store size 保持 0。

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

Node 20.19 和 Node 22 均通过。原有双箭头 golden、pair-order invariance、topology、PlotJSON、fourth-click completion、handle edit/history/undo 测试继续全绿。

## Next tasks

1. 运行文档包含式最终 CI；
2. 检查 PR #18 review threads；
3. 将 PR #18 标记 Ready；
4. squash merge 到 `main`；
5. 确认 `main` 与 merge SHA identical；
6. 核验 `Deploy Playground to GitHub Pages` 的 main push 部署；
7. 用户使用强制刷新后复测线上中心线第三点击；
8. 005J 完全收尾后，下一阶段仅开始 `arrow.pincer` semantic design。

## Risks and decisions

### Preview geometry is intentionally more permissive

临时草图可以为可视反馈扩大派生目标间距，但正式提交仍使用四个真实点击点并执行完整严格 topology validation。不得用该 fallback 修改正式 feature controls。

### No hidden semantic state

最小横向展开只存在于 transient draft。不得写入 Store、History、handles、PlotJSON 或 completion candidate。

### Local metre policy

所有镜像和最小展开均使用 local metre projection。不得直接对经纬度执行未记录的欧氏偏移。

### Invalid completion remains fail closed

本修复只扩大第三次点击草图的可显示范围，不放宽正式四点 `buildDoubleArrowRing()`、`isSimpleRing()` 或 Definition validation。

### Deployment boundary

PR CI 全绿只证明构建与浏览器行为正确。线上 Playground 只有在 PR 合并后 Pages 工作流成功部署并且浏览器/CDN 缓存刷新后才会更新。

### Scope control

005J 不修改 ring topology、参数 defaults、Definition version 或 PlotJSON schema，不并行开发 pincer、route、corridor、squad-combat。

# PlotLibre Development Handover — Milestone 005I Double Arrow Third-Click Preview

日期：2026-07-29  
仓库：`hujinghaoabcd/PlotLibre`  
目标分支：`main`  
开发分支：`agent/double-arrow-third-click-preview`  
PR：`#17 Fix double-arrow third-click preview`  
Workspace：`0.0.12`  
状态：第三次点击立即预览修复和全功能验证已完成；等待最终文档 CI、Ready 与合并

## Current state

`arrow.double` 原实现需要第三次点击之后再发生一次 `mousemove`，才会使用 pointer candidate 组成四点草图。用户实际看到的结果是第三次点击完成瞬间没有预览。

当前分支已实现：

```text
click tail A
→ click tail B
→ click objective A
→ immediately render a transient mirrored four-point draft
→ pointer move replaces mirrored objective with live candidate
→ click objective B auto-completes
```

Canonical feature 继续只保存四个用户实际点击的点：

```text
controlPoints[0] = tail edge A
controlPoints[1] = tail edge B
controlPoints[2] = objective A
controlPoints[3] = objective B
```

临时镜像 objective 不进入 Store、History、handles 或 PlotJSON，也不能由 Enter 提交。

权威全功能验证：

```text
Head: 3266e4a7551a96574d521289e8577809f038b847
Run ID: 30451783127
Node.js 20.19: success
Node.js 22: success
Node tests: 101 passed, 0 failed
Playground typecheck/build: success
handover contract: success
Chromium: 14 passed
```

不可变记录：

```text
docs/handover/2026-07-29-milestone-005i-double-arrow-third-click-preview.md
```

前序权威记录：

```text
docs/design/arrow-double-semantic-design.md
docs/algorithms/arrow-double.md
docs/handover/2026-07-29-milestone-005h-double-arrow-implementation.md
docs/handover/2026-07-29-milestone-005h-double-arrow-finalization.md
```

## Completed in this milestone

### Definition-driven draft contract

`PlotDefinition` 新增可选：

```ts
deriveDraftControlPoints?(
  controlPoints: readonly Position[],
): readonly Position[] | undefined;
```

它只生成临时完整草图，不改变 canonical state。

`MultiPointDrawSession` 的草图优先级为：

```text
committed controls + actual pointer candidate
→ 若仍不足 minimumPoints 且无 pointer candidate
→ optional Definition-derived transient controls
```

完成逻辑与草图逻辑保持分离：

- Enter 只使用真实 candidate；
- double-click 只使用真实 candidate；
- maximum completion 只计算真实 click points；
- 三个真实点加一个派生点不能完成。

### Double-arrow mirrored draft

`deriveDoubleArrowDraftControlPoints()` 使用本地米制投影：

```text
tail midpoint
→ tail-baseline lateral axis
→ perpendicular forward axis toward objective A
→ reflect objective A by negating lateral distance
→ unproject temporary objective B
```

退化尾线、目标过近、目标接近镜像轴或非有限输入不会产生派生草图。

### MapLibre integration

`MapLibrePlotInteraction` 通用地接收 Definition callback，没有添加 `arrow.double` ID 特判。

临时草图在 render 前执行完整 Registry validation：

```text
valid → render draft
invalid → clear draft and preserve active session
```

正式 completion 和 Store mutation 仍严格 fail closed。

### Regression coverage

Node：

- 三点 click 后立即返回 transient draft；
- Enter 不提交派生点；
- pointer candidate 替换派生点；
- 第四 click 提交四个 authored points；
- MapLibre draft Source 在第三次 click 后立即有内容；
- Store 在预览期间保持为空。

Chromium：

- 新增独立真实浏览器用例；
- 第三次点击后不发送额外 mousemove；
- 验证 `plotlibre-draft` 已存在；
- 验证 Store size 仍为 0。

当前回归基线：

```text
101 Node tests
14 Chromium tests
```

### Initial CI corrections

首轮 TypeScript 失败来自 `exactOptionalPropertyTypes` 对显式 undefined callback 的限制，已精确修正类型。

首轮 Chromium 失败不是功能失败：草图 Source 已有 8 个瓦片副本，而测试错误地要求 raw count 等于 2。断言改为检查草图存在性，符合项目既有 `querySourceFeatures()` tile-duplicate 政策。

### Files

运行代码：

```text
packages/core/src/types.ts
packages/interaction/src/types.ts
packages/interaction/src/multi-point-draw-session.ts
packages/symbols/src/double-arrow.ts
packages/maplibre/src/interaction.ts
```

测试：

```text
tests/interaction.test.mjs
tests/double-arrow-maplibre.test.mjs
apps/playground/e2e/double-arrow-preview.spec.ts
```

文档：

```text
README.md
AGENTS.md
docs/INTERACTION_MODEL.md
docs/handover/LATEST.md
docs/handover/2026-07-29-milestone-005i-double-arrow-third-click-preview.md
```

## Validation

权威全功能 CI：

```text
Run ID: 30451783127
npm run typecheck: success
npm test: 101 passed, 0 failed
npm run playground:typecheck: success
npm run playground:build: success
npm run handover:check: success
npm run playground:e2e: 14 passed
```

Node 20.19 与 Node 22 均成功。原有 double-arrow topology、golden、pair-swap、PlotJSON、edit/history/undo 测试继续通过。

新增 handover 和本 `LATEST.md` 会触发最终 documentation-inclusive CI；合并前必须确认最新 head 全绿。

## Next tasks

1. 等待 PR #17 最新 documentation-inclusive CI；
2. 更新 PR 描述中的权威 run 和回归数量；
3. 检查 unresolved review threads；
4. 将 PR #17 标记 Ready；
5. squash merge 到 `main`；
6. 确认 `main` 与 merge SHA identical；
7. 核验 main push 的 Pages 部署；
8. 下一阶段仅开始 `arrow.pincer` canonical semantic design。

## Risks and decisions

### Temporary objective is not semantic state

第三次点击后显示的 counterpart 只是 transient draft control。不得持久化、作为 handle、写入 History 或通过 Enter 提交。

### Generic extension point

interaction/MapLibre 层不得添加具体 symbol ID 分支。未来其他符号使用该能力时，必须由自己的 Definition 声明派生规则。

### Local metre geometry

镜像运算必须在 local metre projection 中完成，不得直接在经纬度上做未记录的欧氏反射。

### Invalid draft versus invalid completion

临时 draft 无效时清空并继续绘制；正式 completion 无效时必须拒绝 Store mutation。两类失败不得混淆。

### Tile duplicate policy

`querySourceFeatures()` raw count 不能当作逻辑 feature count。测试应检查存在性或唯一 semantic identity。

### Four-control contract

继续冻结：

```text
minPoints = 4
maxPoints = 4
completeOnDoubleClick = false
no persisted three-point mirror
no fifth branch control
```

### Scope control

本修复不修改 ring geometry、参数 defaults、Definition version 或 PlotJSON schema，不并行实现 pincer、route、corridor、squad-combat。

## Continuation instructions

后续开发者或新对话应：

1. 阅读 `AGENTS.md`；
2. 阅读 005H implementation/finalization 和 005I preview handover；
3. 查看 PR #17 最新 head/CI；
4. 保持 exactly four authored controls；
5. 保持 Definition-derived draft 非持久化；
6. 保持 101 Node / 14 Chromium 基线；
7. 合并后确认 main 和 Pages；
8. 然后只启动 `arrow.pincer` semantic design；
9. 每次完成任务更新 `LATEST.md` 并新增不可变 handover。

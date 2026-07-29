# PlotLibre Development Handover — Milestone 005I Double Arrow Third-Click Preview

日期：2026-07-29  
仓库：`hujinghaoabcd/PlotLibre`  
目标分支：`main`  
开发分支：`agent/double-arrow-third-click-preview`  
PR：`#17 Fix double-arrow third-click preview`  
Workspace：`0.0.12`  
状态：功能修复和全功能 CI 已完成；等待最终文档 CI、Ready 与合并

## Current state

用户报告 `arrow.double` 在第三个点之后没有立即显示预览。原有实现只在第三次点击后再次发生 `mousemove` 时，将鼠标位置作为第四个候选点生成完整草图，因此第三次点击完成的瞬间草图 Source 仍为空。

本里程碑增加 Definition-driven transient draft controls：

```text
第三次点击 objective A
→ Definition 在本地米制坐标中派生临时 objective B
→ 立即显示完整双箭头草图
→ mousemove 用真实 pointer candidate 替换临时 objective B
→ 第四次点击提交真实 objective B
```

Canonical 状态继续严格保持：

```text
controlPoints[0] = authored tail edge A
controlPoints[1] = authored tail edge B
controlPoints[2] = authored objective A
controlPoints[3] = authored objective B
```

临时镜像点不会进入 Store、History、handles 或 PlotJSON，也不能被 Enter 当作完成点。

权威全功能验证：

```text
Head: 3266e4a7551a96574d521289e8577809f038b847
Run ID: 30451783127
Node 20.19: success
Node 22: success
Node tests: 101 passed, 0 failed
Playground typecheck/build: success
handover contract: success
Chromium: 14 passed
```

## Completed in this milestone

### Definition-driven transient draft API

`PlotDefinition` 新增可选方法：

```ts
deriveDraftControlPoints?(
  controlPoints: readonly Position[],
): readonly Position[] | undefined;
```

规则：

- 只用于生成完整临时草图；
- 不能修改已提交 session points；
- 不能参与 Enter、double-click 或 maximum completion；
- 不能进入 Store、History、handles 或 PlotJSON；
- interaction 和 MapLibre adapter 不检查具体 symbol ID。

### MultiPointDrawSession

`MultiPointDrawSessionOptions` 增加同名可选回调。

草图优先级：

```text
1. committed points + distinct pointer candidate
2. 若仍不足 minimumPoints 且没有 pointer candidate：
   调用 Definition deriveDraftControlPoints
```

派生结果必须满足 minimum/maximum point count。回调异常或非法点数只会返回无草图，不会改变 session 状态。

完成逻辑保持独立：

- `Enter` 只检查真实 candidate；
- 三个 authored controls 即使显示派生草图也不能完成；
- 第四次真实点击继续通过 `completeAtMaximum` 自动完成。

### Double-arrow temporary counterpart

新增公开纯函数：

```text
deriveDoubleArrowDraftControlPoints()
```

三点输入：

```text
tail edge A
tail edge B
objective A
```

派生过程：

```text
local metre projection
→ tail midpoint
→ normalized tail-baseline lateral axis
→ perpendicular forward axis, oriented toward objective A
→ decompose objective A into forward/lateral distances
→ negate lateral component
→ unproject mirrored objective B
```

保护条件：

- tail baseline 不能退化；
- objective 必须在尾部前方留有足够距离；
- objective 不能几乎位于镜像轴上；
- 所有投影和反投影必须有限；
- 派生后的完整双箭头仍通过原有严格 Definition geometry validation。

### MapLibre behavior

`MapLibrePlotInteraction.startDraw()` 将 Definition 回调传入通用 multipoint session。

`#applyDrawSnapshot()` 对临时草图执行 materialize + Registry validation：

```text
valid transient draft
→ render to plotlibre-draft

invalid transient draft
→ clear plotlibre-draft
→ keep session and authored controls unchanged
```

正式完成和 Store mutation 仍不捕获或绕过验证错误。

### Tests

修改 Node interaction regression：

- 第三次点击立即返回四点 transient draft；
- Enter 不会提交三点 authored state；
- pointer candidate 替换 transient objective；
- 第四次点击只提交四个真实 authored points。

修改 MapLibre regression：

- 第三个 click 处理完成后，尚未发送额外 mousemove，draft Source 已包含双箭头 fill/outline；
- Store size 仍为 0；
- mousemove 后保持草图；
- 第四 click 自动完成并生成四个 handles。

新增 Chromium regression：

```text
apps/playground/e2e/double-arrow-preview.spec.ts
```

在真实 MapLibre/Vite/Chromium 环境中验证第三次点击后立即存在草图且 Store 仍为空。

### Documentation

更新：

```text
README.md
AGENTS.md
docs/INTERACTION_MODEL.md
docs/handover/LATEST.md
```

新增本不可变文件：

```text
docs/handover/2026-07-29-milestone-005i-double-arrow-third-click-preview.md
```

## Validation

权威 CI：

```text
Run ID: 30451783127
Node.js 20.19: success
Node.js 22: success
npm run typecheck: success
npm test: 101 passed, 0 failed
npm run playground:typecheck: success
npm run playground:build: success
npm run handover:check: success
npm run playground:e2e: 14 passed
```

首轮 CI 发现两个测试/类型问题，均未涉及几何算法放宽：

1. `exactOptionalPropertyTypes` 不允许显式传入 undefined callback；类型定义已精确允许 absent/undefined 回调；
2. Chromium 首轮实际已显示草图，但 `querySourceFeatures()` 返回 8 个瓦片副本，测试错误地要求 raw count 等于 2。断言改为验证草图语义存在且 Store 仍为空，符合既有 tile-duplicate 测试政策。

原有严格双箭头 ring validation、neck-plane trimming、pair-order invariance 和 Definition renderability validation 均未修改。

## Next tasks

1. 等待新增 handover 和 `LATEST.md` 触发的最终 CI；
2. 更新 PR #17 描述中的权威 run 和 101/14 基线；
3. 检查 unresolved review threads；
4. 将 PR #17 标记 Ready；
5. squash merge 到 `main`；
6. 验证 `main` 与 merge SHA identical；
7. 由 main push 触发 Pages 部署；
8. 下一阶段只开始 `arrow.pincer` canonical semantic design。

## Risks and decisions

### Draft is not canonical state

第三次点击后的镜像 objective 只是 transient rendering aid。不得：

- 将其写回 `MultiPointDrawSession.#points`；
- 使用 Enter 提交它；
- 导出到 PlotJSON；
- 显示为 semantic handle；
- 在 History 中创建命令。

### Definition-driven, not symbol-ID-driven

interaction 和 MapLibre 层不得增加：

```text
if plotType === "arrow.double"
```

任何未来需要类似不完整状态草图的符号，应通过 Definition 明确提供 derivation callback，并独立记录其语义边界。

### Projection policy

临时镜像必须使用 local metre projection，不得直接在 longitude/latitude 上执行未记录的欧氏反射。

### Invalid draft policy

临时草图失败属于非终止性预览失败：清空草图并允许用户继续移动或点击。正式 feature completion 仍必须 fail closed。

### Tile duplicates

`querySourceFeatures()` 可返回重复瓦片副本。浏览器测试不得用 raw feature count 代表唯一逻辑 feature 数；应检查存在性或唯一 semantic identity。

### Regression baseline

合并后最低基线：

```text
101 Node tests
14 Chromium tests
```

### Scope control

本 PR 不修改双箭头 canonical control count、几何 ring、参数 defaults 或 PlotJSON schema，也不开始 pincer、route、corridor 或 squad-combat 实现。

## Continuation instructions

后续开发者或新对话应：

1. 阅读 `AGENTS.md`；
2. 阅读 double-arrow design、algorithm、005H implementation/finalization 和本 005I handover；
3. 检查 PR #17 最新 head 和 CI；
4. 保持 exactly-four-authored-control contract；
5. 保持 derived draft controls 非持久化；
6. 保持 101 Node / 14 Chromium 基线；
7. 合并后确认 main 和 Pages；
8. 下一阶段只做 `arrow.pincer` semantic design；
9. 每次完成任务更新 `LATEST.md` 并新增不可变 handover。

# PlotLibre Development Handover — Milestone 005H Double Arrow Implementation

日期：2026-07-29  
仓库：`hujinghaoabcd/PlotLibre`  
目标分支：`main`  
开发分支：`agent/double-arrow-vertical-slice`  
PR：`#15 Add double arrow vertical slice`  
Workspace：`0.0.12`  
状态：完整实现已完成，等待最终文档 CI、Ready 与合并

## Current state

`arrow.double` 已完成完整纵向切片，并作为第八个 built-in Arrow definition 加入 PR #15。

权威全功能提交与验证：

```text
Head: 7aa61473c78c7734ea57b9bbf94f84def6e98bdb
Run ID: 30447472242
Node 20.19: success
Node 22: success
Node tests: 101 passed
Playground typecheck/build: success
/PlotLibre/ base build: success
handover contract: success
Chromium: 13 passed
```

不可变实现快照：

```text
docs/handover/2026-07-29-milestone-005h-double-arrow-implementation.md
```

语义和算法文档：

```text
docs/design/arrow-double-semantic-design.md
docs/algorithms/arrow-double.md
```

当前分支公开符号：

```text
arrow.straight
arrow.fine
arrow.fine.tailed
arrow.assault-direction
arrow.curved
arrow.attack
arrow.attack.tailed
arrow.double
```

## Completed in this milestone

### Canonical contract

```text
controlPoints[0] = tail edge A
controlPoints[1] = tail edge B
controlPoints[2] = objective A
controlPoints[3] = objective B
```

```text
minPoints = 4
maxPoints = 4
completeOnDoubleClick = false
allowPointInsertion = false
allowPointRemoval = false
```

- tail/objective pairs 均为无序对；
- pair swap 不改变 geometry；
- authored order 保持 PlotJSON round trip；
- four exact controls are four handles；
- branch/head/body/bridge/ring vertices are derived；
- no persisted three-point mirror；
- no fifth branch/connection control。

### Geometry and topology

新增 pure：

```text
DoubleArrowFrame
buildDoubleArrowFrame()
buildDoubleArrowRing()
```

几何流程：

```text
local metre projection
→ canonical pair resolution
→ derived shared body and branch
→ two coupled curved wings
→ two exact-tip heads
→ one concave shared inner bridge
→ one connected Polygon ring
```

最终输出必须 finite、closed、counterclockwise、simple。

实现过程中发现 wing miter offset 可能越过 head neck plane。当前实现会在拼接 head 前裁掉 neck plane 前方的派生 shaft boundary points，再对完整 ring 执行 strict self-intersection validation。没有删除或放宽 topology check。

### Public API and Definition

```text
DOUBLE_ARROW_TYPE = "arrow.double"
DoubleArrowParameters
ResolvedDoubleArrowParameters
DEFAULT_DOUBLE_ARROW_PARAMETERS
resolveDoubleArrowParameters()
buildDoubleArrowFrame()
buildDoubleArrowRing()
doubleArrowDefinition 1.0.0
```

Definition validation 运行完整 geometry generation，并在 Store/History mutation 前报告：

```text
INVALID_DOUBLE_ARROW_GEOMETRY
```

### Interaction

没有在 MapLibre 或 interaction 层添加 symbol-ID 特判。现有 schema-driven `MultiPointDrawSession` 自动实现：

```text
click tail A
→ click tail B
→ click objective A
→ fourth pointer candidate shows legal draft
→ click objective B auto-completes
```

四个 semantic handles 均支持 edit、revision、one ReplacePlotCommand 和 undo。

### PlotJSON, Playground and browser

- PlotJSON exactly four controls；
- no derived branch persisted；
- eighth selector option and Nanjing sample；
- visible fixed-four instructions；
- actual committed and rendered feature checks；
- four unique handles；
- objective drag/history/undo；
- workspace/demo `0.0.12`。

### Tests and documentation

- deterministic 86-coordinate golden；
- exact two tails/two tips；
- three pair-swap invariants；
- parameter isolation；
- topology and invalid input policy；
- Registry/render roles；
- PlotJSON；
- Node MapLibre fixed-four tests；
- Chromium draw/render/edit/history/undo；
- clean-room algorithm record；
- README and roadmap updated。

## Validation

权威全功能 CI：

```text
Run ID: 30447472242
Node.js 20.19: success
Node.js 22: success
npm run typecheck: success
npm test: 101 passed, 0 failed
npm run playground:typecheck: success
npm run playground:build: success
npm run handover:check: success
npm run playground:e2e: 13 passed
```

首轮失败仅来自无效测试构造：两个 objectives 同时移到南侧会使 primary direction 同样指向南侧，因此不是 behind-tail case。测试已改为一个 objective 位于派生 forward plane 后；实现本身无需放宽。

最新 README、路线图与交接提交将重新触发 metadata/documentation-only CI。只有最新 head 全绿后才切换 Ready 和合并。

## Next tasks

1. 更新 `AGENTS.md` 与 `docs/PLAYGROUND.md` 为八符号/101/13 基线；
2. 等待 PR #15 最新 CI；
3. 更新 PR 描述为完成状态；
4. 检查 unresolved review threads；
5. 将 PR #15 标记 Ready；
6. squash merge 到 `main`；
7. 验证 main CI；
8. 验证 Pages workflow 与八符号部署；
9. 新增独立 005H Finalization handover；
10. 下一阶段只启动 `arrow.pincer` canonical semantic design。

## Risks and decisions

### Strict topology

不得为提高可渲染范围而移除 `isSimpleRing()` 或绕过完整 Definition validation。双头、双翼和内桥有多种交叉模式，必须 fail closed。

### Four-control version 1.0

三点镜像和第五 connection control 不属于 canonical PlotJSON。未来外部数据迁移或 branch parameter handle 必须使用显式 adapter/version migration。

### Compound identity

`arrow.double` 是一个独立 compound semantic geometry，不是两个 attack arrows 的组合。`arrow.pincer` 也必须独立设计，不能只改名称或 defaults。

### Deployment

PR 尚未合并，因此不能声称公开 GitHub Pages 已经包含第八个符号。必须以 Pages workflow 和在线内容验证为准。

### Immutable history

不要回写：

```text
docs/handover/2026-07-29-milestone-005h-double-arrow-implementation.md
```

合并与部署状态应写入新的 Finalization handover。

## Continuation instructions

后续开发者或对话应：

1. 阅读 `AGENTS.md`；
2. 阅读 double-arrow design、algorithm 和 immutable implementation handover；
3. 查看 PR #15 最新 head/CI；
4. 保持 exactly-four-control contract；
5. 保持 101 Node / 13 Chromium 基线；
6. 合并前不实现其他复杂箭头；
7. 合并后验证 main 和 Pages；
8. 用新文件记录 Finalization；
9. 下一步先设计 `arrow.pincer`，不直接编码多个符号。

# PlotLibre Development Handover — Milestone 005H Double Arrow Implementation

日期：2026-07-29  
仓库：`hujinghaoabcd/PlotLibre`  
目标分支：`main`  
开发分支：`agent/double-arrow-vertical-slice`  
PR：`#15 Add double arrow vertical slice`  
Workspace：`0.0.12`

## Current state

Milestone 005H 已在开发分支完成 `arrow.double` 全纵向切片。功能、类型、几何、Definition、PlotJSON、MapLibre 交互、Playground、Node 测试、Chromium 测试、算法文档与公开文档均已进入 PR #15。

权威全功能提交与 CI：

```text
Head: 7aa61473c78c7734ea57b9bbf94f84def6e98bdb
Run ID: 30447472242
Node 20.19: success
Node 22: success
TypeScript/workspace: success
Node tests: 101 passed
Playground typecheck/build: success
/PlotLibre/ base build: success
handover contract: success
Chromium: 13 passed
```

后续 README、路线图和本交接文件只同步文档，不修改上述功能实现或测试契约。PR 仍为 Draft，等待最新文档提交的最终 CI 与合并。

## Completed in this milestone

### Public API

新增：

```text
DOUBLE_ARROW_TYPE = "arrow.double"
DoubleArrowParameters
ResolvedDoubleArrowParameters
DEFAULT_DOUBLE_ARROW_PARAMETERS
resolveDoubleArrowParameters()
buildDoubleArrowFrame()
buildDoubleArrowRing()
doubleArrowDefinition
```

Definition：

```text
version = 1.0.0
minPoints = 4
maxPoints = 4
completeOnDoubleClick = false
allowPointInsertion = false
allowPointRemoval = false
```

### Canonical semantic model

四个显式控制点：

```text
controlPoints[0] = tail edge A
controlPoints[1] = tail edge B
controlPoints[2] = objective A
controlPoints[3] = objective B
```

约束：

- tail pair 与 objective pair 均为无序对；
- 交换任一对不改变派生几何；
- authored order 仍按原样通过 PlotJSON round trip；
- 两个 tail edges 与两个 objective tips 均为 exact vertices；
- 四个点全部是 semantic handles；
- branch、body、wing samples、heads、bridge 和 Polygon vertices 全部派生；
- PlotJSON 不保存三点镜像或第五个 branch control。

### Pure geometry

新增：

```text
packages/geometry/src/double-arrow-frame.ts
packages/geometry/src/double-arrow.ts
```

`DoubleArrowFrame` 在尾缘中点建立局部米制投影，派生：

```text
tail center and semantic width
objective midpoint and separation
primary direction and left normal
canonical left/right tail/objective roles
branch center
left/right wing starts and curvature controls
shared-body bulges
two exact-tip head frames
shared concave inner bridge
```

最终环顺序：

```text
tailLeft
→ left body
→ left outer wing
→ left head
→ left inner wing
→ shared bridge
→ right inner wing
→ right head
→ right outer wing
→ right body
→ tailRight
→ tailLeft
```

输出必须是一个 connected Polygon，不是两个箭头数组、两个 PlotFeature 或两个 Polygon union。

### Topology fix discovered during implementation

弯曲 wing 的 miter offset 可能把末端派生点推到 head neck plane 前方，使 shaft boundary 穿过 head edge。

修复策略：

1. 以 exact tip 与 neck center 定义 head forward direction；
2. 在拼接 head 前过滤 forward projection 位于 neck plane 前方的派生 boundary points；
3. 保留 exact neck/head/tip vertices；
4. 对完整 compound ring 继续执行严格 self-intersection validation。

未删除或放宽 simple-ring 检查。

### Parameter contract

默认参数：

```text
branchPositionRatio = 0.42
headLengthRatio = 0.22
maximumHeadLengthTailRatio = 2.2
headHalfWidthTailRatio = 0.58
neckHalfWidthTailRatio = 0.18
bodyBulgeRatio = 1.05
innerBridgeRatio = 0.55
tension = 0.18
segmentsPerSpan = 12
miterLimit = 3
minimumTailWidthMeters = 1
maximumTailWidthMeters = 100000
```

### Validation

`doubleArrowDefinition.validate()` 运行与渲染相同的完整 geometry generation，并在 Store/History mutation 前报告：

```text
INVALID_DOUBLE_ARROW_GEOMETRY
```

拒绝：

- control count 不为四；
- coincident 或超范围 tail pair；
- coincident objectives；
- tail/objective pair 未横跨 primary direction；
- objective separation 无法容纳两个独立 heads；
- 任一 objective 位于派生 forward tail plane 后；
- invalid branch、bridge、head、tension 或 offset parameters；
- bridge 退到 tail frame；
- non-finite、degenerate 或 self-intersecting ring。

### Definition, Registry and PlotJSON

新增 `packages/symbols/src/double-arrow.ts`，并加入 built-in catalog，成为第八个公开 Arrow definition。

每个 feature 生成：

```text
1 fill
1 outline
1 hit-area
```

PlotJSON 测试确认：

- exactly four controls round-trip；
- all defaults/overrides round-trip；
- no persisted branch center；
- `definitionVersion = 1.0.0`。

### Interaction and MapLibre

没有新增 `arrow.double` 特判。现有 `MapLibrePlotInteraction` 根据 Definition schema 自动选择 `MultiPointDrawSession`：

```text
click tail A
→ click tail B
→ click objective A
→ pointer candidate produces complete draft
→ click objective B auto-completes at maximum
```

测试覆盖：

- 第四候选点 preview；
- 第四次点击 auto-completion；
- committed Source；
- four semantic handles；
- objective handle drag；
- one `ReplacePlotCommand`；
- revision increment；
- undo restores exact objective。

### Playground and Chromium

新增：

```text
selector option: arrow.double / 双箭头
eighth Nanjing sample
fixed-four visible instructions
actual rendered feature test
four-handle edit/history/undo test
```

Playground 版本：`0.0.12 demo`。

### Tests

新增 deterministic 86-coordinate equatorial golden fixture。

Node 覆盖：

- exact golden；
- exact two tail edges and exact two tips；
- tail-pair swap；
- objective-pair swap；
- both-pairs swap；
- finite/closed/counterclockwise/simple ring；
- branch/bridge/head parameter isolation；
- semantic and parameter rejection；
- Registry roles；
- validation before mutation；
- PlotJSON four-control round trip；
- fixed-four MapLibre drawing；
- objective edit/history/undo。

最终全功能基线：

```text
101 Node tests
13 Chromium tests
```

### Documentation

新增或更新：

```text
docs/algorithms/arrow-double.md
README.md
docs/DEVELOPMENT_PLAN.md
apps/playground/src/template.ts
apps/playground/src/double-arrow-playground.ts
apps/playground/e2e/playground.spec.ts
```

Clean-room 行为参考记录：

```text
sakitam-fdd/ol-plot
revision c919e60b4edeaeca53c08f9552f793b2ae9537f0
packages/ol-plot/src/geometry/Arrow/DoubleArrow.ts
```

仅采用可观察行为和术语，没有复制公式、常量、helper layout、类结构或代码。

## Validation

权威运行：

```text
Run ID: 30447472242
```

结果：

```text
Node 20.19 validate: success
Node 22 validate: success
npm run typecheck: success
npm test: 101 passed, 0 failed
npm run playground:typecheck: success
npm run playground:build: success
npm run handover:check: success
npm run playground:e2e: 13 passed
```

该运行包含：

- all eight selector/sample types；
- committed Source and actual `queryRenderedFeatures()`；
- fourth-click completion；
- exact four controls and four unique handles；
- edit/revision/history/undo；
- Worker entry/shared serving；
- all previous seven-symbol regressions。

首次 CI 的一次失败来自测试用例本身：两个 objectives 同时放在南侧会使派生 primary direction 同样指向南侧，因此并非 behind-tail invalid case。测试改为一个 objective 位于派生 forward plane 后、另一个位于前方。实现无需因此放宽验证。

## Next tasks

1. 更新 `LATEST.md`、`AGENTS.md` 与 `docs/PLAYGROUND.md`；
2. 等待最新 metadata/documentation-only CI 全绿；
3. 更新 PR #15 描述；
4. 检查 review threads；
5. 将 PR #15 标记 Ready；
6. squash merge 到 `main`；
7. 验证合并后的 `main` CI；
8. 验证 Pages workflow 与八符号页面；
9. 新建独立 005H Finalization handover；
10. 后续只启动 `arrow.pincer` canonical semantic design，不直接复制或重命名 `arrow.double`。

## Risks and decisions

### Strict topology remains mandatory

复杂双头/内桥几何存在 shaft/head、wing/wing、bridge/body 多种交叉模式。不得通过删除 `isSimpleRing()`、降低到局部检查或静默返回旧 geometry 解决。

### Four-control versioning

Version 1.0 明确不保存三点镜像或第五个 connection control。未来若增加 branch parameter handle 或外部格式迁移，必须通过 Definition/PlotJSON version migration 实现。

### External DoubleArrow imports

外部库可能持久化 3-point mirrored state 或 5-point connection state。当前核心不猜测其语义；未来应提供显式 adapter，而不是污染 canonical PlotJSON。

### Compound identity

`arrow.double` 是独立 compound symbol。未来 `arrow.pincer` 需要独立设计，不能仅更换名称或 defaults。

### Playground integration

双箭头示例/提示通过独立 `double-arrow-playground.ts` 接入，避免大范围重写现有 Playground controller。CI 已验证类型和浏览器行为。

### Deployment claim

在 PR 合并和 Pages workflow 成功前，不声称公开站点已经发布第八个符号。

## Continuation instructions

后续开发者或对话应：

1. 阅读 `AGENTS.md`；
2. 阅读 `docs/design/arrow-double-semantic-design.md`；
3. 阅读 `docs/algorithms/arrow-double.md`；
4. 阅读本不可变实现交接；
5. 确认 PR #15 最新 CI；
6. 不修改四控制点契约，除非提出 versioned migration；
7. 合并前保持 101 Node / 13 Chromium 基线；
8. 合并后验证 main 与 Pages；
9. 新增独立 Finalization handover，而不是重写本文件；
10. 下一阶段先做 `arrow.pincer` 语义设计，不并行实现其他复杂符号。

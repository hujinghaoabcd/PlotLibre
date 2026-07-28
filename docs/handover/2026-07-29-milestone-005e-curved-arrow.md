# PlotLibre Development Handover — Milestone 005E Curved Arrow

日期：2026-07-29  
仓库：`hujinghaoabcd/PlotLibre`  
目标分支：`main`  
开发分支：`agent/curved-arrow-vertical-slice`  
PR：`#11 Add curved arrow vertical slice`  
基线提交：`89e87e879d1c766eac500796e8a53c88f20f8bbe`  
Workspace：`0.0.9`

## Current state

PlotLibre 当前拥有五个完整内置箭头：

```text
arrow.straight
arrow.fine
arrow.fine.tailed
arrow.assault-direction
arrow.curved
```

本阶段完成第一个真正的多点符号 `arrow.curved`，并把上一阶段的 `MultiPointDrawSession` 接入真实 MapLibre 事件和编辑事务。

当前状态：**功能、几何安全修复、Node/Chromium 验证和对外文档均已完成；等待最终 handover 同步 CI、PR Ready 和合并。**

首个完整绿色运行：

```text
Run ID: 30398030416
validate (20.19): success
validate (22): success
browser: success
Node tests: 65 passed
Playwright: 13 passed
```

## Completed in this milestone

### 1. Clean-room algorithm record

新增：

```text
docs/algorithms/arrow-curved.md
```

语义模型：

```text
controlPoints[0]       = tail center
controlPoints[1..n-2]  = path controls
controlPoints[n-1]     = exact semantic tip
minimum points         = 3
maximum points         = 64
```

公开参考仅用于确认常见外部行为：多点控制平滑路径、末端切向确定箭头方向。实现没有复制参考源码、类结构、参数或常量。

### 2. Curved-arrow geometry

新增：

```text
packages/geometry/src/curved-arrow.ts
```

公开：

```ts
CurvedArrowParameters
ResolvedCurvedArrowParameters
DEFAULT_CURVED_ARROW_PARAMETERS
resolveCurvedArrowParameters()
buildCurvedArrowRing()
projectCurvedArrowControls()
```

几何流程：

```text
WGS84 semantic controls
→ local metre projection
→ consecutive duplicate cleanup
→ Catmull-Rom/Hermite centerline
→ cumulative arc-length measurement
→ head-length trim
→ tapered variable-width shaft offset
→ terminal-tangent arrow head
→ closed counterclockwise ring
→ simple-ring validation
→ WGS84 unprojection
→ exact semantic tip restoration
```

默认参数：

```text
tailWidthRatio       0.065
headLengthRatio      0.22
headWidthRatio       2.3
neckWidthRatio       0.55
tension              0.15
segmentsPerSpan      16
miterLimit           3
minimumWidthMeters   1
maximumWidthMeters   100000
```

### 3. Head/shaft self-intersection fix

初始实现同时保留：

```text
arc-length trim point
+ tangent-defined head.neckCenter
```

两点距离很近但切向略有差异，会形成短反向折线。对该折线执行 offset 后，边界会穿过箭头肩部并产生自交。

修复：

```text
last pre-trim sampled curve point
→ head.neckCenter
```

不再同时保留 trim point。该修复保持末端切向 head、简化连接拓扑，并保留 `isSimpleRing()` 安全验证。

### 4. Explicit self-intersection policy

过紧 S 形、过宽箭身或过度折返路径可能产生自交 Polygon。PlotLibre 不静默接受，也不删除安全检查：

```text
isSimpleRing(localRing) === false
→ RangeError
```

测试同时包含：

- 平滑单向弯曲路径成功；
- 过紧 S 形路径明确拒绝。

### 5. Exact semantic tip

投影/反投影后，派生 ring 中的 head tip 会替换为原始最后控制点：

```text
ring tip === controlPoints.at(-1)
```

保证 PlotJSON 与地图编辑的 canonical tip 不受浮点投影误差影响。

### 6. Symbol definition

新增：

```text
packages/symbols/src/curved-arrow.ts
```

注册：

```text
CURVED_ARROW_TYPE = "arrow.curved"
curvedArrowDefinition
```

Definition：

```text
version: 1.0.0
minPoints: 3
maxPoints: 64
completeOnDoubleClick: true
allowPointInsertion: true
allowPointRemoval: true
```

RenderBundle：

```text
fill
outline
hit-area
```

并更新：

```text
packages/geometry/src/index.ts
packages/symbols/src/catalog.ts
packages/symbols/src/index.ts
```

### 7. Definition-driven session selection

更新：

```text
packages/maplibre/src/interaction.ts
```

Session 选择不写死符号 ID：

```text
minPoints = 2 and maxPoints = 2
→ TwoPointDrawSession

otherwise
→ MultiPointDrawSession
```

读取：

```text
PlotDefinition.controlSchema.minPoints
PlotDefinition.controlSchema.maxPoints
PlotDefinition.controlSchema.completeOnDoubleClick
```

后续 attack、route、corridor 等多点符号可以复用同一边界。

### 8. MapLibre double-click integration

新增事件：

```text
dblclick → DrawSession.doubleClick()
```

在 active drawing 中：

- prevent default；
- stop propagation；
- 关闭 double-click zoom；
- 保存原始 enabled 状态；
- complete/cancel/destroy 后恢复。

更新结构类型：

```text
MapInteractionHandlerLike
MapDoubleClickZoomLike
MapLibreMapLike.doubleClickZoom
```

### 9. Multi-point draft and completion

真实 MapLibre 流程：

```text
click tail
click path control
pointer move third candidate
→ valid draft fill/line

double-click final candidate or Enter
→ PlotFeatureInput
→ Registry validation
→ CreatePlotCommand
→ Store
→ committed Source
→ select feature
→ semantic handles
```

第一、第二个候选点不足以形成合法 `arrow.curved`，因此 draft source 保持为空。

### 10. Multi-point semantic editing

完成后所有语义控制点进入 handles source。

中间控制点拖动：

```text
mousedown handle
→ drag preview in draft Source
→ Store remains unchanged
→ mouseup
→ one ReplacePlotCommand
→ revision +1
→ undo restores original middle control
```

派生曲线样点和 Polygon 顶点不是 handles。

### 11. PlotJSON

`arrow.curved` round trip 保留：

- 全部路径语义控制点；
- definition version；
- 曲线、宽度、head 和 sampling 参数；
- style；
- metadata；
- revision。

不会序列化 Catmull-Rom samples、offset vertices 或 ring vertices。

### 12. Golden fixture

新增：

```text
tests/fixtures/curved-arrow.json
```

Fixture：

```text
controls: [0,0], [0.005,0.004], [0.01,0]
ring: 56 coordinates
exact tip index: 27
```

Golden 在 head/shaft junction 修复后同步更新。

### 13. Node tests

新增：

```text
tests/curved-arrow.test.mjs
```

更新：

```text
tests/maplibre.test.mjs
```

覆盖：

- deterministic golden；
- exact tip；
- finite/closed/CCW/simple ring；
- interior control influence；
- consecutive duplicate cleanup；
- tight self-intersection rejection；
- parameter validation；
- Registry/render roles；
- PlotJSON full path；
- Fake MapLibre multipoint draft；
- dblclick completion；
- double-click zoom restoration；
- cancel restoration；
- interior handle drag；
- one command + undo。

最终：

```text
65 tests passed
0 failed
```

### 14. Playground

更新：

```text
apps/playground/src/template.ts
apps/playground/src/playground-app.ts
apps/playground/e2e/playground.spec.ts
```

功能：

- selector 第五项“曲线箭头”；
- v0.0.9 badge；
- 五类南京示例；
- 四控制点平滑曲线示例；
- 多点说明；
- double-click/Enter completion；
- Backspace/Delete 退点；
- semantic-handle editing。

### 15. Browser tests

Chromium 验证：

- 五个 selector option；
- 五类南京示例；
- committed Source 包含 `arrow.curved`；
- actual fill/line rendered feature；
- third-candidate draft；
- double-click completion；
- double-click zoom disable/restore；
- 3 semantic controls；
- derived ring 与默认 tension；
- interior semantic handle drag；
- one ReplacePlotCommand；
- undo restore；
- Worker entry/shared modules。

最终：

```text
13 Playwright tests passed
```

### 16. MapLibre Source duplicate handling

真实 E2E 发现 `querySourceFeatures()` 可能因瓦片返回同一 handle 的多个副本。因此不能把 raw Feature count 当作语义 handles 数量。

测试改为：

```text
filter plotId
→ collect handleIndex
→ Set(handleIndex)
→ assert unique semantic count
```

Store `controlPoints.length` 是权威语义数量。

### 17. Documentation

新增：

```text
docs/algorithms/arrow-curved.md
docs/handover/2026-07-29-milestone-005e-curved-arrow.md
```

更新：

```text
README.md
AGENTS.md
docs/INTERACTION_MODEL.md
docs/PLAYGROUND.md
docs/DEVELOPMENT_PLAN.md
docs/handover/LATEST.md
```

## Validation

### Failed iterations that improved the implementation

#### Run `30396333108`

发现 head/shaft junction 自交。没有关闭 `isSimpleRing()`，而是修正几何连接。

#### Run `30396748713`

发现测试中的四点 S 形路径本身过紧。将正常样例改为平滑单向曲线，并增加 explicit rejection test。

#### Run `30397031775`

65 项 Node 测试通过；修复只读 PlotLibre `Position` 传入 MapLibre mutable tuple 的 E2E TypeScript 边界。

#### Run `30397221999`

真实 Chromium 暴露 E2E 轨迹过紧，第三候选点无法生成合法 draft。

#### Run `30397745011`

曲线成功绘制、选中和恢复 zoom；暴露 raw `querySourceFeatures()` handle count 存在 tile duplicate。

### Authoritative complete green run

```text
Run ID: 30398030416
```

结果：

```text
validate Node 20.19: success
validate Node 22: success
TypeScript/workspace: success
Node tests: 65 passed
Playground typecheck: success
/PlotLibre/ build: success
handover contract: success
Chromium: 13 passed
Worker modules: success
actual curved rendered feature: success
interior semantic edit + undo: success
```

Required commands：

```bash
npm run typecheck
npm test
npm run playground:typecheck
npm run playground:build
npm run handover:check
npm run playground:e2e
```

## Architectural decisions

1. `arrow.curved` semantic source is the user path controls, not sampled curve or Polygon vertices.
2. Catmull-Rom/Hermite centreline reuses the shared geometry foundation.
3. Width transitions are based on cumulative arc length, not control-point index.
4. Head direction uses terminal centerline tangent.
5. Exact final semantic control is restored as the tip.
6. Self-intersecting rings are rejected, not silently returned.
7. Session selection is definition-driven and symbol-ID independent.
8. Multi-point double-click zoom state is restored after every terminal path.
9. Every semantic path control is editable; derived vertices are not.
10. Source-query duplicate Features are deduplicated by semantic identity in E2E.

## Known limitations

- no visible centerline guide before the third candidate point;
- no detailed UI validation message when a candidate self-intersects;
- no committed control-point insertion/removal yet despite capability metadata;
- no touch-specific finish gesture;
- no snapping or angular constraints;
- local projection remains unsuitable for very large multi-country arrows;
- extreme winding paths may require narrower width or fewer controls;
- no parameter handles for tension, width or head length;
- only Chromium is currently in the browser matrix.

## Next tasks

### Merge and deploy

1. run final handover synchronization CI;
2. mark PR #11 Ready;
3. merge PR #11 to `main`;
4. verify Pages deployment and five-symbol public Playground;
5. create a fresh branch from latest `main`.

### Milestone 005F: `arrow.attack`

1. research public attack-arrow semantics and record clean-room provenance;
2. define semantic control points and completion rules;
3. prove structural distinction from `arrow.curved`;
4. extract a reusable multi-point body/frame only if contracts remain independent;
5. implement attack-specific body width, head/neck and tail strategy;
6. preserve existing curved-arrow golden fixture;
7. add golden, degenerate and self-intersection tests;
8. add Definition and PlotJSON full-path round trip;
9. reuse MultiPointDrawSession and all semantic handles;
10. add Playground selector/sample/instructions;
11. add Chromium drawing, rendering and interior edit tests;
12. update immutable handover.

Do not implement `arrow.attack.tailed`, double, pincer, route or corridor in parallel.

## Risks and decisions

### Self-intersection versus permissive rendering

Returning a self-intersecting Polygon makes fill and hit behavior engine-dependent. The current policy prefers explicit rejection. Future UI may offer validation messages, simplification or width suggestions, but the geometry function remains strict.

### Local projection scope

The current model is appropriate for short-to-regional tactical graphics. Large-distance symbols need an explicit geodesic/segmented projection policy rather than silently extending this approximation.

### Browser double-click order

Native double-click includes preceding click events. `MultiPointDrawSession` remains responsible for final-point de-duplication even though the adapter suppresses default zoom.

### Source query duplication

MapLibre source queries can return tile duplicates. Tests and future diagnostics must use semantic identifiers rather than raw counts.

### Shared body extraction

`arrow.attack` may benefit from a shared multi-point frame, but extraction must not retroactively change `arrow.curved` golden output without a deliberate version/migration decision.

## Continuation instructions

A new developer or conversation should:

1. read `AGENTS.md`;
2. read `docs/INTERACTION_MODEL.md`;
3. read `docs/algorithms/arrow-curved.md`;
4. read this handover;
5. verify PR #11 final CI;
6. merge before starting attack geometry;
7. create a fresh branch from latest `main`;
8. keep attack semantics structurally distinct from curved arrow;
9. preserve all five existing symbol regressions;
10. update `LATEST.md` and add the next immutable handover.

# PlotLibre Development Handover — Milestone 005D MultiPoint Session Foundation

日期：2026-07-29  
仓库：`hujinghaoabcd/PlotLibre`  
目标分支：`main`  
开发分支：`agent/multipoint-draw-session`  
PR：`#10 Add reusable multipoint draw session foundation`  
基线提交：`dbee8938e1a522d6cb6d9e78c9518b28d1eb04e9`  
Workspace：`0.0.8`

## Current state

主线已经拥有四个完整两点箭头：

```text
arrow.straight
arrow.fine
arrow.fine.tailed
arrow.assault-direction
```

本阶段不实现新符号，而是先交付第一个多点符号 `arrow.curved` 所需的通用引擎无关交互基础：

```text
DrawSession.doubleClick()
MultiPointDrawSession
```

当前状态：**实现、回归修复、文档和自动化验证已完成；等待 PR #10 最终同步 CI、Ready 和合并。**

权威修复后 CI：

```text
Run ID: 30393425458
validate (20.19): success
validate (22): success
browser: success
Node tests: 54 passed
```

## Completed in this milestone

### 1. DrawSession contract

更新：

```text
packages/interaction/src/types.ts
```

公共协议新增：

```ts
doubleClick(position: Position): DrawSessionSnapshot;
```

所有 DrawSession 现在显式处理：

```text
click
pointerMove
doubleClick
keyDown
cancel
snapshot
```

这避免 MapLibre adapter 对某一具体 Session 使用运行时类型判断。

### 2. TwoPointDrawSession compatibility

更新：

```text
packages/interaction/src/two-point-draw-session.ts
```

`doubleClick(position)` 复用普通 click completion，因此现有四种两点符号保持同一语义：

```text
click tail
doubleClick tip
→ completed two-point feature
```

没有改变原有 click、Enter、Escape、Backspace/Delete 行为。

### 3. MultiPointDrawSession

新增：

```text
packages/interaction/src/multi-point-draw-session.ts
```

公开：

```ts
MultiPointDrawSession
MultiPointDrawSessionOptions
```

配置：

```ts
minimumPoints: integer >= 3
maximumPoints?: integer >= minimumPoints
completeAtMaximum?: boolean // default true
```

并支持：

- 单击追加语义控制点；
- 忽略与最后一点完全重合的点击；
- pointer move 生成临时候选点；
- 只有达到 `minimumPoints` 才产生 draft；
- Enter 使用当前候选点完成；
- 双击使用终点完成；
- 双击不重复最后一个已提交点；
- Backspace/Delete 每次只移除一个已提交点；
- Escape 取消；
- 达到 `maximumPoints` 时可自动完成；
- 已完成/已取消 Session 忽略后续输入；
- 所有输出控制点、parameters、style、metadata 均复制。

### 4. Draft validity policy

定义：

```text
candidate = committed points + distinct pointer preview
```

只有：

```text
candidate.length >= minimumPoints
```

时才返回 `draft`。

这样在曲线箭头的第一个和第二个点击阶段，不会向 Registry 或 renderer 发送无效三点符号。

### 5. Enter completion

Enter 使用：

```text
committed points + current distinct pointer preview
```

达到最小点数后一次生成最终 `PlotFeatureInput`。

示例：

```text
click A
click B
pointerMove C
Enter
→ completed [A, B, C]
```

### 6. Double-click completion

最终实现使用不可变候选点数组：

```text
candidate = clone(committed points)
if final point is distinct and capacity remains:
    candidate += final point
complete(candidate)
```

该设计解决：

1. 浏览器双击前通常已经产生 click 事件，不能重复最后一点；
2. completion 不应在读取内部数组时同步修改同一数组；
3. 直接 `click A → click B → doubleClick C` 必须完成三点 Feature。

### 7. Drawing-state point removal

Backspace/Delete：

```text
3 points → 2 points → 1 point → ready/0 points
```

这是尚未提交 Feature 的 Session 内部撤销，不进入 `CommandHistory`。

### 8. Maximum point policy

- `maximumPoints` 未设置：可变点数；
- 设置后拒绝超出容量的 click/preview；
- `completeAtMaximum = true`：达到容量自动完成；
- completion 防御性裁剪至最大点数；
- 适合未来固定三点、四点或五点符号复用。

### 9. Exports and workspace

更新：

```text
packages/interaction/src/index.ts
package.json
```

Workspace：

```text
0.0.7 → 0.0.8
```

### 10. Tests

更新：

```text
tests/interaction.test.mjs
```

新增：

```text
tests/multipoint-regression.test.mjs
```

覆盖：

- 两点 Session 的 shared double-click contract；
- 最小点数前无 draft；
- 最小点数候选 draft；
- parameters 保留；
- Enter 使用 preview 完成；
- 双击不重复最后一点；
- 直接双击第三点完成回归；
- Backspace/Delete 逐点回退；
- Escape；
- minimum/maximum 参数校验；
- 最大点数自动完成；
- terminal session immutability。

最终 Node 测试：

```text
54 passed
0 failed
```

### 11. Documentation

更新：

```text
docs/INTERACTION_MODEL.md
docs/handover/LATEST.md
```

新增：

```text
docs/handover/2026-07-29-milestone-005d-multipoint-session.md
```

交互文档现在明确：

- 两点与多点 Session 的统一协议；
- draft semantic validity；
- click、Enter、double-click、point removal；
- maximum point count；
- MapLibre 下一步 wiring；
- `arrow.curved` 的纵向切片要求。

## Validation

### Initial run

首轮验证发现一处真实状态机问题：

```text
click A
click B
doubleClick C
```

测试期望 completed，但双击完成路径在内部可变数组上存在隐式状态耦合。

没有放宽测试。修复采用不可变候选数组，并增加独立回归文件。

### Authoritative fixed run

```text
Run ID: 30393425458
```

结果：

- Node 20.19：success；
- Node 22：success；
- TypeScript/workspace build：success；
- 54 Node tests：success；
- Playground typecheck：success；
- `/PlotLibre/` build：success；
- handover contract：success；
- Chromium existing regression suite：success；
- Worker entry/shared modules：success；
- four existing arrows rendered-feature regression：success。

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

1. Multi-point behavior belongs in `@plotlibre/interaction`, not MapLibre event code.
2. `minimumPoints` must be at least 3; two-point symbols continue using their specialized Session.
3. Drafts must be semantically valid before Registry generation.
4. Drawing-state point removal is not persistent undo and does not enter CommandHistory.
5. Double-click completion uses an immutable candidate array.
6. Fixed-count multi-point symbols reuse `maximumPoints` rather than requiring separate Session classes.
7. The MapLibre adapter will instantiate Session types from `PlotDefinition.minPoints/maxPoints`, not from hard-coded symbol IDs.
8. `arrow.curved` must not be added until MapLibre dblclick wiring and double-click zoom suppression are implemented.

## Known limitations

- MapLibre adapter still starts only exact two-point definitions;
- MapLibre `dblclick` is not wired to DrawSession yet;
- active drawing does not yet disable default MapLibre double-click zoom;
- no curved-arrow geometry or definition exists;
- no pre-minimum centerline guide is rendered;
- no touch-specific multi-point completion gesture;
- selected multi-point features are not yet browser-tested for dragging all handles;
- no snapping or angular constraints.

## Next tasks

### Merge foundation

1. run final documentation/handover synchronization CI;
2. mark PR #10 Ready;
3. merge PR #10 to `main`;
4. verify Pages regression deployment if triggered;
5. create a new branch from latest `main`.

### Milestone 005E: `arrow.curved`

1. research public curved-arrow behavior and record clean-room provenance;
2. define semantic points: start, one or more path controls, tip;
3. implement projection-aware curved centerline generation;
4. resample centerline by cumulative length;
5. create variable-width left/right offsets;
6. construct a tangent-aligned reusable head;
7. validate closed finite simple ring;
8. add deterministic golden and degenerate tests;
9. add `arrow.curved` PlotDefinition and PlotJSON round trip;
10. instantiate `MultiPointDrawSession` from definition point constraints;
11. wire MapLibre `dblclick`;
12. disable/restore default double-click zoom during active drawing;
13. support Enter, Escape and point removal;
14. display all semantic control handles;
15. add Playground selector/sample/instructions;
16. add Chromium draw, double-click, handle editing and rendered-feature tests;
17. update immutable handover.

## Risks and decisions

### Browser event order

A native double-click is commonly preceded by click events. The MapLibre adapter must avoid duplicating the final coordinate and should let `MultiPointDrawSession` own de-duplication.

### Double-click zoom

MapLibre's default double-click zoom conflicts with completion. It must be disabled only while a multi-point session is active, then restored on complete or cancel.

### Draft visibility before minimum points

No valid Polygon exists before the third candidate point. A future centerline guide may use a separate guide RenderBundle, but the current draft source must not contain an invalid semantic feature.

### Variable point count

`arrow.curved` should permit more than three controls. The Definition and Session must not silently truncate arbitrary path controls unless an explicit maximum is selected and documented.

## Continuation instructions

A new developer or conversation should:

1. read `AGENTS.md`;
2. read `docs/INTERACTION_MODEL.md`;
3. read this handover;
4. verify PR #10 latest CI;
5. merge the foundation before starting curved geometry;
6. create a fresh branch from `main`;
7. implement MapLibre Session selection generically from definition constraints;
8. keep all multi-point semantic points in PlotJSON;
9. add both Node and real Chromium tests;
10. update `LATEST.md` and add the next immutable handover.

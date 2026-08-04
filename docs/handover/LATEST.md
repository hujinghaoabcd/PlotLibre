# PlotLibre Development Handover — Milestone 007A Merged / 007B Design Next

日期：2026-08-04  
仓库：`hujinghaoabcd/PlotLibre`  
当前 `main`：`04dca0b120b1440afb49a300eeee92faf6644a7d`  
已合并 PR：`#38 Add ordered selection and atomic batch editing`  
合并方式：Squash and merge  
最终实现 head：`2d499a1cb122abbf6fce7548ec32f1b0031dd8f2`  
最终 CI：`#409 / 30906467230`  
Post-merge 分支：`agent/007a-post-merge-finalization`  
Workspace：`0.0.21`  
状态：Milestone 007A 已合并；当前仅同步真实 squash 状态，下一阶段为 007B box/lasso selection design

## Current state

```text
workspace:          0.0.21
MapLibre GL JS:     6.0.0
Node.js:            20.19+
public symbols:     19 (14 Arrow + 1 Line + 4 Area)
Node tests:         219
Chromium tests:     30
MapLibre Sources:   4
MapLibre Layers:    10
main SHA:           04dca0b120b1440afb49a300eeee92faf6644a7d
merged PR:          #38
squash merge SHA:   04dca0b120b1440afb49a300eeee92faf6644a7d
validated head:     2d499a1cb122abbf6fce7548ec32f1b0031dd8f2
validated CI:       #409 / 30906467230
next milestone:     007B design
```

007 staging：

```text
007A ordered selection + atomic Store + batch delete + local translation — merged
007B box/lasso selection — next design slice
007C local rotation + positive uniform scale — deferred
007D groups/locks/visibility/z-order after PlotJSON migration design — deferred
```

## Completed in this milestone

### Selection

- engine-independent ordered `SelectionController`；
- replace/add/subtract/toggle/clear/make-primary/restore/reconcile；
- acquisition-order `selectedIds` and final-id Primary；
- immutable monotonic snapshots；
- one event per effective operation and no event for no-op；
- Store remove/clear reconciliation；
- selection excluded from PlotJSON and feature revision；
- backward-compatible `select()` and `selectedId` aliases；
- complete ordered `selectedIds` public access。

### Atomic Store and commands

- staged `PlotStore.applyTransaction()` for add/replace/remove/exact order；
- no partial mutation and one batch event；
- exact document-order restoration；
- post-commit listener exception isolation through `onListenerError`；
- selection-aware `BatchEditCommand`；
- exact execute/undo/redo feature revision replay；
- one explicit final selection restoration without intermediate reconciliation events。

### MapLibre integration

- independent `plotlibre-selection` source；
- selection line and point layers；
- four Sources and ten Layers；
- lightweight overlays for all selected objects；
- authored handles and Definition guides only for Primary；
- plain/Shift/Ctrl-Cmd/Alt selection semantics；
- preserved/disabling/restoring MapLibre box zoom for Shift additive selection；
- style reload restoration for committed、selection、draft、handles and guides。

### Batch delete and translation

- `plot.removeSelected()` and Delete/Backspace batch semantics；
- one command and one Store transaction per batch delete；
- undo restores exact values、order、selection and Primary；
- one shared local projection and metre delta for whole-selection translation；
- Store unchanged during preview；
- Escape cancellation；
- any invalid member rejects the complete batch；
- parameters/style/metadata preserved；
- one completed gesture creates one History entry。

### Playground, tests and documentation

- selection count and Primary display；
- Primary-only style editing；
- batch delete and translation/rejection status；
- workspace and Playground badge `0.0.21`；
- 219 Node tests；
- 30 real Chromium tests；
- README、AGENTS、development plan、Playground、interaction model、design/algorithm indices synchronized；
- immutable 007A implementation handover added；
- PR #38 marked Ready only after exact current-head CI and zero review threads；
- PR #38 squash merged with expected head SHA。

## Validation

Final PR validation：

```text
GitHub Actions run: 30906467230 (#409)
validated head:     2d499a1cb122abbf6fce7548ec32f1b0031dd8f2
Node 20.19:         success
Node 22:            success
Node tests:         219 passed / 0 failed
Playground build:   success
handover contract:  success
Chromium tests:     30 passed / 0 failed
unresolved threads: 0
PR state before merge: Ready
merge method:       squash
squash SHA:         04dca0b120b1440afb49a300eeee92faf6644a7d
```

Real Chromium coverage includes rendered-feature Shift selection, body translation, unchanged Store during preview, one-command commit, exact undo/redo, Escape rollback and batch Delete order/Primary restoration.

This post-merge branch changes documentation only and must pass the unchanged 219/30 baseline before merge.

## Next tasks

1. complete this documentation-only post-merge synchronization；
2. open a Draft finalization PR against `main`；
3. pass Node 20.19、Node 22、219 Node、30 Chromium、build and handover checks；
4. confirm zero unresolved review threads；
5. mark Ready and Squash and merge；
6. delete merged branches if tooling permits；
7. create 007B design branch from the final latest `main`；
8. freeze screen-space box selection semantics；
9. freeze simple lasso semantics and self-intersection failure policy；
10. define `plotId` de-duplication and deterministic Store ordering；
11. define spatial-index boundary before performance claims；
12. keep rotation/scale、groups/locks、snapping and new symbols outside 007B。

## Risks and decisions

- selection remains transient and excluded from PlotJSON；
- only Primary exposes authored handles/guides and accepts style editing；
- batch mutation remains all-or-nothing；
- listener errors after commit are isolated rather than rolled back；
- exact document order is part of undo correctness；
- translation remains local-metre only and rejects antimeridian/high-latitude/large-extent input；
- whole-object editing transforms authored controls, never generated vertices；
- MapLibre box zoom is temporarily disabled for Shift selection and restored on destroy；
- 007B must remain a design-first slice；
- performance at 100/1,000/10,000 features remains a measured benchmark task；
- packages remain `UNLICENSED` and workspace/package versions remain uncoordinated；
- production bundle still needs code splitting；
- source/build/deploy/live verification remain separate claims；
- the connector currently does not expose branch deletion in this session, so merged feature branches may require manual cleanup。

Continuation：finish the 007A post-merge documentation PR, then begin 007B design from final `main`. Do not add runtime to the finalization branch。

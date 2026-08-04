# PlotLibre Development Handover — Milestone 007A Implemented / Final PR Validation Next

日期：2026-08-04  
仓库：`hujinghaoabcd/PlotLibre`  
Base `main`：`780c719860e2371fb41fe9db83685157181420e2`  
当前分支：`agent/007a-selection-batch-translation`  
当前 PR：`#38 Add selection and atomic batch editing foundation`  
Workspace：`0.0.21`  
状态：007A runtime、Playground、测试和权威文档已实现；下一步是最终 current-head CI、Ready review 与 squash merge

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
PR:                 #38 (Draft)
branch:             agent/007a-selection-batch-translation
base main:          780c719860e2371fb41fe9db83685157181420e2
runtime tested head:07449e7fda66069b148fa08c865b209d7dc365a3
runtime CI:         #398 / 30904843935
```

The runtime head above passed the complete validation matrix. Version and documentation commits moved the branch afterward, so PR #38 is not yet Ready and must receive a new full current-head CI run.

007 staging remains:

```text
007A ordered selection + atomic Store + batch delete + local translation
007B box/lasso selection
007C local rotation + positive uniform scale
007D groups/locks/visibility/z-order after PlotJSON migration design
```

## Completed in this milestone

### Selection

- implemented engine-independent ordered `SelectionController`；
- added replace/add/subtract/toggle/clear/make-primary/restore/reconcile operations；
- preserved acquisition order and final-id Primary invariant；
- added immutable snapshots and one-event/no-op behavior；
- added Store remove/clear reconciliation；
- kept selection outside PlotJSON and feature revision；
- preserved backward-compatible `select()` and `selectedId` aliases；
- exposed complete ordered `selectedIds`。

### Atomic Store and commands

- implemented staged `PlotStore.applyTransaction()` for add/replace/remove/exact order；
- guaranteed no partial mutation and one batch event；
- isolated post-commit listener exceptions through `onListenerError`；
- implemented exact-order restoration；
- implemented selection-aware `BatchEditCommand`；
- ensured execute/undo/redo replay exact feature revisions；
- suspended intermediate selection reconciliation during batch command mutation。

### MapLibre integration

- added independent `plotlibre-selection` source；
- added selection line and point layers；
- increased renderer baseline to four Sources and ten Layers；
- kept authored handles and Definition guides Primary-only；
- implemented plain/Shift/Ctrl-Cmd/Alt selection semantics；
- resolved Shift conflict by preserving/disabling/restoring MapLibre box zoom；
- restored selection, drafts, handles and guides after style reload。

### Batch delete

- added `plot.removeSelected()`；
- connected Delete/Backspace and Playground batch-delete action；
- one action creates one `BatchEditCommand` and one Store transaction；
- undo restores exact feature values, document order, selected ids and Primary；
- redo restores exact after-state。

### Whole-selection translation

- added shared local-metre projection utilities；
- one order-independent projection origin per selection；
- one common metre delta applied to every authored control；
- Store remains unchanged during transient preview；
- pointer release commits one atomic command；
- Escape cancels without History mutation；
- invalid one-member candidate rejects the complete batch；
- parameters/style/metadata remain unchanged；
- handle drag retains priority and dragPan lifecycle is restored。

### Playground and documentation

- added selection count and Primary display；
- made style editing Primary-only；
- added batch delete and body-translation instructions/status；
- updated workspace and badge to `0.0.21`；
- updated README、AGENTS、development plan、Playground、interaction model、design and algorithm indices；
- added immutable `2026-08-04-milestone-007a-selection-batch-translation.md`。

## Validation

Runtime validation evidence：

```text
GitHub Actions run: 30904843935 (#398)
validated head:     07449e7fda66069b148fa08c865b209d7dc365a3
Node 20.19:         success
Node 22:            success
Node tests:         219 passed / 0 failed
Playground build:   success
handover contract:  success
Chromium tests:     30 passed / 0 failed
```

The 30 Chromium tests include real rendered-feature selection, Shift additive selection, whole-selection body drag, transient preview with unchanged Store, one-command commit, exact undo/redo, Escape rollback and batch Delete order/Primary restoration.

Required final validation：

```text
exact latest PR head
Node 20.19 success
Node 22 success
219 Node tests passed
Playground /PlotLibre/ build success
handover contract success
30 Chromium tests passed
unresolved review threads = 0
```

## Next tasks

1. update PR #38 body from initial-stage wording to complete 007A scope；
2. inspect exact current head SHA；
3. trigger and complete full current-head CI；
4. fix only evidence-backed failures, if any；
5. inspect all review threads and resolve actionable items；
6. confirm zero unresolved threads；
7. mark PR #38 Ready for review；
8. Squash and merge using `expected_head_sha`；
9. delete the merged branch if tooling permits, otherwise disclose the limitation；
10. verify new `main` and create a documentation-only finalization PR if actual squash SHA/deployment state must be recorded；
11. begin 007B design only from the latest merged `main`。

## Risks and decisions

- current full-green evidence applies to the runtime head, not later documentation commits；
- selection remains transient and excluded from PlotJSON；
- only Primary exposes authored handles/guides and accepts style editing；
- batch operations are all-or-nothing；
- listener exceptions after commit are isolated rather than rolled back；
- exact document order is part of undo correctness；
- translation is local-metre only and rejects antimeridian/high-latitude/large-extent selections；
- translation modifies authored controls, never generated vertices；
- MapLibre box zoom is temporarily disabled to reserve Shift selection and is restored on destroy；
- 007A excludes box/lasso、rotation/scale、groups、locks、visibility、z-order、snapping and new symbols；
- performance at 100/1,000/10,000 features remains an explicit measured benchmark task, not a completed guarantee；
- packages remain `UNLICENSED` and workspace/package versions remain uncoordinated；
- production bundle still needs code splitting；
- Pages live verification must be distinguished from source/build/CI success。

Continuation：finish PR #38 current-head validation and merge discipline. Do not begin 007B runtime on this branch。

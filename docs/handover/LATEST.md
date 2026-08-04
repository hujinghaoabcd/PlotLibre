# PlotLibre Development Handover — Milestone 007 Professional Editing Design Active

日期：2026-08-04  
仓库：`hujinghaoabcd/PlotLibre`  
设计基线：`main@4ce59d189b65c8257bf49beabc308a4020249cd0`  
活跃分支：`agent/007-professional-editing-design`  
Workspace：`0.0.20`  
状态：006J implementation 与 post-merge finalization 已合并；007 正在冻结 selection、batch transaction 和 transform 语义，尚无 runtime changes

## Current state

```text
workspace:          0.0.20
MapLibre GL JS:     6.0.0
Node.js:            20.19+
public symbols:     19
Arrow Definitions:  14
Line Definitions:   1
Area Definitions:   4
Node tests:         184
Chromium tests:     28
base main SHA:      4ce59d189b65c8257bf49beabc308a4020249cd0
active branch:      agent/007-professional-editing-design
active phase:       documentation, state and transaction design only
```

Current runtime remains single-selection and single-feature command oriented. The design branch does not change code, tests, package versions, Playground or public runtime APIs.

Frozen implementation staging candidate：

```text
007A selection + atomic batch commands + local translation
007B box/lasso selection
007C local rotation + positive uniform scale
007D groups/locks/visibility/z-order after PlotJSON migration design
```

## Completed in this milestone

- inspected current single `selectedId` interaction model；
- inspected single-operation PlotStore events and commands；
- identified Store-listener exception risk that can mutate state without a history entry；
- froze engine-independent ordered `SelectionSnapshot`；
- froze acquisition order and primary-selection invariant；
- froze replace/add/subtract/toggle/clear/reconcile semantics；
- froze backward-compatible `selectedId` as primary-selection alias；
- froze selection as transient and excluded from PlotJSON；
- froze primary-only authored handles and secondary selection overlays；
- froze staged atomic `PlotStore.applyTransaction`；
- froze one immutable batch event and exact document-order restoration；
- froze listener-error isolation through `onListenerError`；
- froze selection-aware `BatchEditCommand` before/after snapshots；
- froze batch delete execute/undo/redo behavior；
- froze 007A local-metre whole-object translation over authored controls；
- froze one projection/delta for the complete selection；
- froze all-feature Registry preflight and all-or-nothing mutation；
- froze transform drag arbitration、threshold、Escape and zero-movement behavior；
- froze structured transform rejection codes；
- froze 007B intersection box selection and simple-lasso boundary；
- froze 007C deterministic bounds-center pivot and positive uniform scale；
- deferred canonical groups/locks/visibility/z-order until formal PlotJSON schema/migration；
- fixed professional-editing reference revisions and licenses；
- declared code reuse as `none`；
- added `docs/design/professional-editing.md`；
- added `docs/algorithms/batch-edit-transaction.md`；
- updated design/algorithm indexes、reference matrix、AGENTS and roadmap。

## Validation

This branch is documentation-only and must preserve the merged runtime baseline：

```text
Node 20.19:        success
Node 22:           success
Node tests:        184 passed
Chromium tests:    28 passed
Playground build: success
handover contract: success
unresolved threads: 0
```

Design review gates：

- selection ordering and primary fallback are unambiguous；
- selection persistence boundary is explicit；
- Store transaction ordering and no-partial-mutation are explicit；
- listener exceptions cannot create untracked history state；
- batch delete undo restores exact document order；
- translation transforms authored controls only；
- one invalid member rejects the complete batch；
- one gesture creates one history entry；
- box/lasso and rotate/scale are separated from 007A runtime；
- canonical groups are not hidden in metadata；
- references、licenses and no-code-reuse declaration are complete。

## Next tasks

1. add immutable Milestone 007 design handover；
2. create documentation-only Draft design PR；
3. run Node 20.19、Node 22、184 Node、28 Chromium、build and handover；
4. address design review threads without adding runtime；
5. confirm zero unresolved threads；
6. squash merge design PR using validated expected head；
7. create `agent/007a-selection-batch-translation` from final `main`；
8. implement SelectionController and Node tests first；
9. implement Store transaction/listener isolation second；
10. implement BatchEditCommand and exact ordered undo third；
11. only then add MapLibre overlays、batch delete and local translation；
12. keep box/lasso、rotation/scale、groups and new symbols outside 007A。

## Risks and decisions

- selection is transient and not PlotJSON canonical state；
- undo selection restoration requires selection-aware batch commands；
- Store listener errors cannot safely roll back after observable commit and therefore must be isolated；
- exact order restoration requires ordered transaction state, not append-on-undo；
- local translation initially rejects antimeridian、high-latitude and large-extent selections；
- selection overlay introduces additional MapLibre Source/Layers in 007A；
- rotation/scale parameter semantics are not yet runtime-ready；
- groups/locks/z-order require formal PlotJSON migration；
- packages remain `UNLICENSED`；
- root workspace and public package versions are not coordinated；
- production bundle still needs code splitting；
- performance targets require measured reference hardware and feature mixes。

Continuation：continue only documentation and design review on `agent/007-professional-editing-design`. Do not create SelectionController、Store transaction or MapLibre overlays on this branch。

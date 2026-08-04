# PlotLibre Development Handover — Milestone 007 Design Merged / 007A Implementation Next

日期：2026-08-04  
仓库：`hujinghaoabcd/PlotLibre`  
当前 `main`：`bebfac11b6728089b39668de424851e2f750b4fd`  
已合并 PR：`#36 Freeze professional editing semantics`  
合并方式：squash  
Post-merge 分支：`agent/007-design-post-merge-finalization`  
Workspace：`0.0.20`  
状态：Milestone 007 professional-editing design 已合并；当前只同步真实合并状态，下一 runtime slice 为 007A selection + atomic batch transaction + local translation

## Current state

```text
workspace:          0.0.20
MapLibre GL JS:     6.0.0
Node.js:            20.19+
public symbols:     19
Node tests:         184
Chromium tests:     28
main SHA:           bebfac11b6728089b39668de424851e2f750b4fd
merged design PR:   #36
next branch:        agent/007a-selection-batch-translation
```

Current runtime is still single-selection and single-feature command oriented. PR #36 changes documentation only and freezes the required runtime architecture.

Frozen staging：

```text
007A selection + atomic Store transaction + batch delete + local translation
007B box/lasso selection
007C local rotation + positive uniform scale
007D groups/locks/visibility/z-order after PlotJSON migration design
```

## Completed in this milestone

- froze transient ordered `SelectionSnapshot` and primary-selection invariants；
- froze replace/add/subtract/toggle/clear/store-reconcile operations；
- preserved backward-compatible `selectedId` as primary alias；
- kept selection outside PlotJSON；
- froze primary-only authored handles and secondary overlays；
- froze staged atomic `PlotStore.applyTransaction`；
- required exact document-order restoration for undo；
- froze post-commit Store listener-error isolation；
- froze selection-aware `BatchEditCommand`；
- froze batch delete execute/undo/redo state；
- froze 007A local-metre authored-control translation；
- froze all-feature Registry preflight and all-or-nothing mutation；
- froze transform rejection, drag threshold, Escape and zero-movement behavior；
- separated 007B box/lasso and 007C rotate/scale from 007A；
- deferred canonical groups/locks/visibility/z-order until PlotJSON migration design；
- fixed Terra Draw、MapLibre-Geoman and Mapbox GL Draw revisions/licenses；
- declared code reuse as `none`；
- added semantic design、transaction algorithm、reference matrix and immutable handover；
- PR #36 contained exactly nine Markdown files and no runtime changes；
- PR #36 passed full current-head CI and had zero unresolved threads；
- actual squash merge SHA is `bebfac11b6728089b39668de424851e2f750b4fd`。

## Validation

Design PR validation：

```text
GitHub Actions run: 30896319194 (#341)
validated head:     828163df161293ef078aa7426b061e0c88aa6614
Node 20.19:         success
Node 22:            success
Node tests:         184 passed / 0 failed
Playground build:   success
handover contract:  success
Chromium tests:     28 passed / 0 failed
unresolved threads: 0
```

This post-merge finalization changes current-state Markdown only. It must independently pass the same 184/28 baseline before entering `main`.

## Next tasks

1. complete the documentation-only `agent/007-design-post-merge-finalization` slice；
2. create a Draft finalization PR；
3. pass Node 20.19、Node 22、184 Node、28 Chromium、build and handover checks；
4. merge with zero unresolved threads；
5. create `agent/007a-selection-batch-translation` from the new final `main`；
6. implement SelectionController and tests first；
7. implement PlotStore atomic transaction and listener isolation second；
8. implement BatchEditCommand and exact ordered undo third；
9. preserve backward-compatible single-selection API；
10. then add MapLibre selection overlays and click multi-selection；
11. then add batch delete/undo；
12. finally add local translation preview/commit and performance fixtures；
13. keep box/lasso、rotation/scale、groups、snapping and new symbols outside 007A。

## Risks and decisions

- selection remains transient and excluded from PlotJSON；
- exact selection restoration requires selection-aware history commands；
- committed Store listener errors must be isolated rather than rolled back after observation；
- batch delete undo must restore exact document order；
- local translation initially rejects antimeridian、high-latitude and large-extent selections；
- 007A will add selection overlay Sources/Layers and style-reload obligations；
- rotation/scale parameter semantics remain deferred；
- groups/locks/z-order require formal PlotJSON migration；
- packages remain `UNLICENSED`；
- workspace and package versions remain uncoordinated；
- production bundle still needs code splitting；
- performance targets require documented hardware and feature mixes。

Continuation：finish the design post-merge finalization, then begin 007A from final `main`. Do not add runtime to the finalization branch。

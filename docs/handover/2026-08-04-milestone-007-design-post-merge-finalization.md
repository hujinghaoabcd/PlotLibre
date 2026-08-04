# PlotLibre Milestone 007 Design Post-Merge Finalization

日期：2026-08-04  
仓库：`hujinghaoabcd/PlotLibre`  
Design PR：`#36 Freeze professional editing semantics`  
Validated design head：`828163df161293ef078aa7426b061e0c88aa6614`  
Design CI：run `30896319194` / `#341`  
Squash merge SHA：`bebfac11b6728089b39668de424851e2f750b4fd`  
Finalization branch：`agent/007-design-post-merge-finalization`

## Purpose

PR #36 merged the documentation-only professional-editing semantic and transaction design. This finalization records the actual squash SHA, changes current-state documents from “design active” to “design merged,” and fixes the exact 007A implementation boundary.

No runtime, package, test, Playground or configuration changes are permitted in this finalization.

## Merged runtime baseline

```text
workspace:          0.0.20
public symbols:     19
Node tests:         184
Chromium tests:     28
MapLibre Sources:   3
MapLibre Layers:    8
main SHA:           bebfac11b6728089b39668de424851e2f750b4fd
```

Professional-editing runtime is not yet implemented. The merged runtime still uses single selection and single-feature commands.

## Design merge evidence

```text
GitHub Actions run: 30896319194 (#341)
validated head:     828163df161293ef078aa7426b061e0c88aa6614
Node 20.19:         success
Node 22:            success
Node tests:         184 passed / 0 failed
Playground build:   success
handover contract:  success
Chromium tests:     28 passed / 0 failed
review threads:     0 unresolved
merge method:       squash
```

PR #36 contained exactly nine Markdown files and no runtime changes.

## Finalized 007A implementation scope

Create from the final `main` after this finalization merges:

```text
agent/007a-selection-batch-translation
```

Implementation order is binding:

1. engine-independent `SelectionController` and Node tests;
2. staged atomic `PlotStore.applyTransaction`;
3. post-commit listener-error isolation;
4. `BatchEditCommand` with exact before/after document order and selection snapshots;
5. backward-compatible PlotLibre single-selection API aliases;
6. MapLibre selection source/layers and primary-only handles;
7. click multi-selection and modifier behavior;
8. batch delete with exact undo/redo;
9. local-metre whole-selection translation preview and commit;
10. style reload and performance fixtures;
11. immutable 007A implementation handover;
12. current-head CI and squash merge.

## Frozen 007A invariants

### Selection

- transient, ordered and excluded from PlotJSON;
- `primaryId` is the final selected id;
- one event per effective operation;
- Store remove/clear reconciles once;
- only primary exposes authored handles and Definition guides;
- existing `selectedId` remains a primary-selection alias.

### Store transaction

- validate and stage all add/replace/remove operations before mutation;
- commit once and emit one batch event;
- no listener observes partial state;
- exact document order can be supplied and restored;
- validation error means no mutation.

### Listener errors

- committed state is not rolled back after observers have seen it;
- all listeners run;
- errors are collected and routed to `onListenerError`;
- errors do not prevent the history entry;
- pre-commit semantic validation still throws.

### Translation

- local-metre only;
- authored controls only;
- one shared projection and delta;
- parameters/style/metadata unchanged;
- every feature canonicalized/generated before commit;
- any invalid feature rejects the complete batch;
- Escape cancels, zero movement no-op;
- one gesture equals one history command.

## Deferred scopes

The following do not belong in 007A:

```text
box/lasso selection
rotation/scale
groups/locks/visibility/z-order
PlotJSON schema migration
snapping
new plot symbols
```

007B, 007C and 007D remain separate milestones.

## Documentation synchronized

- `docs/handover/LATEST.md` records actual design merge and 007A next branch;
- `AGENTS.md` advances the development contract to 007A implementation order;
- `docs/DEVELOPMENT_PLAN.md` marks PR #36 merged and preserves staged editing scope;
- this immutable finalization record documents the actual merge evidence.

## Finalization merge gate

```text
Node 20.19
Node 22
184 Node tests
28 Chromium tests
Playground build
handover contract
0 unresolved review threads
```

## Known risks

- current Store listener behavior remains unsafe until 007A lands;
- exact batch-delete order restoration may require complete ordered Store snapshots;
- selection overlays will add MapLibre resources and style-reload obligations;
- local translation initially rejects global/extreme coordinate modes;
- group/lock/z-order runtime remains blocked on PlotJSON schema/migration;
- packages remain `UNLICENSED`;
- bundle code splitting and performance benchmarks remain pending.

# PlotLibre Milestone 006J Post-Merge Finalization

日期：2026-08-04  
仓库：`hujinghaoabcd/PlotLibre`  
设计 PR：`#33 Freeze circular arc family semantics`  
实现 PR：`#34 Add circular arc family`  
最终实现 head：`608567d4f8f662242b0356c54742a2ffcb087c66`  
权威 CI：run `30893450723` / `#337`  
Squash merge SHA：`297d0a644eaa3427f8fd59b82b7bc3582221d49e`  
Finalization 分支：`agent/006j-post-merge-finalization`

## Purpose

PR #34 合并后，runtime、tests、Playground 和 immutable implementation handover 已进入 `main`，但 current-state 文档仍描述 006J 为 active/Ready candidate。该 finalization 只同步真实合并状态和下一阶段边界，不修改 runtime、geometry、Definitions、interaction、Playground source、tests 或 configuration。

## Merged capability baseline

```text
workspace:          0.0.20
public symbols:     19
Arrow Definitions:  14
Line Definitions:   1
Area Definitions:   4
Node tests:         184
Chromium tests:     28
MapLibre Sources:   3
MapLibre Layers:    8
main SHA:           297d0a644eaa3427f8fd59b82b7bc3582221d49e
```

Merged circular Definitions：

```text
line.circular-arc@1.0.0
area.circular-segment@1.0.0
area.sector@1.0.0
```

Deferred：

```text
area.lune
```

## Merge gate evidence

```text
GitHub Actions run: 30893450723 (#337)
validated PR head:  608567d4f8f662242b0356c54742a2ffcb087c66
Node 20.19:         success
Node 22:            success
TypeScript:         success
Node tests:         184 passed / 0 failed
Playground build:   success
handover contract:  success
Chromium tests:     28 passed / 0 failed
review threads:     0 unresolved
merge method:       squash
```

PR #34 was marked Ready only after the complete documentation-inclusive current-head run succeeded. Merge used the validated expected head SHA to prevent silent head drift.

## Documentation synchronized

- `docs/handover/LATEST.md`：actual merge SHA、merged PR、007 continuation；
- `AGENTS.md`：merged 19-symbol baseline and design-first 007 contract；
- `docs/DEVELOPMENT_PLAN.md`：006J marked merged and detailed 007 design scope；
- `docs/design/README.md`：circular family marked implemented and merged；
- `docs/algorithms/README.md`：circular algorithm marked merged with final validation；
- `docs/PLAYGROUND.md`：actual main SHA、19-symbol and 184/28 merged baseline；
- this immutable post-merge record。

## Milestone 007 continuation boundary

After this documentation-only finalization is merged, create from the new final `main`：

```text
agent/007-professional-editing-design
```

Milestone 007 begins with semantic and transaction design only. Before runtime, freeze：

### Selection model

- ordered `selectedIds` semantics；
- primary/active selection；
- single、toggle、additive and subtractive gestures；
- cleanup after delete、lock、hide、clear and import；
- selection event ordering；
- PlotJSON exclusion unless explicitly justified。

### Box and lasso selection

- contain versus intersect policy；
- authored controls versus derived geometry versus hit-area；
- LineString、Polygon、Point and compound-output consistency；
- screen-space/geographic-space boundary；
- camera gesture conflicts；
- spatial index and performance budget。

### Whole-object transforms

- translate authored controls only；
- deterministic pivot for rotation/scale；
- local/geodesic coordinate-mode policy；
- parameter scaling rules；
- locked/grouped feature behavior；
- one gesture = one history entry；
- all-feature Registry preflight before mutation。

### Groups, locks and z-order

- stable identifiers；
- nested-group policy；
- lock semantics across selection/style/handle/transform；
- visibility and z-order scope；
- PlotJSON schema and migration；
- unresolved group-reference import policy。

### Multi-object transactions

- batch create/replace/delete commands；
- all-or-nothing Store mutation；
- listener-exception rollback；
- undo/redo selection restoration；
- history memory limits；
- future collaboration/CRDT compatibility。

### Interaction and tests

- pointer capture、keyboard modifiers、touch gestures and accessibility；
- deterministic selection and transform fixtures；
- invalid-member atomic rollback；
- performance targets for 100/1,000/10,000 features；
- actual-rendered browser matrix。

Do not add Milestone 007 runtime until a documentation-only design PR is merged.

## Known risks

- `deriveSemanticGuidePaths` is now a public Definition extension and must remain backward compatible；
- packages remain `UNLICENSED`；
- root workspace and public package versions are not coordinated；
- PlotJSON lacks formal JSON Schema and migration framework；
- current Store/History lacks multi-object transactions and general rollback；
- production JS bundle is about 1,081 kB and needs code splitting；
- connector workflow cannot delete merged remote branches；
- Pages workflow success and live manual verification remain separate states。

## Non-goals

This finalization must not include：

- runtime code；
- geometry or Definition changes；
- test changes；
- new symbols；
- professional editing implementation；
- true lune or geodesic circular fallback；
- pincer hardening or route-head variants。

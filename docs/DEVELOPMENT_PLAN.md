# PlotLibre 开发路线图

## 工程流程

```text
设计冻结
→ 独立 runtime PR
→ exact-head CI
→ immutable handover
→ Ready
→ squash merge
→ post-merge authority synchronization
```

禁止编辑派生 GeoJSON 顶点代替 authored controls、部分批量提交、绕过 Registry generation preflight、在设计/收尾 PR 混入 runtime、使用旧 head CI 或发布未经测量的性能保证。

## 当前基线

```text
main SHA:          9a1c761b3e9d1f94c944485137fb21a92bdcc786
workspace:         0.0.22
public symbols:    19 (14 Arrow + 1 Line + 4 Area)
Node tests:        299
Chromium tests:    34
MapLibre Sources:  4
MapLibre Layers:   10
benchmark jobs:    region selection + selection transform
completed:         007A + 007B + 007B-P + 007C design
current slice:     007C runtime validation and documentation
current branch:    agent/007c-rotation-scale-runtime
current PR:        #49 (Draft until exact-head gate)
```

## Milestones

| 里程碑 | 成果 | 状态 |
|---|---|---|
| 001–006J | Core、History、PlotJSON、MapLibre、geometry、19 symbols | 已完成 |
| 007A | selection、atomic Store、delete、translation | PR #38/#39 |
| 007B | box/lasso design/runtime/Playground/docs | PR #40–#44 |
| 007B-P | resolver benchmark 与索引决策 | PR #45/#46 |
| 007C Design | shared-pivot rotation + positive uniform scale | PR #47/#48 |
| 007C Runtime | pure math、session、atomic command、MapLibre handles、Playground、Chromium、benchmark | PR #49，收尾中 |
| 007C Finalization | merge-state authority synchronization | PR #49 合并后独立分支 |
| 007D | groups/locks/visibility/z-order after PlotJSON migration | deferred |

## 007C runtime implementation

Authority:

```text
docs/design/rotation-uniform-scale.md
docs/design/rotation-uniform-scale-runtime.md
docs/algorithms/selection-local-transform.md
docs/performance/selection-transform-benchmark.md
```

Implemented pipeline:

```text
all selected authored controls
→ one order-independent local-metre frame
→ fixed authored-control AABB-center pivot
→ clockwise rotation or positive uniform scale
→ canonicalize + Registry.generate every member
→ complete transient preview or complete rejection
→ one stale-safe BatchEditCommand
```

Completed runtime slices:

1. shared local frame and pure rotation/scale functions;
2. engine-independent transform session, angle unwrap and structured rejections;
3. all-Definition Registry fixtures for 19 public symbols;
4. stale-safe atomic command construction and exact undo/redo;
5. MapLibre explicit transform controller;
6. DOM/SVG frame, pivot, handles and label;
7. four CSS-pixel start-radius and 24 CSS-pixel visual-frame contracts;
8. public APIs and Playground controls/status;
9. real Chromium multi-selection rotation and rejected-scale retry flows;
10. reproducible `1/100/1,000` transform benchmark and independent Actions workflow;
11. runtime architecture, performance and handover documentation.

## Binding 007C decisions

- authored controls only;
- changed feature revision +1;
- parameters/style/metadata unchanged;
- positive clockwise angle;
- positive uniform scale `[0.01,100]`;
- no reflection/non-uniform scale/skew/snapping;
- absolute parameter caps may prevent strict rendered similarity;
- explicit one-shot modes;
- DOM/SVG frame/pivot/handles;
- minimum four-pixel screen start radius;
- minimum 24-pixel visual frame for tiny selections;
- no new Source/Layer;
- transform and region modes mutually exclusive;
- all-member fail-closed preflight;
- exact captured undo/redo;
- unsupported local coordinate frames reject.

## Runtime acceptance

Pure:

- frame order invariance;
- clockwise cardinal fixtures;
- angle unwrap;
- scale boundaries and no reflection;
- local-frame failures;
- no-op behavior.

Registry/command:

- all 19 Definitions rotate through full preflight;
- all 19 Definitions pass modest positive scale smoke;
- parameters/style/metadata unchanged;
- one invalid member rejects all;
- exact revision/order/selection/Primary/undo/redo.

MapLibre/Chromium:

- explicit and mutually exclusive modes;
- DOM handles and lifecycle;
- pointer capture and dragPan restoration;
- rejection retry;
- multi-selection rotate/scale;
- all historical browser regressions.

Performance:

- required `1/100/1,000` measurements;
- JSON/Markdown artifact;
- no hard latency SLA;
- no persistent transform cache or index without new evidence.

## Exact-head gate for PR #49

```text
Node 20.19 success
Node 22 success
299 Node tests
Playground typecheck/build
handover check
region benchmark artifact
selection-transform benchmark artifact
34 Chromium tests
zero unresolved review threads
immutable runtime handover
```

After all items pass on one exact head, update PR #49 evidence, mark Ready and preserve that exact head for squash merge.

## Post-merge finalization

After PR #49 is squash-merged:

1. verify `main` equals the returned squash SHA;
2. create a new post-merge finalization branch from that `main`;
3. synchronize `README.md`, `AGENTS.md`, `docs/DEVELOPMENT_PLAN.md` and `docs/handover/LATEST.md` to merged authority;
4. record final CI, artifact ids, test counts, review-thread count and squash SHA;
5. make no runtime changes in the finalization PR;
6. merge finalization, then start the next design slice only from synchronized `main`.

## Non-goals

Reflection、negative or non-uniform scale、skew、snapping、pivot dragging、touch transforms、groups/locks/visibility/z-order、new symbols、PlotJSON shortcuts、parameter-name heuristics。

## Cross-stage tasks

Open-source license、coordinated release、PlotJSON schema/migrations、docs/test consistency automation、real-browser performance、Playground code splitting、npm boundaries、source/build/deploy/live verification、branch cleanup documentation。

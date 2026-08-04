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
main SHA:          2b06d02ba851a9c6ae01d0db1fc503ad5f8699c0
workspace:         0.0.22
public symbols:    19 (14 Arrow + 1 Line + 4 Area)
Node tests:        299
Chromium tests:    34
MapLibre Sources:  4
MapLibre Layers:   10
benchmark jobs:    region selection + selection transform
completed:         007A + 007B + 007B-P + 007C design/runtime
current slice:     007C post-merge authority synchronization
current branch:    agent/007c-runtime-post-merge-finalization
next branch:       agent/008-plotjson-migrations-design
```

PR #49 exact head `c9c8cadf678a0758075af76d078b2e5a5bfbd379` passed CI `30943895213` / `#505` and was squash-merged as `2b06d02ba851a9c6ae01d0db1fc503ad5f8699c0`.

## Milestones

| 里程碑 | 成果 | 状态 |
|---|---|---|
| 001–006J | Core、History、PlotJSON、MapLibre、geometry、19 symbols | 已完成 |
| 007A | selection、atomic Store、delete、translation | PR #38/#39，已完成 |
| 007B | box/lasso design/runtime/Playground/docs | PR #40–#44，已完成 |
| 007B-P | resolver benchmark 与索引决策 | PR #45/#46，已完成 |
| 007C Design | shared-pivot rotation + positive uniform scale | PR #47/#48，已完成 |
| 007C Runtime | pure math、session、atomic command、MapLibre handles、Playground、Chromium、benchmark | PR #49，已合并 |
| 007C Finalization | merge-state authority synchronization | 当前纯文档分支 |
| 008 Design | PlotJSON schema、兼容性与迁移语义 | 下一阶段 |
| 008 Runtime | migration registry、fixtures、兼容解析 | 设计冻结后 |
| 007D | groups/locks/visibility/z-order | 008 runtime 完成后解除阻塞 |

## 007C merged runtime

Authority:

```text
docs/design/rotation-uniform-scale.md
docs/design/rotation-uniform-scale-runtime.md
docs/algorithms/selection-local-transform.md
docs/performance/selection-transform-benchmark.md
docs/handover/2026-08-05-milestone-007c-rotation-scale-runtime.md
docs/handover/2026-08-05-milestone-007c-runtime-post-merge-finalization.md
```

Merged pipeline:

```text
all selected authored controls
→ one order-independent local-metre frame
→ fixed authored-control AABB-center pivot
→ clockwise rotation or positive uniform scale
→ canonicalize + Registry.generate every member
→ complete transient preview or complete rejection
→ one stale-safe BatchEditCommand
→ exact captured undo/redo
```

Delivered slices:

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
11. runtime architecture, performance and immutable handover documentation.

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

## 007C merge evidence

```text
validated head:        c9c8cadf678a0758075af76d078b2e5a5bfbd379
CI:                    30943895213 / #505
Node 20.19:            success
Node 22:               success
Node tests:            299 passed
Playground typecheck:  success
Playground build:      success
handover check:        success
Chromium tests:        34 passed
review threads:        0
merge method:          squash
squash SHA:            2b06d02ba851a9c6ae01d0db1fc503ad5f8699c0
```

Exact-head artifacts:

```text
region benchmark:     8906262138
transform benchmark:  8906253893
```

The transform benchmark remains observational. No persistent transform cache or spatial index is justified by the measured profile.

## 008 PlotJSON migration design

Groups, locks, visibility and z-order require stable persistence and migration semantics. They must not be added as ad-hoc fields before PlotJSON compatibility is frozen.

Create the next branch from synchronized `main`:

```text
agent/008-plotjson-migrations-design
```

The design PR must inventory and freeze:

1. the current document and feature schema;
2. document `schemaVersion` ownership and Definition `version` ownership;
3. parse → structural validation → migration → semantic validation ordering;
4. migration registry keys, chaining and deterministic output;
5. unknown schema versions, unknown Definitions and unknown fields;
6. document order, future group ids and reference integrity;
7. persistence boundaries for lock, visibility and z-order;
8. stable migration/rejection error codes;
9. golden fixtures for every supported historical version;
10. backward/forward compatibility matrix;
11. idempotence, determinism and no-partial-migration rules;
12. implementation milestones before 007D runtime.

The design PR is Markdown and fixture-planning only. It must not mutate PlotJSON runtime behavior.

## 008 runtime acceptance direction

The later implementation must prove:

- deterministic chained migration;
- exact current-version round trip;
- historical fixtures migrate to one canonical current document;
- unsupported future versions fail closed;
- unknown Definitions remain explicit and never silently relabel;
- no partial document import or Store mutation;
- ordering and references remain stable;
- migration is independent from MapLibre and Playground;
- current 299 Node and 34 Chromium regressions remain green;
- new compatibility fixtures and handover are immutable.

## 007D unblock condition

Groups/locks/visibility/z-order can enter design only after 008 defines and implements:

```text
stable document versioning
migration registry
reference integrity
ordering semantics
unknown-version behavior
backward compatibility fixtures
```

## Non-goals for the next design PR

Runtime migration code、groups/locks UI、visibility rendering、z-order commands、new symbols、reflection、non-uniform scale、snapping、touch transforms、coordinated npm release。

## Cross-stage tasks

Open-source license、coordinated release、docs/test consistency automation、real-browser performance、Playground code splitting、npm boundaries、source/build/deploy/live verification、branch cleanup documentation。

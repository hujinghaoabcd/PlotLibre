# PlotLibre Development Handover — Milestone 007C Design

日期：2026-08-05  
仓库：`hujinghaoabcd/PlotLibre`  
完整交接：`docs/handover/2026-08-05-milestone-007c-rotation-scale-design.md`

## Current state

```text
main:               349a09160ac2e17883e2270123d371c164ef28c2
workspace:          0.0.22
public symbols:     19 (14 Arrow + 1 Line + 4 Area)
Node tests:         264
Chromium tests:     32
MapLibre Sources:   4
MapLibre Layers:    10
benchmark job:      required
current branch:     agent/007c-rotation-scale-design
scope:              rotation + positive uniform scale design
runtime:            prohibited
```

## Completed in this milestone

Frozen design：

```text
docs/design/rotation-uniform-scale.md
docs/algorithms/selection-local-transform.md
```

Key decisions：

- transform authored controls only；
- one order-independent shared local-metre frame；
- pivot = complete-selection authored-control AABB center；
- positive user angle = clockwise；
- positive uniform scale `[0.01,100]`；
- no reflection/non-uniform scale/skew/snapping；
- parameters/style/metadata unchanged；
- absolute ground caps may prevent strict derived similarity；
- explicit one-shot rotate/scale modes；
- DOM/SVG frame、pivot and handles；
- no new Source/Layer；
- all-member canonicalization + Registry generation preflight；
- one BatchEditCommand with exact undo/redo；
- invalid completion remains armed for retry；
- unsupported local domain fails closed。

## Validation

The design branch has not yet completed its exact-head CI. Required unchanged gate：

```text
Node 20.19 / 22
264 Node tests
Playground build
handover contract
benchmark job + artifact
32 Chromium tests
0 unresolved review threads
```

Do not claim this branch is validated from the prior 007B-P runs.

## Next tasks

1. confirm branch diff is Markdown only；
2. open Draft PR；
3. run exact-head full CI；
4. record final head、CI、artifact and Chromium count；
5. confirm zero threads；
6. Ready + squash merge with expected head SHA；
7. verify `main`；
8. perform documentation-only post-merge synchronization；
9. create 007C runtime from final synchronized `main`。

## Risks and decisions

- scale changes canonical controls, not every absolute parameter；
- transform mode is explicit to avoid accidental body-translation conflicts；
- local-metre v1 rejects unsupported coordinate domains；
- no runtime, parameter hooks, groups/locks, snapping, touch transforms, new symbols or PlotJSON changes on the design branch；
- branch cleanup may require manual action because delete-ref is unavailable through the connector。

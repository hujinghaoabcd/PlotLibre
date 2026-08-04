# PlotLibre Development Handover — Milestone 007B-P Merged

日期：2026-08-05  
仓库：`hujinghaoabcd/PlotLibre`  
完整交接：`docs/handover/2026-08-05-milestone-007b-benchmark-post-merge.md`

## Current state

```text
main:               2f8ea72749ecfdadbc354216d6e411e81bfecee1
workspace:          0.0.22
public symbols:     19 (14 Arrow + 1 Line + 4 Area)
Node tests:         264
Chromium tests:     32
MapLibre Sources:   4
MapLibre Layers:    10
007B-P:             merged through PR #45
current branch:     agent/007b-benchmark-post-merge-finalization
authorized changes: documentation only
```

`main` was explicitly compared with the PR #45 squash SHA and was identical.

## Completed in this milestone

- reusable `npm run benchmark:region-selection`；
- 100 / 1,000 / 10,000 all-candidate resolver fixtures；
- uninstrumented headline median/p95/throughput；
- separate diagnostic generation/projection profile；
- JSON/Markdown artifact workflow；
- permanent raw JSON and performance report；
- indexing decision：retain MapLibre rendered-index broad phase and do not add a persistent custom index yet；
- immutable measurement and post-merge handovers；
- no selection runtime changes。

Frozen measurement：

```text
100 candidates:       2.399 ms median / 5.308 ms p95
1,000 candidates:     10.961 ms median / 18.246 ms p95
10,000 candidates:    109.308 ms median / 119.182 ms p95
```

These are Node/CI pressure-profile observations, not a browser latency SLA.

## Validation

```text
PR:                   #45
validated head:       69a2c87767ea5ea2312ab101455bed06069639d0
CI:                   #464 / 30933921135
Node 20.19 / 22:      success
Node tests:           264 passed
Playground build:     success
handover check:       success
benchmark job:        success
benchmark artifact:   8902285519
Chromium tests:       32 passed
unresolved threads:   0
squash SHA:           2f8ea72749ecfdadbc354216d6e411e81bfecee1
```

This post-merge branch must independently pass the unchanged 264/32/benchmark baseline before merge.

## Next tasks

1. validate and merge this documentation-only synchronization；
2. verify final `main` against its returned squash SHA；
3. create Milestone 007C design-only branch from that final `main`；
4. freeze rotation/positive-uniform-scale pivot、angle、scale、handles、priority、preview、failure and atomic command semantics；
5. keep runtime、snapping、groups、locks and new symbols outside the design PR。

## Risks and decisions

- Current benchmark does not measure real MapLibre tile/style query or browser frame time。
- No latency threshold is enforced in CI。
- A persistent index requires real-browser evidence、varied candidate ratios and complete invalidation design。
- Root 0.0.22 remains a development baseline, not a coordinated npm release。
- The Playground retains the known non-blocking >500 kB bundle warning。
- Branch deletion may require manual cleanup because the connector does not expose delete-ref。

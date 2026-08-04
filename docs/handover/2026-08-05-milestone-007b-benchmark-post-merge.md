# PlotLibre Handover — Milestone 007B-P Benchmark Merged

日期：2026-08-05  
仓库：`hujinghaoabcd/PlotLibre`  
合并 PR：`#45 Add reproducible region-selection benchmark`  
合并方式：Squash and merge  
最终 PR head：`69a2c87767ea5ea2312ab101455bed06069639d0`  
最终 CI：`#464 / 30933921135`  
Squash SHA：`2f8ea72749ecfdadbc354216d6e411e81bfecee1`

## Merged state

```text
main:               2f8ea72749ecfdadbc354216d6e411e81bfecee1
workspace:          0.0.22
public symbols:     19 (14 Arrow + 1 Line + 4 Area)
Node tests:         264
Chromium tests:     32
MapLibre Sources:   4
MapLibre Layers:    10
benchmark command:  npm run benchmark:region-selection
```

After merge, `main` was explicitly compared with `2f8ea727...` and was identical.

## Delivered

- reproducible 100 / 1,000 / 10,000 candidate resolver benchmark；
- actual Store、Registry generation、projection and exact screen intersection；
- duplicate rendered-row deduplication and Store-order validation；
- uninstrumented headline median/p95/throughput；
- separately instrumented diagnostic profile；
- JSON/Markdown artifacts and reusable Actions workflow；
- permanent raw JSON and interpretation documents；
- explicit decision to retain MapLibre rendered-index broad phase；
- no persistent custom spatial index from the current evidence；
- no selection runtime or semantics changes。

## Frozen measurement

```text
measurement CI:        #457 / 30933193884
source head:           2fca8812e206f799c3580380f4e1cd3ed3a73aa8
100 candidates:        2.399 ms median / 5.308 ms p95
1,000 candidates:      10.961 ms median / 18.246 ms p95
10,000 candidates:     109.308 ms median / 119.182 ms p95
```

This is an all-candidate/all-hit Node/CI pressure profile, not a browser latency SLA.

## Final merge validation

```text
exact head:            69a2c87767ea5ea2312ab101455bed06069639d0
CI:                    #464 / 30933921135
Node 20.19:            success
Node 22:               success
Node tests:            264 passed
Playground build:      success
handover check:        success
benchmark job:         success
benchmark artifact:    8902285519
artifact SHA-256:      11bec1c32e63d286cf732bece12db15f526a1eab190c49b4dd551cea6844b434
Chromium:              32 passed
unresolved threads:    0
```

## Authority documents

```text
docs/performance/README.md
docs/performance/region-selection-resolver-benchmark.md
docs/performance/data/2026-08-04-region-selection-resolver-ci.json
docs/handover/2026-08-05-milestone-007b-region-selection-benchmark.md
```

## Decision

```text
retain MapLibre rendered-index broad phase
retain canonical exact resolver
do not add a persistent custom index yet
```

A later index proposal requires real Chromium/MapLibre end-to-end measurements, varied candidate ratios, mixed complex symbols, a clear interaction budget and complete invalidation semantics.

## Next milestone

Create Milestone 007C from the final `main` only after this documentation-only post-merge synchronization is independently validated and merged. 007C must begin as design-only work for local rotation and positive uniform scale. Rotation/scale runtime, snapping, groups, locks, new symbols and PlotJSON schema changes are prohibited on the design branch.

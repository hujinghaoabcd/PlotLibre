# PlotLibre Development Handover — Milestone 007B-P Benchmark

日期：2026-08-05  
仓库：`hujinghaoabcd/PlotLibre`  
当前工作：PR #45 `Add reproducible region-selection benchmark`

## Current state

```text
main:               012d17ac8a8f7e71264ef375511b764cb398d111
workspace:          0.0.22
public symbols:     19 (14 Arrow + 1 Line + 4 Area)
Node tests:         264
Chromium tests:     32
MapLibre Sources:   4
MapLibre Layers:    10
branch:             agent/007b-region-selection-benchmark
PR:                 #45 Draft
selection runtime:  unchanged
```

007B design、runtime、Playground、browser correction、0.0.22 documentation 均已合并。当前分支只增加可复现 benchmark infrastructure、冻结原始证据和性能决策。

## Completed in this milestone

已完成：

- `npm run benchmark:region-selection`；
- 100 / 1,000 / 10,000 feature fixtures；
- actual PlotStore、PlotRegistry generation、projection 和 exact intersection；
- duplicate rendered rows 与 Store-order result validation；
- headline uninstrumented total、median、p95、throughput 和 RSS；
- separate instrumented diagnostic profile；
- reusable benchmark workflow、CI job summary 和 artifact；
- frozen raw JSON and permanent Markdown report；
- explicit indexing decision：retain MapLibre broad phase，暂不增加 persistent custom index。

权威文件：

```text
scripts/benchmark-region-selection.mjs
.github/workflows/region-selection-benchmark.yml
docs/performance/README.md
docs/performance/region-selection-resolver-benchmark.md
docs/performance/data/2026-08-04-region-selection-resolver-ci.json
```

## Validation

Frozen corrected measurement：

```text
CI:                    #457 / 30933193884
benchmark job:         92072709871
source head:           2fca8812e206f799c3580380f4e1cd3ed3a73aa8
workflow checkout:     5a0678fdf6e8e8497e977ffc522292652bc0d4e7
Node:                  v22.23.1
CPU:                   AMD EPYC 7763, 4 logical CPUs
artifact id:           8901993992
artifact digest:       baedae5c338698903f06c5cbb58ce07bd9f96e7bc6e2468ba76cd28a925ba52a
```

```text
100 candidates:       2.399 ms median / 5.308 ms p95
1,000 candidates:     10.961 ms median / 18.246 ms p95
10,000 candidates:    109.308 ms median / 119.182 ms p95
```

This is an all-candidate/all-hit Node/CI pressure profile. It does not measure real MapLibre tile/style query latency、browser frame time、GPU or DOM overlay.

PR #45 must still pass its final exact-head gate：Node 20.19/22、264 Node、Playground build、handover、benchmark artifact、32 Chromium and zero unresolved threads.

## Next tasks

1. add immutable 007B-P handover；
2. run final exact-head CI for PR #45；
3. record final head、CI and benchmark artifact in the PR；
4. confirm zero unresolved review threads；
5. mark Ready and squash merge with expected head SHA；
6. verify `main` equals the returned squash SHA；
7. begin 007C rotation/positive-uniform-scale as a separate design-only branch from latest `main`。

## Risks and decisions

- Headline timings are uninstrumented resolver totals；diagnostic phases are separate and not additive。
- The fixture uses only `arrow.straight` and a 100% candidate/hit ratio。
- GitHub-hosted runner results are observational, not a hard latency SLA。
- Current evidence shows candidate count is the important scale variable but does not justify a second persistent index。
- A future index requires real Chromium/MapLibre measurements、candidate-ratio fixtures and explicit invalidation semantics。
- Benchmark success validates reproducibility and artifact production, not a latency threshold。
- Production Playground bundle still has a known non-blocking >500 kB warning。
- Branch deletion may require manual cleanup because the current connector does not expose delete-ref。

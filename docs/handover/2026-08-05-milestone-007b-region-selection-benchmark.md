# PlotLibre Handover — Milestone 007B-P Region-Selection Benchmark

日期：2026-08-05  
仓库：`hujinghaoabcd/PlotLibre`  
基线 `main`：`012d17ac8a8f7e71264ef375511b764cb398d111`  
分支：`agent/007b-region-selection-benchmark`  
PR：`#45 Add reproducible region-selection benchmark`  
Workspace：`0.0.22`

## Scope

Milestone 007B-P adds reproducible performance evidence for the already merged region-selection resolver. It does not modify box/lasso semantics, selection state, exact intersection behavior or MapLibre gesture ownership.

Included：

- deterministic 100 / 1,000 / 10,000 feature fixtures；
- actual PlotStore、PlotRegistry generation、projection and exact screen-intersection path；
- duplicate rendered rows to exercise `plotId` deduplication；
- Store/document-order result validation；
- uninstrumented headline total timing；
- separate instrumented diagnostic profile；
- median、p95、throughput and RSS observations；
- JSON/Markdown artifacts and CI summary；
- frozen raw measurement data；
- explicit persistent-index decision。

Excluded：

- selection runtime changes；
- real MapLibre tile/style query benchmarking；
- browser frame/GPU/DOM overlay benchmarking；
- performance SLA or CI latency threshold；
- persistent spatial index implementation；
- rotation、scale、groups、locks、snapping or new symbols。

## Reproduce

```bash
npm install
npm run benchmark:region-selection
```

Generated files：

```text
artifacts/region-selection-benchmark/results.json
artifacts/region-selection-benchmark/results.md
```

The reusable workflow is `.github/workflows/region-selection-benchmark.yml`. Regular CI calls it as an independent benchmark job and uploads both files as an artifact. Benchmark success validates execution、result invariants and artifact production; it does not enforce a latency threshold.

## Measurement method

Fixture：

```text
symbol:                    arrow.straight
controls per feature:      2
Store sizes:               100 / 1,000 / 10,000
rendered rows per feature: 2
candidate ratio:           100%
exact-hit ratio:           100%
projection:                deterministic CSS-pixel-like linear adapter
region:                    one rectangle containing every candidate
```

Headline totals use an uninstrumented call to：

```text
MapLibreSelectionRegionResolver.resolve(regionRing, regionBounds)
```

Diagnostic phase values are collected in separate instrumented runs. They are not an additive decomposition of headline total and must not be used as such.

## Frozen measurement evidence

```text
CI run:                #457 / 30933193884
benchmark job:         92072709871
source branch head:    2fca8812e206f799c3580380f4e1cd3ed3a73aa8
workflow checkout:     5a0678fdf6e8e8497e977ffc522292652bc0d4e7
Node:                  v22.23.1
OS:                    Linux 6.17.0-1020-azure x64
CPU:                   AMD EPYC 7763, 4 logical CPUs
runner memory:         15.61 GiB
artifact id:           8901993992
artifact SHA-256:      baedae5c338698903f06c5cbb58ce07bd9f96e7bc6e2468ba76cd28a925ba52a
artifact expiry:       2026-08-18T17:17:32Z
```

| Unique candidates | Total median | Total p95 | Median candidates/s | Peak additional RSS |
|---:|---:|---:|---:|---:|
| 100 | 2.399 ms | 5.308 ms | 37,002 | 5.852 MiB |
| 1,000 | 10.961 ms | 18.246 ms | 89,292 | 23.996 MiB |
| 10,000 | 109.308 ms | 119.182 ms | 90,517 | 65.195 MiB |

Frozen raw data：

```text
docs/performance/data/2026-08-04-region-selection-resolver-ci.json
```

Permanent interpretation：

```text
docs/performance/region-selection-resolver-benchmark.md
```

## Interpretation

The pressure fixture deliberately sends every Store object through exact resolution and selects every object. Under this specific Node/CI profile, cost grows approximately with unique candidate count. The 10,000-candidate case is around 0.11 seconds median, but this is not a browser interaction promise.

The measurement does not include real MapLibre tile/style-index query latency, browser event handling, selection-overlay rendering, DOM/SVG guide painting, GPU work or mixed complex symbol families.

## Indexing decision

Binding decision after this first evidence：

```text
retain MapLibre rendered-index broad phase
retain canonical exact resolver
DO NOT add a persistent custom spatial index yet
```

A later index proposal requires real Chromium/MapLibre end-to-end evidence, varied candidate ratios, mixed/high-sample symbols, a clear interaction budget and a complete invalidation design for add、update、remove、batch、import、undo and redo.

## Files changed

```text
.github/workflows/ci.yml
.github/workflows/region-selection-benchmark.yml
.gitignore
package.json
scripts/benchmark-region-selection.mjs
docs/performance/README.md
docs/performance/region-selection-resolver-benchmark.md
docs/performance/data/2026-08-04-region-selection-resolver-ci.json
AGENTS.md
docs/DEVELOPMENT_PLAN.md
docs/handover/LATEST.md
docs/handover/2026-08-05-milestone-007b-region-selection-benchmark.md
```

## Merge gate

PR #45 remains Draft until its final exact head passes：

```text
Node 20.19
Node 22
264 Node tests
Playground typecheck/build
handover contract
benchmark job and artifact
32 Chromium tests
zero unresolved review threads
```

The frozen performance run and final correctness/merge-gate run serve different purposes. The PR body is the authority for final exact-head CI evidence; this document does not claim a newer head passed based on run #457.

## Continuation

After PR #45 is validated and squash-merged, verify `main` equals the returned squash SHA. Then create Milestone 007C as a separate design-only branch from latest `main` and freeze rotation/positive-uniform-scale semantics before writing runtime.

# Selection Transform Benchmark

日期：2026-08-05  
里程碑：007C whole-selection rotation / positive uniform scale  
权威 source head：`235289e9dd40851ab2484edd5c9b38e2372f36e4`  
CI：`#496 / 30943132152`  
artifact：`8905951081`  
workflow checkout merge SHA：`8bb31734a5ec6e3204cc8b36340bdba587c97b61`

## Purpose

This benchmark measures the engine-independent selection-transform preparation path before browser rendering. It exists to answer one engineering question: whether the first complete 007C runtime needs a persistent transform cache, a spatial index or another complexity-increasing optimization before merge.

The answer for this measured profile is **no**. The `1/100/1,000` results do not justify a new persistent cache or index. Future optimization must be driven by a reproducible regression or a separate browser-frame benchmark, not by extrapolation from unmeasured workloads.

## Reproduction

```bash
npm install
npm run benchmark:selection-transform
```

The command:

1. builds the workspace;
2. links workspace packages;
3. runs Node with `--expose-gc`;
4. writes:
   - `artifacts/selection-transform-benchmark/results.json`;
   - `artifacts/selection-transform-benchmark/results.md`.

The independent reusable workflow is:

```text
.github/workflows/selection-transform-benchmark.yml
```

The root CI calls it as a required job. The workflow uploads both files as an artifact and publishes the Markdown report to the Actions job summary. There is deliberately no latency threshold.

## Frozen fixture

```text
feature type:               arrow.straight
selected features:          1 / 100 / 1,000
authored controls/feature:  2
operation:                  complete-selection rotation
frame:                      one shared local-metre frame
angle:                      15° clockwise
preview:                    transform + canonicalize + Registry.generate
command preparation:        stale-state validation + atomic command creation
```

The fixture is deterministic. The headline path is uninstrumented. Canonicalize/generate diagnostics are collected in separate instrumented repetitions, so their values must not be algebraically combined with the headline samples.

## Exact-head environment

```text
Node:             v22.23.1
OS:               Linux 6.17.0-1020-azure x64
CPU:              AMD EPYC 7763 64-Core Processor
logical CPUs:     4
reported memory:  15.61 GiB
garbage collect:  available
```

## Results

| Selected features | Repetitions | Preview median (ms) | Preview p95 (ms) | Command preparation median (ms) | Median features/s | Peak additional RSS (MiB) |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 60 | 0.031 | 0.070 | 0.018 | 32,136 | 0.75 |
| 100 | 36 | 0.949 | 2.216 | 0.674 | 101,368 | 10.10 |
| 1,000 | 18 | 2.333 | 3.640 | 3.156 | 425,075 | 3.67 |

Diagnostic medians from separate profiled repetitions:

| Selected features | Session construction (ms) | Registry canonicalize (ms) | Registry generate (ms) | Non-isolated transform remainder (ms) |
|---:|---:|---:|---:|---:|
| 1 | 0.013 | 0.001 | 0.016 | 0.014 |
| 100 | 0.157 | 0.023 | 0.260 | 0.123 |
| 1,000 | 0.475 | 0.061 | 1.705 | 0.793 |

These are observations from one GitHub-hosted runner. They are not product guarantees.

## Interpretation

The measured preview path remains small at the required 1,000-feature fixture, while atomic command preparation is of the same order of magnitude. The Registry generation phase is the largest measured diagnostic component at 1,000 features, which is consistent with the contract that every transformed member must be regenerated before any preview or commit is accepted.

No optimization may skip Registry preflight, mutate derived render geometry, weaken all-member atomicity or reuse candidates across stale Store/selection state. A future optimization must preserve:

```text
complete authored-control transform
→ canonicalize every candidate
→ Registry.generate every candidate
→ complete preview or complete rejection
→ one stale-safe BatchEditCommand
```

## Decision

For Milestone 007C:

- keep the direct complete-selection path;
- do not add a persistent transform cache;
- do not add a spatial index for transform preparation;
- do not publish a hard latency SLA;
- retain the benchmark as a required correctness-and-observation job;
- investigate browser frame pacing separately if real UI traces show a problem.

## Limitations

- This is a Node/CI interaction-layer microbenchmark, not browser frame time, MapLibre projection time, DOM/SVG overlay time or GPU time.
- The fixture contains only `arrow.straight` and one 15-degree clockwise rotation profile.
- Preview timings include complete Registry preflight but exclude MapLibre projection and rendering.
- Command preparation creates and validates the atomic command but does not execute Store listeners, History notifications, renderer work or browser painting.
- RSS includes Node allocator and garbage-collector behavior and is not retained heap.
- Runner scheduling, CPU frequency and JIT behavior can change repeated measurements.
- The values are evidence for this exact source head, not a universal performance guarantee.

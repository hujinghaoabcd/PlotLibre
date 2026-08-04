# PlotLibre Performance Evidence

本目录保存可复现的性能测量方法、解释和冻结的原始数据。

## Current records

| Record | Scope | Status |
|---|---|---|
| [`region-selection-resolver-benchmark.md`](./region-selection-resolver-benchmark.md) | 007B screen-region resolver；100 / 1,000 / 10,000 全候选压力轮廓 | measured |
| [`data/2026-08-04-region-selection-resolver-ci.json`](./data/2026-08-04-region-selection-resolver-ci.json) | CI #457 原始 schema v2 JSON | immutable evidence |

## Rules

- benchmark 与 correctness tests 分开解释；
- GitHub-hosted runner 结果只能作为观察证据，不能作为硬实时保证；
- headline latency 必须来自无细粒度探针的路径；
- instrumented profile 必须明确标记，不得假装是无扰动分解；
- 每份报告必须记录 source SHA、workflow SHA、环境、fixture、重复次数和限制；
- 原始 artifact 有过期时间时，必须在仓库中冻结关键 JSON；
- 在没有真实浏览器证据前，不因单个 microbenchmark 引入持久空间索引或复杂缓存。

## Reproduce

```bash
npm install
npm run benchmark:region-selection
```

生成结果默认写入：

```text
artifacts/region-selection-benchmark/results.json
artifacts/region-selection-benchmark/results.md
```

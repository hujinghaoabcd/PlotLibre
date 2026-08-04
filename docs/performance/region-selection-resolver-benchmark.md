# Region-Selection Resolver Benchmark

日期：2026-08-05（UTC+8）  
范围：Milestone 007B-P  
状态：首个可复现的 CI resolver microbenchmark 证据  
原始数据：`docs/performance/data/2026-08-04-region-selection-resolver-ci.json`

## 1. 结论

本次测量覆盖 100、1,000 和 10,000 个 `arrow.straight` 对象，并刻意让所有对象同时成为 broad-phase candidate 和 exact hit。这是“候选数最坏情况”压力轮廓，而不是典型视口或混合文档。

| Store 对象 / 唯一候选 | 渲染查询行 | headline median | headline p95 | median candidates/s | 采样次数 |
|---:|---:|---:|---:|---:|---:|
| 100 | 200 | 2.399 ms | 5.308 ms | 37,002 | 30 |
| 1,000 | 2,000 | 10.961 ms | 18.246 ms | 89,292 | 24 |
| 10,000 | 20,000 | 109.308 ms | 119.182 ms | 90,517 | 20 |

在该运行环境与轮廓下，1,000 → 10,000 候选的 headline median 从 10.961 ms 增长到 109.308 ms，表现为接近候选数线性增长。10,000 个全候选、全命中的单次解析约为 0.11 秒量级，但这不是浏览器交互延迟承诺。

## 2. 决策

当前继续保留已合并的架构：

```text
MapLibre rendered index broad phase
→ plotId 去重
→ Store/document order 归一化
→ Registry.generate
→ 屏幕投影
→ 精确语义几何相交
```

**暂不增加第二套持久空间索引。** 原因：

1. 当前测量没有包含真实 `queryRenderedFeatures()` tile/style 索引耗时；
2. 轮廓故意让候选数等于 Store 大小，不能代表 broad phase 正常缩减后的成本；
3. 10,000 候选的压力结果说明候选数是主要尺度变量，但不能证明维护第二索引的复杂度已经必要；
4. 持久索引还需要正式的创建、更新、删除、批事务、导入、撤销/重做和样式生命周期失效设计；
5. 当前没有浏览器主线程帧预算、实际地图视口候选率或混合符号族证据。

## 3. 测量证据

```text
GitHub Actions CI:       #457 / 30933193884
benchmark job:           92072709871
source branch head:      2fca8812e206f799c3580380f4e1cd3ed3a73aa8
workflow merge checkout: 5a0678fdf6e8e8497e977ffc522292652bc0d4e7
artifact id:             8901993992
artifact SHA-256:        baedae5c338698903f06c5cbb58ce07bd9f96e7bc6e2468ba76cd28a925ba52a
artifact expiry:         2026-08-18T17:17:32Z
```

运行环境：

```text
Node.js:       v22.23.1
OS:            Linux 6.17.0-1020-azure x64
CPU:           AMD EPYC 7763 64-Core Processor
logical CPUs:  4
runner memory: 15.61 GiB
```

永久保存的 JSON 不依赖短期 artifact 保留期。

## 4. Fixture

```text
symbol:                    arrow.straight
controls per feature:      2
Store sizes:               100 / 1,000 / 10,000
rendered rows per feature: 2
candidate ratio:           100%
exact-hit ratio:           100%
projection:                deterministic linear CSS-pixel-like adapter
region:                    one rectangle containing all generated candidates
```

每个对象会生成两个可选择几何，因此投影几何数分别为 200、2,000 和 20,000。重复渲染行用于验证 tile/layer duplicate 去重；最终结果仍按 Store/document order 返回。

## 5. 计时方法

Headline total 使用**无细粒度计时探针**的真实 resolver 调用：

```text
resolver.resolve(regionRing, regionBounds)
```

headline median、p95、mean、min、max 和 throughput 均来自这组无探针运行。

另有 7 次独立的 instrumented diagnostic profile，用于观察 Registry generation、project calls 和剩余管线的大致分布。诊断 profile 会引入探针开销，因此：

- 不得与 headline total 直接相加或相减；
- 不得将 `nonIsolatedRemainder` 等同于纯 exact-intersection 时间；
- 不得把极小的 query-adapter 时间解释为真实 MapLibre 查询速度。

## 6. 诊断结果

| 候选数 | profile generate median | profile project median | profile non-isolated remainder median | peak additional RSS |
|---:|---:|---:|---:|---:|
| 100 | 0.535 ms | 0.111 ms | 1.594 ms | 5.852 MiB |
| 1,000 | 2.220 ms | 0.810 ms | 10.444 ms | 23.996 MiB |
| 10,000 | 20.870 ms | 8.083 ms | 94.859 ms | 65.195 MiB |

RSS 是 Node allocator/GC 观察值，不是 retained-heap 测量，也不能跨不同 runner 直接比较。

## 7. 可复现入口

本地：

```bash
npm install
npm run benchmark:region-selection
```

输出：

```text
artifacts/region-selection-benchmark/results.json
artifacts/region-selection-benchmark/results.md
```

CI：

```text
.github/workflows/region-selection-benchmark.yml
```

该 workflow 同时支持 `workflow_call` 与手动 `workflow_dispatch`。常规 CI 将它作为独立 benchmark job 调用，并上传 JSON/Markdown artifact。Benchmark 只验证脚本与结果完整性，不设置延迟阈值。

## 8. 限制

- 不是浏览器 frame-time、GPU 或 MapLibre worker benchmark；
- 不测真实 `queryRenderedFeatures()` 的 tile/style index 延迟；
- 不包含 DOM/SVG overlay 绘制；
- 不包含 pointer event、状态订阅或 selection overlay 刷新；
- 只使用 `arrow.straight`，未覆盖复杂曲线、圆弧、闭合区域和 compound geometry；
- 所有候选均命中，未覆盖低命中率但高候选率；
- GitHub-hosted runner 存在调度和硬件波动；
- 不发布硬实时或交互帧预算保证。

## 9. 下一批性能工作

1. 在真实 Chromium/MapLibre 中分别记录 `queryRenderedFeatures`、resolver total 和 selection commit；
2. 增加 0.1%、1%、10%、100% candidate ratio；
3. 增加混合符号族和高采样曲线/区域；
4. 分离 broad-phase、Store-order normalization、generation、projection、intersection 的低扰动 profile；
5. 在固定硬件上重复测量 median/p95；
6. 只有真实浏览器证据显示当前 broad phase 或 resolver 不能满足明确交互预算时，才设计持久空间索引。

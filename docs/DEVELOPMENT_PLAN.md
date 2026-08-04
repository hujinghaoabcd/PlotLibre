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

禁止编辑派生 GeoJSON 顶点代替 authored controls、部分批量提交、绕过 Registry generation preflight、在设计 PR 混入 runtime、使用旧 head CI，或在没有测量时发布性能保证。

## 当前基线

```text
main SHA:          012d17ac8a8f7e71264ef375511b764cb398d111
workspace:         0.0.22
public symbols:    19 (14 Arrow + 1 Line + 4 Area)
Node tests:        264
Chromium tests:    32
MapLibre Sources:  4
MapLibre Layers:   10
current slice:     007B-P resolver benchmark
current branch:    agent/007b-region-selection-benchmark
current PR:        #45
```

## 已完成里程碑

| 里程碑 | 成果 | 状态 |
|---|---|---|
| 001–006J | Core、History、PlotJSON、MapLibre、geometry 与 19 个符号 | 已完成 |
| 007 Design | professional editing 总体语义 | 已合并 |
| 007A | ordered selection、atomic Store、batch delete、translation | PR #38/#39 |
| 007B Design | box/lasso 语义与算法 | PR #40/#41 |
| 007B Runtime | resolver、DOM overlay、Playground、Chromium | PR #42/#43 |
| 007B Docs | 0.0.22、权威文档与交接 | PR #44 |
| 007B-P | 可复现 benchmark 与索引决策 | PR #45 进行中 |

## 007B 合并证据

```text
PR #42: head 812183a47413bdac554fbd6ca75e1443026ac474
        CI #437 / 30920263173; squash e18183df5be4b98c38ba177e8440b28e859c2c90
PR #43: head f7d9e107221d4ee3fc4278f697a7c0ba84d95a59
        CI #445 / 30924648279; squash f98483d3504ce464c93e5a03a49f7f856d1cc1a0
PR #44: head 49b6bd6e6d99d08c8fae0617a9bf0fb1586b1b8b
        CI #448 / 30927338756; squash 012d17ac8a8f7e71264ef375511b764cb398d111
```

## 007B 已实现边界

```text
CSS-pixel box/lasso
→ MapLibre committed-layer rendered index
→ plotId 去重
→ Store order
→ Registry.generate
→ map.project
→ exact screen intersection
→ one SelectionController.applyMany
```

Selection 保持瞬态，不进入 PlotJSON 或 History。Shift-empty drag 为 additive box；显式 box/lasso 默认 replace；Polygon holes、Multi geometry、fail-closed resolution、DOM/SVG overlay 和 direct lasso retry 均已实现。地图资源仍为 4 Sources / 10 Layers。

## 007B-P 测量结果

运行：

```bash
npm run benchmark:region-selection
```

证据：

```text
docs/performance/region-selection-resolver-benchmark.md
docs/performance/data/2026-08-04-region-selection-resolver-ci.json
CI #457 / 30933193884
source head 2fca8812e206f799c3580380f4e1cd3ed3a73aa8
Node v22.23.1; AMD EPYC 7763; 4 logical CPUs
```

| 唯一候选 | median | p95 |
|---:|---:|---:|
| 100 | 2.399 ms | 5.308 ms |
| 1,000 | 10.961 ms | 18.246 ms |
| 10,000 | 109.308 ms | 119.182 ms |

该 fixture 为 100% `arrow.straight`、100% candidate、100% hit 的压力轮廓。Headline 来自无探针 resolver；诊断阶段使用独立 instrumented runs。它不测真实 MapLibre tile/style query、浏览器 frame、GPU 或 DOM overlay，因此不是交互延迟承诺。

## 索引决策

当前继续使用 MapLibre rendered index 作为 broad phase，**暂不增加持久自定义空间索引**。未来索引提案必须先具备：

- 真实 Chromium/MapLibre end-to-end 测量；
- 0.1%、1%、10%、100% candidate ratio；
- 混合符号族和高采样曲线/区域；
- add/update/remove/batch/import/undo/redo 的失效设计；
- 明确且未满足的交互预算。

## PR #45 合并门槛

```text
Node 20.19 / 22
264 Node tests
Playground typecheck/build
handover contract
benchmark job + JSON/Markdown artifact
32 Chromium tests
0 unresolved review threads
```

Benchmark job 验证脚本、结果不变量和 artifact，不设置 latency threshold。

## 下一阶段：007C rotation + positive uniform scale

PR #45 合并后，从最新 `main` 创建 design-only 分支，先冻结：pivot、clockwise angle、positive uniform scale `[0.01,100]`、handle geometry、gesture priority、preview/cancel、全成员 Registry preflight、atomic batch、undo/redo 和地理失败策略。禁止提前实现 reflection、non-uniform scale、groups、locks、snapping 或新符号。

## 后续工程任务

1. 开源许可证与协调发布流程；
2. PlotJSON JSON Schema 与 migration；
3. docs/Registry/test baseline 自动一致性；
4. 真实浏览器 candidate-ratio benchmark；
5. Playground code splitting；
6. npm package boundary review；
7. source/build/deploy/live 验证分离；
8. 分支清理自动化或手工说明。

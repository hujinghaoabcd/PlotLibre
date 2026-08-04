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
main SHA:          2f8ea72749ecfdadbc354216d6e411e81bfecee1
workspace:         0.0.22
public symbols:    19 (14 Arrow + 1 Line + 4 Area)
Node tests:        264
Chromium tests:    32
MapLibre Sources:  4
MapLibre Layers:   10
completed:         007A + 007B + 007B-P
current slice:     007B-P post-merge documentation synchronization
current branch:    agent/007b-benchmark-post-merge-finalization
runtime:           prohibited
next milestone:    007C rotation + positive uniform scale design
```

## 已完成里程碑

| 里程碑 | 成果 | 状态 |
|---|---|---|
| 001–006J | Core、History、PlotJSON、MapLibre、geometry 与 19 个符号 | 已完成 |
| 007 Design | professional editing 总体语义 | 已合并 |
| 007A | ordered selection、atomic Store、batch delete、translation | PR #38/#39 |
| 007B Design | box/lasso 语义与算法 | PR #40/#41 |
| 007B Runtime | resolver、DOM overlay、Playground、Chromium | PR #42/#43 |
| 007B Docs | 0.0.22 与权威文档 | PR #44 |
| 007B-P | 可复现 resolver benchmark 与索引决策 | PR #45 已合并 |

## 007B-P 合并证据

```text
PR:                   #45
validated head:       69a2c87767ea5ea2312ab101455bed06069639d0
CI:                   #464 / 30933921135
Node 20.19 / 22:      success
Node tests:           264 passed
benchmark job:        success
benchmark artifact:   8902285519
Chromium tests:       32 passed
threads:              0
squash SHA:           2f8ea72749ecfdadbc354216d6e411e81bfecee1
```

`main` was explicitly compared with the squash SHA and was identical.

## 007B 与 007B-P 当前边界

Runtime pipeline：

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

Selection 保持瞬态，不进入 PlotJSON 或 History。地图资源仍为 4 Sources / 10 Layers。

Measured pressure profile：

| 唯一候选 | median | p95 |
|---:|---:|---:|
| 100 | 2.399 ms | 5.308 ms |
| 1,000 | 10.961 ms | 18.246 ms |
| 10,000 | 109.308 ms | 119.182 ms |

证据：

```text
docs/performance/region-selection-resolver-benchmark.md
docs/performance/data/2026-08-04-region-selection-resolver-ci.json
```

该测量是 100% `arrow.straight`、100% candidate、100% hit 的 Node/CI 压力轮廓，不是浏览器延迟承诺。

### 索引决策

当前继续使用 MapLibre rendered index 作为 broad phase，暂不增加持久自定义空间索引。未来索引提案必须具备真实 Chromium/MapLibre end-to-end 数据、不同 candidate ratio、混合复杂符号、明确交互预算和完整失效设计。

## 下一阶段：Milestone 007C

从最终 post-merge `main` 创建 **design-only** 分支。设计 PR 必须冻结：

1. rotation/scale canonical-state boundary；
2. complete-selection pivot；
3. positive clockwise angle convention；
4. positive uniform scale range `[0.01, 100]`；
5. rotation and scale handle geometry；
6. screen pointer-to-transform mathematics；
7. drawing、handle、translation、region、transform、camera priority；
8. transient preview、Escape and lifecycle cancellation；
9. all-member canonicalization and Registry generation preflight；
10. one atomic BatchEditCommand and exact undo/redo；
11. antimeridian、high-latitude、large-extent and invalid-member failure policy；
12. required Node/Chromium tests and performance boundaries。

007C design PR 禁止：

- runtime implementation；
- reflection or non-uniform scale；
- groups、locks、visibility or z-order；
- snapping；
- touch-specific transforms；
- new symbols；
- PlotJSON schema shortcuts。

## 后续阶段

- 007C runtime：只在设计合并并完成 post-merge synchronization 后开始；
- 007D groups/locks/visibility/z-order：必须先设计正式 PlotJSON schema 与 migration；
- snapping、touch transforms、real-browser performance profiles：独立切片。

## 跨阶段工程任务

1. 开源许可证与协调发布流程；
2. PlotJSON JSON Schema 与 migration；
3. docs/Registry/test baseline 自动一致性；
4. 真实浏览器 candidate-ratio benchmark；
5. Playground code splitting；
6. npm package boundary review；
7. source/build/deploy/live 验证分离；
8. 分支清理自动化或手工说明。

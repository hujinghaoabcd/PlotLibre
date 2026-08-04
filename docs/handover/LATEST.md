# PlotLibre Development Handover — Milestone 006J Ready Candidate

日期：2026-08-04  
仓库：`hujinghaoabcd/PlotLibre`  
实现基线：`main@0cae0efe7e4877ade23028a7224c6c6daee16b9b`  
活跃分支：`agent/006j-circular-arc-family`  
活跃 PR：`#34 Add circular arc family`  
Workspace：`0.0.20`  
状态：006J runtime、19 类 Playground、Sector semantic guide、权威文档和 immutable handover 已完成；候选 run #335 全绿，等待包含 immutable handover 的最终 current-head CI

## Current state

```text
workspace:          0.0.20
MapLibre GL JS:     6.0.0
Node.js:            20.19+
public symbols:     19
Arrow Definitions:  14
Line Definitions:   1
Area Definitions:   4
Node tests:         184
Chromium tests:     28
base main SHA:      0cae0efe7e4877ade23028a7224c6c6daee16b9b
active branch:      agent/006j-circular-arc-family
active PR:          #34
```

新增公共 Definitions：

```text
line.circular-arc@1.0.0
area.circular-segment@1.0.0
area.sector@1.0.0
```

延期：

```text
area.lune
```

Canonical state 仍为：

```text
plot definition + authored controls + parameters + style + metadata
```

Circumcenter、radius、angles、sweep、arc samples、sector derived endpoint、closing chord/ring 和 semantic guide paths 均为派生状态。

## Completed in this milestone

- 设计通过 PR #33 合并；
- 实现 local-metre three-point circular frame；
- 实现 scale-aware circumcircle 与 maximum-radius policy；
- 实现 exact `start → through → end` 双子弧采样；
- 支持 minor/major、clockwise/counterclockwise、crossing 0° 和 reversal；
- 实现 `line.circular-arc@1.0.0` open LineString；
- 实现 `area.circular-segment@1.0.0` arc+chord Polygon；
- 实现 `area.sector@1.0.0` center/radius-start/end-bearing model；
- Sector 第三控制点距离不改变半径；
- 实现 explicit `sweepDirection`；
- 实现 local-only coordinate-mode gate；
- duplicate、collinear、unstable、excessive-radius、unsupported extent 和 invalid topology fail closed；
- 无 two-point fallback、singular degradation、hidden control movement 或 silent geodesic switch；
- 新增 `lineSymbols` 并保持现有 catalog arrays；
- `builtInSymbols` 扩展为 19；
- Registry、PlotJSON 和 create/replace/import preflight 完整；
- Playground 新增三类 selector、samples 和 fixed-three instructions；
- production / `basemap=none` 加载 19 类 samples；
- base `?e2e=1` 保持原九类 compatibility surface；
- full E2E 增加 `circular=1`；
- 新增通用 `PlotDefinition.deriveSemanticGuidePaths(feature)`；
- Sector 声明 `center → end-bearing handle` guide；
- MapLibre 新增 `plotlibre-handle-guide` dashed layer；
- guide 在 complete draft、selection 和 handle drag 显示；
- guide 不进入 committed source、Store、History、PlotJSON 或 committed RenderBundle；
- style reload 恢复 3 Sources、8 Layers、committed features、handles 和 guides；
- workspace 提升到 `0.0.20`；
- README、AGENTS、路线图、Playground、interaction、design/algorithm indexes 已同步；
- 新增 immutable handover：`2026-08-04-milestone-006j-circular-arc-family.md`。

## Validation

权威候选 run：

```text
GitHub Actions run: 30892995606 (#335)
validated head:     941bf399620200959a5958137c8d0e3a7b1db0f2
Node 20.19:         success
Node 22:            success
TypeScript:         success
Node tests:         184 passed / 0 failed
Playground typecheck: success
Playground build:   success
handover contract:  success
Chromium tests:     28 passed / 0 failed
```

Chromium 日志：

```text
Running 28 tests using 1 worker
28 passed (1.9m)
```

该 run 验证了完整 runtime、guide API、workspace 0.0.20、19 类生产 samples 和当时全部权威文档。随后只新增 immutable handover 并更新本 current-state 文件，没有扩大 runtime scope。

最终 merge gate 仍要求对包含 immutable handover 的 current head 再执行：

```text
Node 20.19:        success
Node 22:           success
Node tests:        184 passed
Chromium tests:    28 passed
Playground build: success
handover contract: success
unresolved threads: 0
```

PR #34 在最终文档 head 全绿前保持 Draft。

## Next tasks

1. 触发包含 immutable handover 与本 `LATEST.md` 的最终 CI；
2. 确认 184 Node、28 Chromium、build 和 handover contract 全绿；
3. 确认 unresolved review threads = 0；
4. 更新 PR #34 body 为完整纵向切片和最终 run；
5. 标记 Ready；
6. 使用 validated expected head SHA squash merge；
7. 记录真实 squash SHA；
8. 需要时创建 documentation-only post-merge finalization；
9. 从最终 `main` 创建 Milestone 007 professional editing design branch；
10. 不在 PR #34 中增加 true lune、geodesic circular fallback、pincer hardening 或 route-head variants。

## Risks and decisions

- `line.circular-arc` 是首个非 Arrow open LineString public Definition；
- Sector authored bearing handle 通常不位于 rendered endpoint，guide 是必要语义解释；
- `deriveSemanticGuidePaths` 是新增 public Definition hook，必须保持 backward compatible；
- renderer layer count 从 7 增至 8；
- circular 1.0 不支持 antimeridian、polar、large-extent 或 geodesic small-circle behavior；
- near-collinear controls 通过 determinant 和 circumradius policy fail closed；
- true mathematical lune 不能与 circular segment 混同；
- packages 仍为 `UNLICENSED`；
- root workspace 与 public package versions 尚未统一；
- PlotJSON 尚缺正式 JSON Schema 和 migration framework；
- Store/History 尚无 multi-object transaction、persistence 或 general rollback；
- production JS bundle 约 1,081 kB，需要后续 code splitting；
- connector 无法删除 merged branches；
- Pages deployment 与 live manual verification 必须分别确认。

Continuation：继续在 `agent/006j-circular-arc-family` / PR #34 完成最终 head CI、Ready 和 squash merge。不要扩大范围。

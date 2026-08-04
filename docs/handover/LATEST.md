# PlotLibre Development Handover — Milestone 006J Implementation Candidate

日期：2026-08-04  
仓库：`hujinghaoabcd/PlotLibre`  
实现基线：`main@0cae0efe7e4877ade23028a7224c6c6daee16b9b`  
活跃分支：`agent/006j-circular-arc-family`  
活跃 PR：`#34 Add circular arc family`  
Workspace：`0.0.20`  
状态：三个 circular Definitions、19 类 Playground 和 Definition-driven Sector guide 已完成；正在进行最终 current-head 184/28 验证与交接冻结

## Current state

```text
workspace:          0.0.20
MapLibre GL JS:     6.0.0
Node.js:            20.19+
public symbols:     19
Arrow Definitions:  14
Line Definitions:   1
Area Definitions:   4
Node target:         184
Chromium target:     28
base main SHA:       0cae0efe7e4877ade23028a7224c6c6daee16b9b
active branch:       agent/006j-circular-arc-family
active PR:           #34
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

- 设计已通过 PR #33 合并；
- 独立实现 local-metre three-point circular frame；
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
- 无 two-point committed fallback、singular degradation、hidden control movement 或 silent geodesic switch；
- 新增 `lineSymbols`，保持 `arrowSymbols`/`areaSymbols` compatibility；
- `builtInSymbols` 扩展为 19；
- Registry、PlotJSON、create/replace/import generation preflight 保持完整；
- Playground 新增三类 selector、南京 samples 和 fixed-three instructions；
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
- README、AGENTS、路线图、Playground、interaction 和算法/设计索引已同步。

## Validation

已取得的稳定阶段证据：

```text
Run #316 / 30891224702
validated head: 7f49ae0c73b6ada113cd6d8c5a42354c0209c330
Node 20.19:       success
Node 22:          success
Node tests:       182 passed / 0 failed
Playground build: success
handover check:   success
Chromium tests:   27 passed / 0 failed
production:       19 sample types rendered
```

Guide 扩展后的 run #324 证明：

```text
184 Node tests discovered
183 passed
1 failed
```

唯一失败是历史 style-reload 测试仍固定断言 7 layers，而新 guide layer 使正确数量为 8。该测试已更新为：

```text
layers = 8
plotlibre-handle-guide exists and is a line layer
```

Guide 扩展本身的 Node tests 已通过，包括：

- Definition path contract；
- draft and selected guide source；
- committed/PlotJSON isolation。

最终 current-head merge gate：

```text
Node 20.19:        success
Node 22:           success
Node tests:        184 passed
Chromium tests:    28 passed
Playground build: success
handover contract: success
unresolved threads: 0
```

PR #34 在上述 current-head gate 全绿前保持 Draft。

## Next tasks

1. 运行包含 guide-layer regression、workspace 0.0.20 和全部当前文档的 CI；
2. 修复任何真实 TypeScript、Node、Playground 或 Chromium regression；
3. 确认精确基线为 184 Node / 28 Chromium；
4. 新增 immutable 006J implementation handover；
5. 对包含 immutable handover 的最终 head 再执行完整 CI；
6. 确认 unresolved review threads = 0；
7. 更新 PR #34 body 为完整纵向切片和权威 run；
8. 标记 Ready；
9. 使用 validated expected head SHA squash merge；
10. 记录实际 squash SHA，并在需要时创建 documentation-only post-merge finalization；
11. 从最终 `main` 开始 Milestone 007 professional editing design；
12. 不在 PR #34 中增加 true lune、geodesic circular fallback、pincer hardening 或 route-head variants。

## Risks and decisions

- `line.circular-arc` 是首个非 Arrow open LineString public Definition；
- Sector authored bearing handle 通常不位于 rendered endpoint，必须保留 guide 解释；
- `deriveSemanticGuidePaths` 是新增 public Definition hook，后续兼容性必须稳定；
- guide layer 增加 MapLibre layer count 到 8；
- circular version 1.0 不支持 antimeridian、polar、large-extent 或 geodesic small-circle behavior；
- near-collinear controls 通过 determinant 和 circumradius policy fail closed；
- true mathematical lune 不能与 circular segment 混同；
- packages 仍为 `UNLICENSED`；
- root workspace 与 public package versions 尚未统一；
- PlotJSON 尚缺正式 JSON Schema 和 migration framework；
- Store/History 尚无 multi-object transaction、persistence 或 general rollback；
- Playground bundle 超过 1 MB，后续需 code splitting；
- connector 无法删除 merged branches；
- Pages deployment 与 live manual verification 必须分别确认。

Continuation：继续在 `agent/006j-circular-arc-family` / PR #34 完成 current-head CI、immutable handover、Ready 和 squash merge。不要扩大符号范围。

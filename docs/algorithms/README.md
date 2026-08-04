# PlotLibre Algorithm Records

本目录记录复杂参数化符号和共享几何组的独立算法说明、来源边界、退化输入策略与测试要求。

每份记录至少包含：

```text
public Definition or shared algorithm
canonical authored controls
mathematical construction
coordinate-mode policy
derived geometry boundary
parameter contract
failure policy
clean-room references and revisions
license review
code reuse declaration
tests and deterministic fixtures
```

目录中的公式和行为说明用于解释 PlotLibre 的独立实现，不代表允许复制参考项目源码。通用政策见 `../ALGORITHM_POLICY.md`。

## 当前算法记录

| 文档 | 公共符号或共享基础 | 状态 |
|---|---|---|
| `arrow-fine.md` | `arrow.fine` | 已实现 |
| `arrow-fine-tailed.md` | `arrow.fine.tailed` | 已实现 |
| `arrow-assault-direction.md` | `arrow.assault-direction` | 已实现 |
| `arrow-curved.md` | `arrow.curved` | 已实现 |
| `arrow-attack.md` | AttackArrow frame | 已实现 |
| `arrow-attack-tailed.md` | `arrow.attack.tailed` | 已实现 |
| `arrow-double.md` | `arrow.double` | 已实现 |
| `arrow-pincer.md` | `arrow.pincer` | 已实现 |
| `arrow-squad-combat.md` | `arrow.squad-combat` | 已实现 |
| `arrow-route-corridor.md` | route/corridor PathRibbon | 已实现 |
| `arrow-route-multihead.md` | bidirectional/double-head route | 已实现 |
| `closed-action-area.md` | closed curve/gathering place | 已实现 |
| `circular-arc-foundation.md` | circular arc/segment/sector shared frame | 已实现于 PR #34，最终验证阶段 |

基础通用几何另见：

```text
../GEOMETRY_FOUNDATION.md
../ALGORITHM_POLICY.md
```

## Milestone 006J 实现状态

`packages/geometry/src/circular-arc.ts` 已按照 `circular-arc-foundation.md` 独立实现：

- order-independent local projection origin；
- scale-aware three-point circumcentre；
- finite radius policy；
- exact start/through/end directed sweep；
- minor/major 和 clockwise/counterclockwise selection；
- crossing-0° normalization；
- two-sub-arc exact-through sampling；
- `segmentsPerCircle` density-only parameter；
- circular arc LineString；
- circular-segment arc+chord ring；
- directed sector frame/ring；
- end-bearing distance isolation；
- counterclockwise/simple Polygon validation；
- local-only coordinate-mode rejection。

Public Definitions：

```text
line.circular-arc@1.0.0
area.circular-segment@1.0.0
area.sector@1.0.0
```

Deferred：

```text
area.lune
```

## Clean-room provenance

固定 references：

```text
sakitam-fdd/ol-plot@c919e60b4edeaeca53c08f9552f793b2ae9537f0
sakitam-fdd/maptalks.plot@37dab8d0dd31650540146e1e0f03f54982f01799
```

两者均已核对 MIT License。用途只限 observable behavior、traditional terminology 和 independent test expectations。Code reuse：`none`。

PlotLibre 不采用参考实现的：

- two-point committed fallback；
- collinear polyline fallback；
- circular-segment triangle degradation；
- implicit positive-only sweep helper；
- hidden control movement；
- engine-specific class structure。

## Semantic guide extension

Sector 的 end-bearing handle 通常不在 rendered endpoint 上。006J 因此增加通用 Core hook：

```text
deriveSemanticGuidePaths(feature)
```

MapLibre 将该纯 WGS84 path 作为 transient dashed guide 渲染。该机制不属于 circular geometry 本身，不进入 Store、History、PlotJSON 或 committed RenderBundle。

## 006J fixture coverage

Node target 184：

- minor/major arcs；
- clockwise/counterclockwise；
- crossing 0°；
- exact through-point；
- reversed traversal；
- density isolation；
- minor/major circular-segment area；
- sector derived endpoint；
- end-bearing distance isolation；
- duplicate/collinear/excessive-radius rejection；
- antimeridian/high-latitude/large-extent rejection；
- Registry/PlotJSON；
- semantic guide and style reload；
- historical regressions。

Chromium target 28：

- actual circular arc line；
- actual circular-segment fill/outline；
- actual sector fill/outline；
- fixed-three draft/completion；
- actual radial guide；
- guide excluded from committed source；
- 19-symbol production sample matrix；
- historical interaction and rendering regressions。

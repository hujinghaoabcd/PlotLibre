# PlotLibre Milestone 006J Handover — Circular Arc Family Design

日期：2026-08-04  
仓库：`hujinghaoabcd/PlotLibre`  
设计基线：`main@b3a1a18c5aaf0b26a4c7c5e42a6e307eaa331873`  
分支：`agent/006j-arc-sector-lune-design`  
Workspace：`0.0.19`  
状态：语义、数学、provenance 与测试矩阵已冻结为设计候选；无运行时代码

## Milestone purpose

006J 研究传统标绘库中的 Arc、Sector 和 Lune，并在任何 geometry 或 public Definition 出现前冻结准确命名、canonical controls、方向、坐标策略、failure policy 和测试契约。

该分支只包含 Markdown。它不得创建 geometry、Definition、Registry、PlotJSON、interaction、Playground 或 runtime tests。

## Proposed public scope

```text
line.circular-arc@1.0.0
area.sector@1.0.0
area.circular-segment@1.0.0
```

Deferred:

```text
area.lune
```

## Naming decisions

### Circular arc

传统 `Arc` 输出 open LineString，因此 public category 使用：

```text
line.circular-arc
```

而不是 `area.arc`。

### Circular segment versus lune

两个参考库的 `Lune/弓形` 均生成一条 selected circular arc 和一条 closing chord。该几何是 circular segment / 圆弓形，不是由两条圆弧围成的 mathematical lune。

因此 PlotLibre 使用：

```text
area.circular-segment
```

Version 1.0 不添加误导性 `area.lune` compatibility alias。True lune 需要独立 two-arc controls 和 topology design，延期处理。

## Reference and license review

固定 revisions：

```text
sakitam-fdd/ol-plot
c919e60b4edeaeca53c08f9552f793b2ae9537f0
MIT License, Copyright 2017 sakitam-fdd

sakitam-fdd/maptalks.plot
37dab8d0dd31650540146e1e0f03f54982f01799
MIT License, Copyright 2017 FDD
```

Reviewed behavior:

- three-control Arc LineString；
- centre/radius/start/end-direction Sector Polygon；
- arc-plus-chord legacy Lune/弓形 Polygon；
- implicit positive sweep helper behavior；
- temporary two-point and singular fallbacks。

PlotLibre code reuse：`none`。

The references are used only for public behavior, terminology and independent test expectations. No helper function, class layout, constant, sampling code or fallback implementation is copied.

## Shared three-point circular frame

For circular arc and circular segment, exact authored controls are:

```text
S  start
T  through-point
E  end
```

The local-metre frame derives a stable circumcentre and radius from three distinct non-collinear controls. The through-point selects the unique direction from `S` to `E` that passes through `T`.

Required behavior:

- exact `S → T → E` output order；
- minor and major arcs；
- clockwise and counterclockwise arcs；
- crossing 0°；
- reversal produces the same footprint in reverse traversal；
- no canonical control reordering；
- no two-point completion；
- no collinear polyline fallback。

Sampling is split into two sub-arcs:

```text
S → T
T → E
```

This guarantees exact through-point preservation.

## Proposed Definition contracts

### `line.circular-arc@1.0.0`

Controls:

```text
0 exact start
1 exact through-point
2 exact end
```

Output:

```text
one open LineString
```

Completion:

```text
fixed 3 controls
automatic on third valid click
```

No fill, chord or closure.

### `area.circular-segment@1.0.0`

Controls:

```text
0 arc/chord start
1 exact through-point on arc
2 arc/chord end
```

Output:

```text
selected circular arc + exact straight chord
one simple Polygon without holes
```

Minor and major segments are allowed when the output remains finite and simple. Winding normalization does not alter canonical controls.

### `area.sector@1.0.0`

Controls:

```text
0 centre
1 exact radius and start-boundary point
2 end-bearing handle
```

Control `2` defines direction only. Its distance from the centre does not define a second radius. The rendered end-boundary point is derived at the radius from control `1` along the bearing from control `0` to control `2`.

Parameter:

```text
sweepDirection: "clockwise" | "counterclockwise"
```

Default candidate:

```text
clockwise
```

Output:

```text
centre → exact start → directed arc → derived end → centre
one simple Polygon without holes
```

The selected/draft feature should expose a transient radial guide from centre through the authored end-bearing handle.

## Shared parameter candidate

```text
segmentsPerCircle: integer [16, 2048]
```

This parameter changes only sampling density. It must not change centre, radius, sweep selection, exact controls or output type.

## Coordinate-mode policy

Version 1.0 is local-metre only. Generation must begin with coordinate-mode analysis and reject when the controls are not local.

Reject:

- antimeridian crossing；
- high-latitude input；
- extent above the local threshold；
- coincident controls；
- collinear or near-collinear controls；
- non-finite or excessive circumradius；
- ambiguous through sweep；
- zero/full sector sweep。

No silent geodesic fallback. Existing geodesic distance/bearing/destination primitives may support a future Definition version but are not mixed into 1.0.

## Canonical and PlotJSON policy

No candidate Definition reorders controls.

Persist exactly:

```text
plotType
definitionVersion
three authored controls
explicit parameters
style
metadata
revision
```

Never persist:

- circumcentre；
- radius；
- normalized angles；
- inferred direction；
- sampled arc points；
- sector derived end-boundary point；
- closing coordinate；
- winding-normalized ring；
- rendered geometry。

## Failure policy

Fail before Store mutation. Do not:

- commit a two-point line；
- synthesize a third canonical control；
- degrade a collinear arc to a polyline；
- degrade circular segment to a triangle；
- move sector controls onto a common radius；
- silently choose the minor sweep；
- polygonize self-intersection；
- switch to geodesic behavior invisibly。

## Required fixtures before implementation

Shared:

- quarter-circle minor arc；
- three-quarter major arc；
- clockwise and counterclockwise selections；
- crossing 0°；
- exact start/through/end；
- reversed traversal；
- density-only parameter isolation；
- duplicate, collinear and near-collinear rejection；
- excessive circumradius；
- antimeridian, high-latitude and large-extent rejection。

Circular segment:

- minor and major segment Polygon；
- exact chord endpoints；
- finite, closed, counterclockwise, simple ring。

Sector:

- clockwise 90°；
- counterclockwise 270°；
- crossing north/0°；
- end-bearing distance isolation；
- zero/full sweep rejection；
- exact centre and start control；
- derived end at start radius。

Integration:

- independent Registry identifiers；
- PlotJSON authored-control round trips；
- create/replace/import preflight；
- fixed-three drawing and rejection recovery；
- semantic handle drag and one-command undo；
- actual rendered line/fill browser tests；
- full 16-symbol regression suite。

## Files in design slice

```text
docs/design/circular-arc-family.md
docs/algorithms/circular-arc-foundation.md
docs/design/README.md
docs/algorithms/README.md
docs/REFERENCE_LIBRARY_MATRIX.md
AGENTS.md
docs/DEVELOPMENT_PLAN.md
docs/handover/LATEST.md
docs/handover/2026-08-04-milestone-006j-circular-arc-design.md
```

## Design merge gate

The documentation-only PR must pass:

```text
Node 20.19
Node 22
163 Node tests
23 Chromium tests
Playground build
handover contract
0 unresolved review threads
```

## Continuation

After the design PR is squash merged, create from the new final `main`:

```text
agent/006j-circular-arc-family
```

Implementation order:

1. pure circular frame；
2. deterministic Node fixtures；
3. circular arc LineString；
4. circular-segment ring；
5. sector ring；
6. Definitions and Registry；
7. PlotJSON preflight；
8. semantic guides；
9. Playground selectors and samples；
10. actual-rendered Chromium coverage；
11. immutable implementation handover；
12. current-head green and squash merge。

Do not add `area.lune` as an alias. Do not return to pincer hardening or add route-head variants.

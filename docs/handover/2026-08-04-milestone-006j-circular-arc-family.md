# PlotLibre Milestone 006J Handover — Circular Arc Family Implementation

日期：2026-08-04  
仓库：`hujinghaoabcd/PlotLibre`  
设计基线：`main@0cae0efe7e4877ade23028a7224c6c6daee16b9b`  
分支：`agent/006j-circular-arc-family`  
PR：`#34 Add circular arc family`  
候选验证 head：`941bf399620200959a5958137c8d0e3a7b1db0f2`  
候选 CI：run `30892995606` / `#335`  
Workspace：`0.0.20`

## Milestone scope

006J completes the design-to-runtime vertical slice for:

```text
line.circular-arc@1.0.0
area.circular-segment@1.0.0
area.sector@1.0.0
```

Deferred:

```text
area.lune
```

The studied legacy type named `Lune/弓形` is one circular arc plus one straight chord, so PlotLibre uses the mathematically accurate identifier `area.circular-segment`. A true two-arc lune requires a separate future semantic design.

## Public semantic contracts

### Circular arc

```text
0 exact start
1 exact through-point
2 exact end
```

- fixed-three automatic completion；
- one open LineString；
- exact through-point selects the directed minor or major arc；
- no closure, fill or control canonicalization。

### Circular segment

```text
0 arc/chord start
1 exact through-point on selected arc
2 arc/chord end
```

- fixed-three automatic completion；
- selected circular arc plus exact straight chord；
- one finite, counterclockwise, simple Polygon without holes；
- minor and major segments supported。

### Sector

```text
0 center
1 exact radius and start-boundary point
2 end-bearing handle
```

- fixed-three automatic completion；
- control `1` defines the only radius and exact start；
- control `2` defines bearing only；
- the rendered end-boundary point is derived at the start radius；
- `sweepDirection = clockwise | counterclockwise`；
- crossing 0° and sweeps above 180° supported；
- zero/full sweep rejected。

## Geometry implementation

Added:

```text
packages/geometry/src/circular-arc.ts
```

Capabilities:

- local-metre coordinate-mode gate；
- order-independent projection origin；
- scale-aware three-point circumcenter determinant；
- finite minimum/maximum radius policy；
- directed clockwise/counterclockwise angle deltas；
- exact through-point minor/major sweep selection；
- crossing-0° normalization；
- two-sub-arc sampling；
- exact authored endpoint and through-point replacement；
- circular arc LineString construction；
- circular-segment arc+chord ring；
- sector frame and ring；
- end-bearing distance isolation；
- finite, area, winding and simple-ring validation。

Public density parameter:

```text
segmentsPerCircle: integer [16, 2048]
```

It changes only sampling density, never the semantic circle, sweep or exact controls.

## Coordinate and failure policy

Version 1.0 is local-metre only. Full Registry generation rejects before Store mutation for:

- invalid/non-finite WGS84 positions；
- duplicate controls；
- collinear, near-collinear or unstable three-point circles；
- excessive circumradius；
- antimeridian crossing；
- high latitude；
- large extent；
- ambiguous through sweep；
- zero/full sector sweep；
- invalid public parameters；
- degenerate or self-intersecting Polygon。

Forbidden fallbacks:

- committed two-point line；
- synthesized third authored control；
- collinear polyline fallback；
- circular-segment triangle degradation；
- hidden sector control movement；
- automatic minor-sweep override；
- silent geodesic switch；
- polygon repair that changes authored semantics。

## Definitions and Registry

Added:

```text
packages/symbols/src/circular-common.ts
packages/symbols/src/circular-arc.ts
packages/symbols/src/circular-segment.ts
packages/symbols/src/sector.ts
```

Catalog contract:

```text
arrowSymbols:   14
lineSymbols:     1
areaSymbols:     4
builtInSymbols: 19
```

`line.circular-arc` emits line and hit-area roles only. Circular segment and sector emit fill, outline and hit-area roles.

## PlotJSON and preflight

PlotJSON persists exactly:

```text
plotType
definitionVersion
three authored controls
explicit parameters
style
metadata
revision
```

Never persisted:

```text
circumcenter
radius
angles
inferred sweep
arc samples
sector derived endpoint
chord/ring closing coordinate
semantic guide paths
rendered geometry
```

Create, replace and import continue full Registry generation before Store mutation.

## Definition-driven semantic guide paths

Core adds:

```text
PlotDefinition.deriveSemanticGuidePaths(feature)
```

Sector returns:

```text
center → end-bearing handle
```

MapLibre adds:

```text
plotlibre-handle-guide
```

Guide lifecycle:

- included in complete draft source；
- included in selected/drag handles source；
- rendered as dashed line；
- absent from committed source；
- absent from committed Definition RenderBundle；
- absent from Store, History and PlotJSON；
- restored after `style.load` with the complete 8-layer renderer state。

This is a generic Definition hook, not a MapLibre `plotType` special case.

## Playground

Production catalog and sample count:

```text
19 symbols
14 Arrow + 1 Line + 4 Area
```

New options:

```text
三点圆弧
圆弓形区域
扇形区域
```

Full E2E URL:

```text
?e2e=1&squad=1&paths=1&areas=1&circular=1
```

The original `?e2e=1` nine-selector compatibility surface remains unchanged.

## Tests

New or expanded Node coverage includes:

- exact minor and major arcs；
- clockwise/counterclockwise through selection；
- crossing 0°；
- reversed traversal；
- density-only parameter isolation；
- minor/major circular-segment area；
- sector derived endpoint；
- sector end-bearing distance isolation；
- local-coordinate failure policy；
- Registry roles and catalog counts；
- PlotJSON authored-only round trips；
- semantic guide contract and isolation；
- style-reload recovery of 8 layers。

Node suite:

```text
163 → 184
```

New browser coverage includes:

- 19-symbol selector and sample catalog；
- actual circular-arc draft and committed LineString；
- actual circular-segment draft and committed Polygon；
- actual sector draft and committed Polygon；
- authored bearing handle distinct from derived endpoint；
- transient radial guide in draft and selected state；
- guide actual rendering through `plotlibre-handle-guide`；
- guide absence from committed source；
- 19 sample types in committed layers。

Chromium suite:

```text
23 → 28
```

## Candidate validation

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

Browser log:

```text
Running 28 tests using 1 worker
28 passed (1.9m)
```

Because this immutable handover creates a new PR head, PR #34 still requires one final complete CI on the documentation-inclusive head before Ready and merge.

## Clean-room provenance

Fixed references:

```text
sakitam-fdd/ol-plot@c919e60b4edeaeca53c08f9552f793b2ae9537f0
sakitam-fdd/maptalks.plot@37dab8d0dd31650540146e1e0f03f54982f01799
```

Both were reviewed as MIT-licensed. Code reuse: `none`. References were used only for observable behavior, terminology and independent test expectations.

## Architecture decisions

1. open circular output uses `line.circular-arc`；
2. arc+chord area uses `area.circular-segment`；
3. true `area.lune` remains deferred；
4. all three Definitions are fixed-three and schema-driven；
5. no circular control canonicalization；
6. 1.0 local-metre only；
7. complete generation preflight remains the mutation gate；
8. sector bearing handle remains authored even though rendered endpoint is derived；
9. semantic guides are Definition-driven transient paths；
10. MapLibre committed source never includes guides。

## Known risks

- `deriveSemanticGuidePaths` is a new public Definition extension and must remain backward compatible；
- renderer layer count increases from 7 to 8；
- circular 1.0 does not support geodesic small circles, antimeridian or polar extents；
- true two-arc lune remains unimplemented；
- packages remain `UNLICENSED`；
- root workspace and public package versions are not coordinated；
- PlotJSON lacks a formal JSON Schema and migration framework；
- Store/History lacks multi-object transactions and general rollback；
- production JS bundle is about 1,081 kB and needs future code splitting；
- Pages deployment and live manual verification are separate states。

## Continuation

1. run final current-head CI including this handover；
2. confirm 184 Node / 28 Chromium / build / handover green；
3. confirm zero unresolved review threads；
4. update PR #34 body with final head and run；
5. mark Ready；
6. squash merge with validated expected head SHA；
7. record actual squash SHA through a documentation-only finalization if needed；
8. start Milestone 007 professional editing design from final `main`；
9. do not add true lune, geodesic circular fallback, pincer hardening or route-head variants to PR #34。

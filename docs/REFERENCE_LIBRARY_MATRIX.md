# 参考库研究矩阵

## 1. 研究原则

PlotLibre 会系统研究其他标绘与编辑库，但不会把多个库直接拼接为运行时，也不会在许可证不清楚时复制源码。

研究分为：

1. public API and user interaction；
2. symbol/control semantics；
3. state-machine and transaction architecture；
4. documented mathematics and observable behavior；
5. deterministic test expectations。

每次研究必须记录 fixed revision、license、reviewed behavior、PlotLibre differences 和 code-reuse declaration。通用政策见 `ALGORITHM_POLICY.md`。

## 2. 重点参考项目

| 项目 | 主要研究内容 | PlotLibre 吸收方向 | 不直接照搬内容 |
|---|---|---|---|
| `ol-plot` | 传统箭头、区域、圆弧、控制点编辑 | public behavior、传统名称、控制点约定 | OpenLayers Feature 继承、fallback 和源码表达 |
| `maptalks.plot` | 态势符号、旗帜、集结地、圆弧族 | 符号目录、中文术语、交叉验证 | Maptalks 对象模型、singular degradation |
| Terra Draw | Mode lifecycle、selection、adapter separation | engine-independent selection/gesture state | ordinary GeoJSON as canonical source、源码实现 |
| MapLibre-Geoman | editing events、selection、toolbar/mode separation | professional MapLibre UX and events | direct generated-geometry editing、runtime dependency |
| Mapbox GL Draw | simple/direct select、whole-feature drag、box select | input arbitration、mode tests、DOM region UX | Mapbox-specific Store/modes、generated vertex editing |
| MapLibre GL JS | Sources/Layers、events、project、render queries | native adapter、broad-phase candidate query | engine internals as PlotLibre canonical state |
| `mil-sym-ts` | MIL-STD/APP-6 rendering | optional standards backend | rebuilding standards from scratch |

## 3. 通用地址

- MapLibre GL JS: <https://github.com/maplibre/maplibre-gl-js>
- Terra Draw: <https://github.com/JamesLMilner/terra-draw>
- MapLibre-Geoman: <https://github.com/geoman-io/maplibre-geoman>
- Mapbox GL Draw: <https://github.com/mapbox/mapbox-gl-draw>
- mil-sym-ts: <https://github.com/missioncommand/mil-sym-ts>
- ol-plot: <https://github.com/sakitam-fdd/ol-plot>
- maptalks.plot: <https://github.com/sakitam-fdd/maptalks.plot>

地址存在不代表允许复制；行为研究必须固定到具体 revision。

## 4. Milestone 006J circular references

| 项目 | Revision | License | 审阅范围 | Code reuse |
|---|---|---|---|---|
| `sakitam-fdd/ol-plot` | `c919e60b4edeaeca53c08f9552f793b2ae9537f0` | MIT | Arc、Sector、Lune、arc helpers、LICENSE | none |
| `sakitam-fdd/maptalks.plot` | `37dab8d0dd31650540146e1e0f03f54982f01799` | MIT | Arc、Sector、Lune、arc helpers、LICENSE | none |

006J conclusions：

```text
Arc open output        → line.circular-arc
legacy Lune/弓形       → area.circular-segment
center/radius/bearing  → area.sector
true two-arc lune      → deferred area.lune
```

PlotLibre rejects reference two-point and singular fallbacks and independently implements strict local-metre geometry。

## 5. Milestone 007 professional-editing references

| 项目 | Revision | License | Observable behavior studied | Code reuse |
|---|---|---|---|---|
| `JamesLMilner/terra-draw` | `26d7ec91f071ab5d2bdeab774d14763746cd798b` | MIT，Copyright 2022 James Milner | select mode lifecycle、programmatic select/deselect、adapter/mode separation、whole-feature editing tests | none |
| `geoman-io/maplibre-geoman` | `b177748cac826fc820ff7ea068186f8eb6e0fc3c` | MIT，Copyright 2024 Geoman | MapLibre editing event separation、selection/edit UX、drag/rotate/scale vocabulary、toolbar modes | none |
| `mapbox/mapbox-gl-draw` | `cb0ca464872d8468f0b912a2321f2e0503718c52` | ISC-style，Copyright Mapbox | simple/direct select、whole-feature drag、Shift box selection lifecycle、DOM rectangle、id de-duplication | none |
| `maplibre/maplibre-gl-js` | `v6.0.0` | BSD-3-Clause，Copyright MapLibre contributors | `queryRenderedFeatures` point/bounds input、layer filtering、screen PointLike、project/camera interaction boundaries | none |

### 5.1 Observed common patterns

- selection is explicit interaction state；
- direct control editing and whole-feature editing are distinct；
- drag、rotate、scale、box and delete have separate lifecycle；
- programmatic selection is required；
- keyboard/modifier mappings need explicit policy；
- tests cover mode start/stop、selection、drag and cancellation。

### 5.2 PlotLibre differences

PlotLibre does not adopt generated GeoJSON as canonical edit state。Professional editing is defined around：

```text
authored controls
Registry preflight
atomic Store transactions
selection snapshots
one gesture / one history entry for document mutation
one event for transient selection mutation
```

Specific differences：

- multi-feature transform edits authored controls only；
- every affected feature is canonicalized/generated before document mutation；
- one invalid member rejects the whole document batch；
- selection and region paths are transient and excluded from PlotJSON；
- batch delete undo restores exact document order and selection；
- Store listener errors cannot create untracked mutations；
- region selection uses MapLibre only as broad phase and applies an independent exact screen-geometry narrow phase；
- query result order never becomes selection order；
- group/lock/z-order cannot be hidden in arbitrary metadata；
- no reference source expression、Store structure、mode code or event implementation is copied。

## 6. Milestone 007 behavior matrix

| Capability | Reference pattern | PlotLibre frozen direction |
|---|---|---|
| Single selection | explicit select mode | backward-compatible `selectedId` alias to Primary |
| Multi-selection | mode/programmatic selection | ordered `selectedIds` + final `primaryId` |
| Direct edit | vertex/control mode | Primary authored handles only |
| Whole-object drag | feature translation | one local-metre delta applied to all selected authored controls |
| Batch delete | delete selected features | one atomic transaction and one history entry |
| Undo selection | varies | command stores before/after selection snapshots for document mutations |
| Box selection | Shift box / rendered candidate query | thresholded neutral Shift-empty add plus explicit box mode |
| Lasso | optional mode/plugin behavior | explicit one-shot freehand simple screen lasso |
| Region ordering | renderer/API order varies | dedup by `plotId`, then Store/document order |
| Region hit policy | rendered feature bbox/query | MapLibre broad phase + exact projected semantic geometry |
| Region overlay | DOM or map layer | DOM/SVG screen overlay; no PlotJSON/Source identity |
| Rotation | separate mode/gesture | shared local pivot, all-feature preflight |
| Scale | separate mode/gesture | positive uniform only in first version |
| Lock/group/z-order | product-specific | deferred until formal PlotJSON schema/migration |

## 7. Milestone 007B focused evidence

### 7.1 Mapbox GL Draw observable box behavior

At `cb0ca464872d8468f0b912a2321f2e0503718c52`：

- `boxSelect` is enabled by default；
- Shift mousedown can arm box selection；
- dragPan is disabled/restored around extended interactions；
- a DOM element renders the screen rectangle；
- mouseup queries features in the screen bounding box；
- feature ids are deduplicated before selection；
- box selection adds ids rather than replacing by default。

PlotLibre reuses none of the implementation。Differences frozen for 007B：

- no selection mutation on mousedown；
- 4 CSS-pixel threshold；
- neutral convenience starts only on empty selectable space；
- explicit box mode supports replace/add/toggle/subtract；
- candidate ids normalized by Store order；
- bounding-box query is broad phase only；
- exact generated screen geometry removes lasso/box false positives；
- one effective region completion emits one SelectionChange。

### 7.2 MapLibre GL JS API boundary

MapLibre GL JS `v6.0.0` is the runtime engine baseline。007B uses only public adapter-level behavior：

```text
PointLike screen coordinates
queryRenderedFeatures(screen point or bounds, { layers })
project(WGS84 coordinate)
map/container/pointer lifecycle
```

`layers` explicitly restricts rendered-feature queries。PlotLibre queries committed fill/line/point layers and excludes selection、draft and handle layers。

MapLibre query output is not canonical state and is not trusted for ordering or exact lasso geometry。

### 7.3 Lasso independence

No reviewed reference is treated as the source of PlotLibre lasso mathematics。PlotLibre independently freezes：

```text
2 px sample spacing
1.5 px RDP tolerance
16 px² minimum area
raw and simplified simple-ring validation
non-adjacent crossing/touch/overlap rejection
hole-aware exact geometry intersection
```

## 8. 007B architecture decision matrix

| Question | Frozen decision |
|---|---|
| Where are region points stored? | transient engine-independent screen session |
| Does region enter PlotJSON? | no |
| Does selection enter History? | no |
| Broad phase | MapLibre rendered index over committed layers |
| Narrow phase | Registry-generated geometry projected to screen |
| Geometry style footprint | ignored; semantic centerline/boundary/fill |
| Candidate order | Store/document order |
| Candidate duplicate identity | `plotId` |
| Box overlay | DOM/SVG |
| Lasso overlay | DOM/SVG |
| New MapLibre Sources/Layers | none in 007B v1 |
| Box neutral shortcut | Shift drag from empty space, add default |
| Replace box | explicit one-shot mode |
| Lasso activation | explicit one-shot mode only |
| Invalid lasso | fail closed, selection unchanged, retry allowed |
| Persistent tool mode | deferred |
| Touch | deferred |
| Custom persistent spatial index | deferred pending measurement |

## 9. Unified evaluation dimensions

### Editing

- single/multi selection；
- Primary selection；
- control versus object edit；
- box/lasso；
- translate/rotate/scale；
- groups/locks/z-order；
- snapping；
- keyboard/touch；
- undo/redo and atomic rollback。

### Data

- authored controls retained；
- generated geometry separated；
- transaction ordering；
- selection persistence boundary；
- document schema/migration；
- unresolved relation handling。

### Engineering

- TypeScript and ESM；
- engine-independent state；
- unit/browser tests；
- actual-rendered coverage；
- fixed revision and license audit；
- performance at 100/1,000/10,000 features。

## 10. PlotLibre differentiation

1. MapLibre-native rendering with engine-independent semantic state；
2. authored controls and parameters remain canonical；
3. complete Registry preflight before Store mutation；
4. atomic multi-object commands and undo；
5. transient selection/guide/region overlays；
6. exact distinction between control edit、object transform and region selection；
7. MapLibre broad phase plus independent exact screen narrow phase；
8. Store-order deterministic multi-selection；
9. PlotJSON versioning and future migration；
10. clean-room algorithms and actual-rendered browser validation。

## 11. Follow-up research

- benchmark broad/narrow region selection on 100/1,000/10,000-feature documents；
- review custom index options only after measured candidate/query data；
- study touch region-selection conflict policies；
- review accessibility patterns for keyboard-only region selection；
- freeze collaboration/presence boundaries before CRDT work；
- continue recording exact revisions and licenses for every new behavior reference。

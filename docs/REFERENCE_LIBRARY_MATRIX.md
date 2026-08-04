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
| Terra Draw | Mode lifecycle、selection、drag/rotate/scale、adapter separation | engine-independent selection/gesture state | ordinary GeoJSON as canonical source、源码实现 |
| MapLibre-Geoman | editing events、selection、drag/rotate/scale、toolbar | professional MapLibre UX and events | direct generated-geometry editing、runtime dependency |
| Mapbox GL Draw | simple/direct select、whole-feature drag、mode tests | mode separation、selection behavior、test organization | Mapbox-specific Store/modes、generated vertex editing |
| MapLibre GL JS | Sources/Layers、events、render queries | native adapter and actual-rendered tests | proprietary Mapbox follow-up code |
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
| `JamesLMilner/terra-draw` | `26d7ec91f071ab5d2bdeab774d14763746cd798b` | MIT，Copyright 2022 James Milner | select mode lifecycle、programmatic select/deselect、keyboard-configured delete/rotate/scale、whole-feature editing tests | none |
| `geoman-io/maplibre-geoman` | `b177748cac826fc820ff7ea068186f8eb6e0fc3c` | MIT，Copyright 2024 Geoman | MapLibre editing event separation、selection/edit UX、drag/rotate/scale vocabulary | none |
| `mapbox/mapbox-gl-draw` | `cb0ca464872d8468f0b912a2321f2e0503718c52` | ISC-style，Copyright Mapbox | simple-select/direct-select split、whole-feature drag、selection API and tests | none |

### 5.1 Observed common patterns

- selection is an explicit interaction mode/state；
- direct control editing and whole-feature editing are distinct；
- drag、rotate、scale and delete have separate lifecycle/events；
- programmatic selection is required；
- keyboard mappings need explicit policy；
- tests cover mode start/stop、selection、drag and deletion。

### 5.2 PlotLibre differences

PlotLibre does not adopt generated GeoJSON as canonical edit state。Professional editing is defined around：

```text
authored controls
Registry preflight
atomic Store transactions
selection snapshots
one gesture / one history entry
```

Specific differences：

- multi-feature transform edits authored controls only；
- every affected feature is canonicalized/generated before any mutation；
- one invalid member rejects the whole batch；
- selection is transient and excluded from PlotJSON；
- batch delete undo restores exact document order and selection；
- Store listener errors cannot create untracked mutations；
- group/lock/z-order cannot be hidden in arbitrary metadata；
- no reference source expression、Store structure、mode code or event implementation is copied。

## 6. Milestone 007 behavior matrix

| Capability | Reference pattern | PlotLibre frozen direction |
|---|---|---|
| Single selection | explicit select mode | backward-compatible `selectedId` alias to primary selection |
| Multi-selection | mode/programmatic selection | ordered `selectedIds` + final `primaryId` |
| Direct edit | vertex/control mode | primary feature authored handles only |
| Whole-object drag | feature translation | one local-metre delta applied to all selected authored controls |
| Batch delete | delete selected features | one atomic transaction and one history entry |
| Undo selection | varies by library | command stores before/after selection snapshots |
| Box selection | rendered candidates | intersection policy, dedup by `plotId`, order by Store order |
| Lasso | optional mode/plugin behavior | dedicated simple screen-space lasso, self-intersection rejected |
| Rotation | separate mode/gesture | shared local pivot, all-feature preflight |
| Scale | separate mode/gesture | positive uniform only in first version |
| Lock/group/z-order | product-specific | deferred until formal PlotJSON schema/migration |

## 7. Unified evaluation dimensions

### Editing

- single/multi selection；
- primary selection；
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

## 8. PlotLibre differentiation

1. MapLibre-native rendering with engine-independent semantic state；
2. authored controls and parameters remain canonical；
3. complete Registry preflight before Store mutation；
4. atomic multi-object commands and undo；
5. transient selection/guide overlays；
6. exact distinction between control edit and object transform；
7. PlotJSON versioning and future migration；
8. clean-room algorithms and fixed provenance；
9. actual-rendered browser validation；
10. future snapping、collaboration and standards backends。

## 9. Follow-up research

- benchmark selection APIs on large documents；
- review spatial-index options before box/lasso runtime；
- study touch transform gesture conflict policies；
- review accessibility patterns for keyboard selection and transform handles；
- freeze collaboration/presence boundaries before CRDT work；
- continue recording exact revisions and licenses for every new behavior reference。

# PlotLibre Algorithm Records

本目录记录参数化符号、共享几何基础以及专业编辑事务的独立算法说明、来源边界、失败策略与测试要求。

每份记录至少包含：

```text
public Definition / state model / shared algorithm
canonical authored state
mathematical or transaction construction
coordinate-mode policy
derived/transient boundary
parameter or operation contract
failure and rollback policy
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
| `circular-arc-foundation.md` | circular arc/segment/sector shared frame | 已实现并合并 |
| `batch-edit-transaction.md` | selection、Store transaction、batch commands、translation | 007A 已实现并合并 |
| `screen-region-selection.md` | box/lasso capture、topology、screen intersection、batch intent | 007B 当前设计冻结候选；runtime 禁止 |

## 当前合并基线

```text
main:               d08c56b6687ea64e0c599fd04fd77115d320d8f2
workspace:          0.0.21
public symbols:     19
Node tests:         219 passed
Chromium tests:     30 passed
MapLibre Sources:   4
MapLibre Layers:    10
007A runtime PR:    #38
007A finalization:  #39
```

## 007A transaction foundation

- ordered transient SelectionController；
- exact `PlotStore.applyTransaction()`；
- listener failure isolation；
- selection-aware `BatchEditCommand`；
- exact document-order restoration；
- batch delete；
- local-metre whole-selection translation；
- one command per completed mutation gesture；
- 219 Node / 30 Chromium baseline。

Detailed record: `batch-edit-transaction.md`.

## 007B screen-region algorithm freeze

Detailed record: `screen-region-selection.md`.

### Coordinate domain

```text
CSS-pixel ScreenPoint relative to map container
```

Core and PlotJSON remain free of screen coordinates。

### Frozen numeric policy

```text
box activation threshold: 4 CSS px
lasso sample spacing:     2 CSS px
lasso RDP tolerance:      1.5 CSS px
minimum lasso area:       16 CSS px²
```

### Lasso validation

```text
raw path
→ remove consecutive duplicates
→ reject repeated non-consecutive vertices
→ reject non-adjacent segment crossing/touch/overlap
→ RDP simplify
→ validate simplified ring again
```

Simplification cannot hide an invalid raw loop。

### Candidate resolution

```text
screen region bounds
→ MapLibre queryRenderedFeatures on committed fill/line/point layers
→ plotId de-duplication
→ Store/document-order normalization
→ Registry.generate once per unique candidate
→ map.project generated fills/lines/points
→ exact screen intersection
→ one SelectionController.applyMany event
```

Broad-phase MapLibre return order and tile duplicates never determine selection order。

### Exact geometry policy

- Point center only；
- LineString/MultiLineString segment intersection；
- Polygon/MultiPolygon crossing、containment and hole-aware fill；
- boundary inclusive；
- compound feature selected once when any component intersects；
- CSS line width、point radius、selection overlay、draft、guides and labels ignored；
- generated sampled vertices are authoritative for curved paths；
- any query、generation or projection failure rejects the whole completion。

### Multi-id intent

`SelectionController.applyMany(ids,intent,reason)` must apply replace/add/subtract/toggle in one immutable event。

- replace uses candidate Store order；
- add appends only new ids；
- subtract preserves survivors；
- toggle removes current candidates then appends newly selected candidates in Store order；
- valid empty replace clears；other empty intents no-op；
- region selection never creates History entries。

### Overlay and lifecycle

- box/lasso overlay uses DOM/SVG screen UI；
- no new GeoJSON Source/Layer in 007B v1；
- active gesture cancels on camera、resize、style、Store or external selection change；
- pointer capture and dragPan state restore exactly once；
- boxZoom ownership moves from immediate Shift capture to unified region adapter；
- synthetic post-drag click is suppressed。

## Required 007B fixture families

### Pure Node

- all box drag quadrants and thresholds；
- lasso sampling、area、RDP and topology；
- bow-tie、repeat、touch、overlap rejection；
- Point/Line/MultiLine intersection；
- Polygon containment/crossing/hole exclusion；
- MultiPolygon/compound any-component hit；
- broad-phase duplicate/query-order normalization；
- applyMany intent ordering and Primary behavior；
- one event/no-op；
- fail-closed generation/projection。

### Adapter and Chromium

- Shift click still adds after immediate mousedown mutation is removed；
- Shift-empty drag performs one additive box；
- explicit box replace and modifier overrides；
- lasso exact rejection of bbox false positives；
- invalid lasso changes nothing；
- DOM overlay cleanup；
- pointer capture、dragPan、boxZoom and synthetic click lifecycle；
- region selection followed by translation and batch delete；
- no History mutation from selection alone；
- all historical 219/30 regressions。

## Performance boundary

Functional runtime must generate only unique broad-phase candidates, not every Store feature when candidate count is smaller than document size。

Measured fixtures：

```text
100
1,000
10,000 features
```

Record hardware、OS、browser、viewport、camera、feature mix、generated vertices、candidate count、query time、projection/intersection time、total latency、median and p95。No public latency guarantee before measured evidence。

## Later algorithms

- 007C：local rotation and positive uniform scale around authored-control bounds center；
- 007D：canonical groups/locks/visibility/z-order after PlotJSON migration design。

## Clean-room references

```text
JamesLMilner/terra-draw@26d7ec91f071ab5d2bdeab774d14763746cd798b — MIT
geoman-io/maplibre-geoman@b177748cac826fc820ff7ea068186f8eb6e0fc3c — MIT
mapbox/mapbox-gl-draw@cb0ca464872d8468f0b912a2321f2e0503718c52 — ISC-style
```

007B specifically studies observable Mapbox GL Draw box-select lifecycle、DOM rectangle、dragPan ownership、bounding-box candidate query and id de-duplication。Code reuse：`none`。

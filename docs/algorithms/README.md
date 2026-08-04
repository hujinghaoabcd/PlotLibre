# PlotLibre Algorithm Records

本目录记录参数化符号、共享几何基础以及专业编辑事务的独立算法说明、来源边界、失败策略与测试要求。公式与行为说明用于解释 PlotLibre 的独立实现，不代表允许复制参考源码。

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
| `screen-region-selection.md` | box/lasso capture、topology、screen intersection、batch intent | 设计已通过 PR #40 合并；runtime 下一步 |

## 当前基线

```text
main:               a9b9efc090c01f45133f3f136a0049a97ee52b90
workspace:          0.0.21
public symbols:     19
Node tests:         219
Chromium tests:     30
Sources/Layers:     4 / 10
007B design PR:     #40
validated head:     4a8ee1102bb923801ada95c648a258225ccb9ec4
validated CI:       #413 / 30912109618
```

## 007A algorithm foundation

Detailed record：`batch-edit-transaction.md`.

- ordered transient selection；
- atomic Store transaction；
- listener failure isolation；
- exact-order BatchEditCommand；
- batch delete；
- local-metre whole-selection translation。

## 007B merged screen-region algorithms

Detailed record：`screen-region-selection.md`.

### Numeric policy

```text
box activation:       4 CSS px
lasso sample spacing: 2 CSS px
lasso RDP tolerance:  1.5 CSS px
minimum lasso area:   16 CSS px²
minimum points:       3
```

### Lasso topology

```text
raw samples
→ remove consecutive duplicates
→ reject repeated non-consecutive vertices
→ reject non-adjacent crossing/touch/overlap
→ RDP simplify
→ validate simplified closed ring again
```

Simplification cannot hide an invalid raw loop。

### Broad/narrow candidate resolution

```text
screen bounding box
→ MapLibre committed fill/line/point query
→ plotId dedup
→ Store-order normalization
→ Registry.generate once per unique candidate
→ project fills/lines/points
→ exact screen intersection
```

- Point center；
- LineString/MultiLineString segments；
- Polygon/MultiPolygon crossing and containment with holes；
- compound any-component semantics；
- boundary inclusive；
- CSS stroke/radius and transient layers ignored；
- query/generation/projection failure fails closed。

### Deterministic selection intent

```text
replace  candidates
add      current + new candidates
subtract current survivors
toggle   current survivors + newly selected candidates
```

`SelectionController.applyMany()` must produce at most one immutable event. Region selection is not a History command。

### Screen overlay and lifecycle

- DOM/SVG overlay；
- no new Source/Layer；
- pointer capture and dragPan/boxZoom restoration；
- synthetic click suppression；
- cancel on camera/style/resize/Store/external selection/programmatic lifecycle changes。

## Runtime fixture families

### Pure algorithms

- box quadrant/threshold/degenerate fixtures；
- lasso sample/area/RDP/simple-ring fixtures；
- repeat、bow-tie、touch and overlap rejection；
- Point/Line/MultiLine predicates；
- Polygon crossing/containment/hole exclusion；
- MultiPolygon/compound hit；
- applyMany ordering、Primary and no-op；
- broad-phase duplicate/query-order normalization；
- fail-closed query/generation/projection。

### Adapter/Chromium

- Shift click after immediate mousedown mutation removal；
- neutral additive box；
- explicit replace/toggle/subtract box；
- lasso bbox false-positive removal；
- invalid lasso no mutation；
- DOM overlay/pointer/camera cleanup；
- no History mutation；
- region selection followed by translation/delete/undo；
- all historical regressions。

## Performance boundary

MapLibre rendered index is the first broad phase. Runtime must generate only unique candidates, not every Store feature when candidate count is smaller。

Measured fixtures：`100 / 1,000 / 10,000` features。Record environment、camera、feature mix、vertices、candidate count、query/narrow/total times、median and p95。No hard latency guarantee before measurements。

## Runtime implementation order

```text
screen utilities
→ applyMany
→ exact predicates
→ candidate resolver
→ unified region adapter
→ DOM/SVG overlay
→ public API
→ Playground/E2E/benchmarks
```

Planned branch：`agent/007b-box-lasso-selection` after finalization merges。

## Clean-room references

```text
Terra Draw@26d7ec91f071ab5d2bdeab774d14763746cd798b — MIT
MapLibre-Geoman@b177748cac826fc820ff7ea068186f8eb6e0fc3c — MIT
Mapbox GL Draw@cb0ca464872d8468f0b912a2321f2e0503718c52 — ISC-style
MapLibre GL JS@v6.0.0 — BSD-3-Clause
code reuse: none
```

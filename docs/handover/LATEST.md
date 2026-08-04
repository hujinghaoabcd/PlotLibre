# PlotLibre Development Handover — Milestone 007B Box/Lasso Design Freeze Candidate

日期：2026-08-04  
仓库：`hujinghaoabcd/PlotLibre`  
当前 `main`：`d08c56b6687ea64e0c599fd04fd77115d320d8f2`  
当前分支：`agent/007b-box-lasso-design`  
Workspace：`0.0.21`  
状态：Milestone 007B screen-space box/lasso semantics、algorithms、input arbitration and performance boundary are frozen as a documentation-only candidate；runtime prohibited

## Current state

```text
workspace:          0.0.21
MapLibre GL JS:     6.0.0
Node.js:            20.19+
public symbols:     19 (14 Arrow + 1 Line + 4 Area)
Node tests:         219
Chromium tests:     30
MapLibre Sources:   4
MapLibre Layers:    10
main SHA:           d08c56b6687ea64e0c599fd04fd77115d320d8f2
007A runtime PR:    #38
007A finalization:  #39
current branch:     agent/007b-box-lasso-design
current scope:      documentation-only design freeze
planned runtime:    agent/007b-box-lasso-selection
```

Milestone staging：

```text
007A ordered selection + atomic Store + batch delete + local translation — merged
007B screen-space box/lasso selection — current design
007C local rotation + positive uniform scale — deferred
007D groups/locks/visibility/z-order after PlotJSON migration design — deferred
```

## Completed in this milestone

### Input and mode ownership

- identified conflict between immediate Shift-mousedown add and thresholded Shift box；
- froze replacement with one unified region adapter；
- froze neutral `Shift + empty drag` as additive box convenience；
- froze explicit one-shot box and lasso modes；
- froze replace/add/toggle/subtract modifier override；
- froze intent capture at pointer down；
- froze mouse/pen first and deferred touch；
- froze event priority against draw、handle drag、translation and camera gestures。

### Screen region state

- froze engine-independent `ScreenPoint` and `ScreenBounds`；
- froze region status `idle/armed/active/rejected`；
- kept screen state outside Core、Store、History and PlotJSON；
- froze four-CSS-pixel box activation threshold；
- froze box mutation on pointer up only；
- froze valid-empty intent behavior。

### Lasso mathematics

- sample spacing `2 CSS px`；
- minimum three distinct points；
- minimum absolute area `16 CSS px²`；
- RDP tolerance `1.5 CSS px`；
- raw and simplified simple-ring validation；
- repeated non-consecutive vertices rejected；
- non-adjacent crossing、touch and collinear overlap rejected；
- invalid completion preserves selection and allows one retry。

### One-event selection

- froze `SelectionController.applyMany(ids,intent,reason)` candidate；
- froze Store/document-order candidate input；
- froze replace/add/subtract/toggle ordered algorithms；
- froze one SelectionChange per effective completion；
- froze no event for no-op；
- kept region selection outside CommandHistory。

### Candidate and exact hit pipeline

```text
MapLibre committed-layer bounding-box query
→ plotId de-duplication
→ Store-order normalization
→ Registry.generate once per candidate
→ map.project fills/lines/points
→ exact screen intersection
```

- MapLibre render index is broad phase only；
- query result order and tile duplicates are non-semantic；
- selection/draft/handle/guide/label layers excluded；
- Point、Line、Polygon、Multi and compound predicates frozen；
- Polygon holes respected；
- CSS line width/point radius ignored；
- generated sampled vertices authoritative；
- query/generation/projection failure rejects the whole completion；
- partial selection prohibited。

### Overlay and lifecycle

- froze DOM/SVG screen overlay instead of geographic GeoJSON；
- retained four Sources and ten Layers；
- froze pointer capture、dragPan and boxZoom ownership；
- froze synthetic click suppression；
- froze cancellation on Escape、pointer loss、style、resize、camera、Store、external selection and programmatic lifecycle changes；
- froze Primary handle/guide hide/restore for explicit region mode。

### Performance and provenance

- froze MapLibre rendered index as initial broad phase；
- deferred custom persistent index pending measurement；
- froze 100/1,000/10,000-feature benchmark reporting fields；
- fixed Terra Draw、MapLibre-Geoman、Mapbox GL Draw and MapLibre GL JS references/licenses；
- declared code reuse `none`；
- added dedicated semantic design、algorithm record、reference matrix update and immutable handover。

## Validation

Merged runtime baseline remains：

```text
Node 20.19:         expected unchanged
Node 22:            expected unchanged
Node tests:         219
Chromium tests:     30
Playground build:   required
handover contract:  required
```

The exact final design-branch head has not yet completed CI. The PR must remain Draft until：

```text
Node 20.19 success
Node 22 success
219 Node tests passed
Playground /PlotLibre/ build success
handover contract success
30 Chromium tests passed
zero unresolved review threads
```

## Next tasks

1. open a Draft documentation-only 007B design PR；
2. verify changed files contain no runtime；
3. run full exact-head 219/30 CI；
4. fix only evidence-backed documentation/contract failures；
5. confirm zero unresolved review threads；
6. update PR body with exact validation evidence；
7. mark Ready and Squash and merge with expected head SHA；
8. create documentation-only post-merge finalization from the new main；
9. record actual design squash SHA and final continuation order；
10. create `agent/007b-box-lasso-selection` from the latest final `main`；
11. implement pure screen utilities first；
12. implement `SelectionController.applyMany()` second；
13. implement exact projected predicates third；
14. implement MapLibre resolver and unified region adapter next；
15. add DOM/SVG overlay、public API、Playground、Chromium and measured benchmark report；
16. keep rotation/scale、groups/locks、snapping and new symbols outside 007B。

## Risks and decisions

- current 007A Shift mousedown behavior must be replaced, not supplemented；
- region selection is transient and excluded from History/PlotJSON；
- exact hit semantics use generated geometry, not rendered CSS footprint；
- MapLibre query is broad phase and cannot determine ordering；
- Store order is binding for candidate results；
- valid empty replace clears selection；other empty intents no-op；
- invalid lasso/query/generation/projection fails closed；
- active region cancels when the screen/camera/document frame changes；
- DOM/SVG overlay avoids adding geographic Sources/Layers；
- custom persistent indexing and hard performance claims are deferred until measured evidence；
- touch and contain-only region selection are deferred；
- packages remain `UNLICENSED`；
- workspace/package versions remain uncoordinated；
- production bundle still needs code splitting；
- source/build/deploy/live verification remain separate claims；
- branch deletion may require manual cleanup because the connector does not expose delete-ref here。

Continuation：validate and merge the 007B design only. Do not add runtime to `agent/007b-box-lasso-design`。

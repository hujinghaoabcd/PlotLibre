# PlotLibre Development Handover — Milestone 007B Design Merged / Runtime Next

日期：2026-08-04  
仓库：`hujinghaoabcd/PlotLibre`  
当前 `main`：`a9b9efc090c01f45133f3f136a0049a97ee52b90`  
已合并 PR：`#40 Freeze box and lasso selection semantics`  
合并方式：Squash and merge  
最终设计 head：`4a8ee1102bb923801ada95c648a258225ccb9ec4`  
最终 CI：`#413 / 30912109618`  
Post-merge 分支：`agent/007b-design-post-merge-finalization`  
Workspace：`0.0.21`  
状态：Milestone 007B screen-space box/lasso design 已合并；当前仅同步真实合并状态，下一阶段为独立 runtime implementation

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
main SHA:           a9b9efc090c01f45133f3f136a0049a97ee52b90
007A runtime/docs:  PR #38 / PR #39
007B design PR:     #40
007B design head:   4a8ee1102bb923801ada95c648a258225ccb9ec4
007B design CI:     #413 / 30912109618
planned runtime:    agent/007b-box-lasso-selection
```

Milestone staging：

```text
007A ordered selection + atomic Store + batch delete + local translation — merged
007B box/lasso design — merged; runtime next
007C local rotation + positive uniform scale — deferred
007D groups/locks/visibility/z-order after PlotJSON migration design — deferred
```

## Completed in this milestone

### Design merge discipline

- design branch started from exact `main@d08c56b...`；
- changed exactly 10 Markdown files and no runtime；
- PR #40 remained Draft until exact-head CI completed；
- Node 20.19/22、219 Node、build、handover and 30 Chromium passed；
- unresolved review threads were zero；
- PR was marked Ready only after validation；
- squash merge used expected head SHA；
- actual squash SHA is `a9b9efc090c01f45133f3f136a0049a97ee52b90`。

### Frozen region input

- current immediate Shift-mousedown mutation must be replaced；
- one unified region adapter owns click-versus-box arbitration；
- neutral `Shift + empty drag` performs additive box；
- explicit one-shot box/lasso modes support replace/add/toggle/subtract；
- modifier intent is captured on pointer down；
- drawing、handle drag and translation retain priority；
- touch is deferred。

### Frozen box/lasso mathematics

```text
box threshold:        4 CSS px
lasso sample spacing: 2 CSS px
minimum lasso points: 3
minimum lasso area:   16 CSS px²
RDP tolerance:        1.5 CSS px
```

- raw and simplified lasso rings are both validated；
- repeated non-consecutive vertices reject；
- non-adjacent crossing、touch and collinear overlap reject；
- invalid lasso preserves selection and permits one retry。

### Frozen selection semantics

- one `SelectionController.applyMany()` operation per region completion；
- candidates are deduplicated and ordered by Store/document order；
- replace/add/subtract/toggle algorithms are deterministic；
- one effective completion emits one immutable selection event；
- no-op emits nothing；
- region selection remains outside History and PlotJSON。

### Frozen hit pipeline

```text
queryRenderedFeatures on committed fill/line/point layers
→ plotId dedup
→ Store-order normalization
→ Registry.generate once per unique candidate
→ map.project semantic geometry
→ exact screen intersection
```

- MapLibre query is broad phase only；
- query order and tile duplicates are non-semantic；
- selection、draft、handle、guide and label layers are excluded；
- Point、Line、Polygon、Multi and compound predicates are frozen；
- Polygon holes are respected；
- CSS stroke/radius is ignored；
- query/generation/projection failures reject the whole completion。

### Frozen overlay/lifecycle/performance

- region guides use DOM/SVG screen overlay；
- no new MapLibre Source/Layer in 007B v1；
- active region cancels on pointer、camera、style、resize、Store、selection and programmatic lifecycle changes；
- dragPan、boxZoom and pointer capture restore exactly once；
- synthetic click is suppressed；
- MapLibre rendered index is initial broad phase；
- custom persistent index and hard latency claims wait for measured 100/1,000/10,000-feature evidence。

### Documentation and provenance

- added `docs/design/box-lasso-selection.md`；
- added `docs/algorithms/screen-region-selection.md`；
- added immutable design and post-merge handovers；
- synchronized AGENTS、development plan、interaction model、reference matrix and indices；
- fixed Terra Draw、MapLibre-Geoman、Mapbox GL Draw and MapLibre GL JS revisions/licenses；
- code reuse declared `none`。

## Validation

Design PR final validation：

```text
GitHub Actions run: 30912109618 (#413)
validated head:     4a8ee1102bb923801ada95c648a258225ccb9ec4
Node 20.19:         success
Node 22:            success
Node tests:         219 passed / 0 failed
Playground build:   success
handover contract:  success
Chromium tests:     30 passed / 0 failed
unresolved threads: 0
changed files:      10 Markdown / 0 runtime
merge method:       squash
squash SHA:         a9b9efc090c01f45133f3f136a0049a97ee52b90
```

This post-merge finalization changes documentation only and must independently pass the unchanged 219/30 baseline before merge.

## Next tasks

1. complete this documentation-only post-merge synchronization；
2. open a Draft finalization PR；
3. pass exact-head Node 20.19、Node 22、219 Node、30 Chromium、build and handover checks；
4. confirm zero unresolved review threads；
5. mark Ready and Squash and merge with expected head SHA；
6. create `agent/007b-box-lasso-selection` from the latest final `main`；
7. implement pure screen point、box、lasso、RDP and topology utilities；
8. implement `SelectionController.applyMany()`；
9. implement exact projected Point/Line/Polygon/Multi predicates；
10. implement MapLibre broad-phase resolver and Store ordering；
11. replace immediate Shift capture with unified region adapter；
12. add DOM/SVG overlay and public one-shot APIs；
13. add Playground、actual Chromium and measured benchmark report；
14. preserve the 4 Source / 10 Layer baseline unless a later measured design explicitly changes it；
15. keep rotation/scale、groups/locks、snapping and new symbols outside 007B。

## Risks and decisions

- screen regions are transient UI geometry, not geographic document geometry；
- generated geometry is used for exact hit testing but never becomes authored state；
- Store order determines region result order；
- valid empty replace clears, other empty intents no-op；
- selection changes once and remains outside History；
- query/generation/projection failures fail closed；
- current Shift-mousedown implementation must be replaced rather than supplemented；
- DOM/SVG overlay avoids geographic Source/Layer misuse；
- custom persistent indexing、touch、contain-only selection and persistent region modes are deferred；
- packages remain `UNLICENSED`；
- workspace/package versions remain uncoordinated；
- production bundle still needs code splitting；
- source/build/deploy/live verification remain separate claims；
- branch deletion may require manual cleanup because the connector does not expose delete-ref here。

Continuation：finish the 007B design post-merge finalization, then implement runtime from the latest final `main`. Do not add runtime to the finalization branch。

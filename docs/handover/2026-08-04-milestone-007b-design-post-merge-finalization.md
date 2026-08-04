# PlotLibre Development Handover — Milestone 007B Design Post-Merge Finalization

日期：2026-08-04  
仓库：`hujinghaoabcd/PlotLibre`  
Design PR：`#40 Freeze box and lasso selection semantics`  
Design branch：`agent/007b-box-lasso-design`  
Validated design head：`4a8ee1102bb923801ada95c648a258225ccb9ec4`  
Validated CI：`#413 / 30912109618`  
Squash merge SHA / current main：`a9b9efc090c01f45133f3f136a0049a97ee52b90`  
Finalization branch：`agent/007b-design-post-merge-finalization`  
Workspace：`0.0.21`  
Scope：documentation-only actual-merge synchronization；runtime prohibited

## Purpose

This immutable handover records the actual merge of the Milestone 007B screen-space box/lasso selection design. It replaces pre-merge candidate wording in current-state documents without rewriting the historical design handover.

## Actual merge evidence

```text
PR:                 #40
PR title:           Freeze box and lasso selection semantics
base main:          d08c56b6687ea64e0c599fd04fd77115d320d8f2
final design head:  4a8ee1102bb923801ada95c648a258225ccb9ec4
CI run:             #413 / 30912109618
Node 20.19:         success
Node 22:            success
Node tests:         219 passed
Playground build:   success
handover contract:  success
Chromium tests:     30 passed
review threads:     0 unresolved
changed files:      10 Markdown / 0 runtime
PR state:           Ready before merge
merge method:       Squash and merge
expected head SHA:  4a8ee1102bb923801ada95c648a258225ccb9ec4
squash merge SHA:   a9b9efc090c01f45133f3f136a0049a97ee52b90
```

## Merged design decisions

### Input arbitration

- replace immediate Shift-mousedown mutation with one unified thresholded region adapter；
- neutral `Shift + empty drag` becomes additive box convenience；
- explicit one-shot box/lasso modes support replace/add/toggle/subtract；
- intent captured at pointer down；
- handle drag、translation and active drawing retain priority；
- touch region gestures deferred。

### Box and lasso geometry

```text
box threshold:       4 CSS px
lasso sample spacing:2 CSS px
lasso minimum points:3
lasso minimum area:  16 CSS px²
RDP tolerance:       1.5 CSS px
```

Raw and simplified lasso rings both reject repeated non-consecutive vertices and non-adjacent crossing、touch or overlap。

### One-event selection

`SelectionController.applyMany(ids,intent,reason)` is the frozen candidate for one immutable selection event per effective region completion。Candidate ids are deduplicated and ordered by Store/document order。Region selection remains outside History。

### Broad and narrow phase

```text
MapLibre committed-layer query
→ plotId de-duplication
→ Store-order normalization
→ Registry.generate once per candidate
→ map.project fills/lines/points
→ exact screen intersection
```

MapLibre query is broad phase only。Exact predicates respect Polygon holes and ignore CSS stroke/radius、selection overlays、drafts、guides and labels。Any query/generation/projection failure rejects the whole completion。

### Overlay and lifecycle

- box/lasso guides use DOM/SVG screen overlay；
- no new GeoJSON Source/Layer；
- 4 Source / 10 Layer baseline preserved；
- active region cancels on pointer loss、camera/style/resize、Store/selection change and programmatic lifecycle changes；
- dragPan/boxZoom/pointer capture restore exactly once；
- synthetic post-drag click suppressed。

### Performance boundary

MapLibre rendered index is the initial broad phase。A custom persistent spatial index and hard latency guarantees remain deferred until measured 100/1,000/10,000-feature evidence。

## Reference evidence

```text
Terra Draw@26d7ec91f071ab5d2bdeab774d14763746cd798b — MIT
MapLibre-Geoman@b177748cac826fc820ff7ea068186f8eb6e0fc3c — MIT
Mapbox GL Draw@cb0ca464872d8468f0b912a2321f2e0503718c52 — ISC-style
MapLibre GL JS@v6.0.0 — BSD-3-Clause
code reuse: none
```

## Runtime implementation branch

After this finalization merges, create from the latest `main`：

```text
agent/007b-box-lasso-selection
```

Binding order：

1. pure screen point、box、lasso、RDP and topology utilities；
2. `SelectionController.applyMany()`；
3. exact projected Point/Line/Polygon/Multi predicates；
4. MapLibre broad-phase resolver and Store ordering；
5. unified region adapter replacing immediate Shift capture；
6. DOM/SVG overlay and pointer lifecycle；
7. public one-shot box/lasso API；
8. Playground controls/status；
9. actual Chromium flows；
10. measured benchmark report；
11. documentation、immutable handover、current-head CI and squash merge。

## Runtime non-goals

007B runtime must not include：

- rotation or scale；
- groups、locks、visibility or z-order；
- snapping；
- new symbols；
- touch region gestures；
- contain-only region selection；
- persistent region tool mode；
- unmeasured performance claims。

## Finalization validation gate

This post-merge branch changes documentation only and must independently pass：

```text
Node 20.19
Node 22
219 Node tests
Playground /PlotLibre/ build
handover contract
30 Chromium tests
zero unresolved review threads
```

## Risks and decisions

- screen regions remain transient and non-geographic；
- generated geometry is used for hit testing only, never authored state；
- Store order determines region result order；
- selection remains outside History and PlotJSON；
- query/generation/projection failures fail closed；
- active screen regions cancel when camera/document frame changes；
- custom indexing and touch remain deferred；
- packages remain `UNLICENSED`；
- branch deletion may require manual cleanup because the connector does not expose delete-ref here。

Continuation：merge this documentation-only finalization, then begin the 007B runtime branch from the latest final `main`。

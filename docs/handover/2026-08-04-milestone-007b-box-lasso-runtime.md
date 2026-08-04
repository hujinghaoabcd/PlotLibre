# PlotLibre Milestone 007B Runtime Handover — Box and Lasso Selection

日期：2026-08-04  
仓库：`hujinghaoabcd/PlotLibre`  
状态：runtime、Playground 与真实浏览器验收均已合入 `main`  
最终 `main`：`f98483d3504ce464c93e5a03a49f7f856d1cc1a0`  
Workspace：`0.0.22`（由后续 documentation-only finalization 同步）

## 1. Merge evidence

### Runtime foundation

```text
PR:               #42 Add box and lasso selection runtime foundation
validated head:   812183a47413bdac554fbd6ca75e1443026ac474
CI:               #437 / 30920263173
Node 20.19:       success
Node 22:          success
Node tests:       264 passed
Chromium tests:   30 passed
threads:          0 unresolved
merge method:     squash
squash SHA:       e18183df5be4b98c38ba177e8440b28e859c2c90
```

### Playground and browser finalization

```text
PR:               #43 Complete box and lasso Playground validation
validated head:   f7d9e107221d4ee3fc4278f697a7c0ba84d95a59
CI:               #445 / 30924648279
Node 20.19:       success
Node 22:          success
Node tests:       264 passed
Playground build: success
handover check:   success
Chromium tests:   32 passed
threads:          0 unresolved
merge method:     squash
squash SHA:       f98483d3504ce464c93e5a03a49f7f856d1cc1a0
```

`main` was explicitly compared with `f98483d...` after merge and was identical.

## 2. Public behavior

PlotLibre now supports three region-entry paths:

```text
Shift + empty primary drag → one-shot additive box
plot.startBoxSelection()   → explicit one-shot box, default replace
plot.startLassoSelection() → explicit one-shot lasso, default replace
```

Public surface:

```ts
plot.regionSelection
plot.regionSelectionSnapshot
plot.regionSelectionRejection
plot.startBoxSelection(options?)
plot.startLassoSelection(options?)
plot.cancelRegionSelection()
```

`plot.selectionModifiers` remains a compatibility alias for the same region controller.

Explicit mode intent can be configured and can be overridden at pointerdown:

```text
Alt > Ctrl/Cmd > Shift > configured/default intent
```

Touch region gestures, contain-only policy and persistent region-tool modes remain deferred.

## 3. Selection semantics

Region selection changes transient selection state only. It never mutates:

```text
PlotFeature
feature revision
PlotStore document order
CommandHistory
PlotJSON
Definition RenderBundle
```

`SelectionController.applyMany(ids, intent, reason)` performs one deterministic operation:

- input ids are validated and deduplicated before mutation;
- adapter candidate order is PlotStore/document order;
- replace uses candidates exactly;
- add appends only newly selected candidates;
- subtract preserves survivor order;
- toggle removes current candidates, then appends newly selected candidates;
- final selected id is Primary;
- one effective completion emits one immutable change;
- no-op emits nothing;
- empty replace clears; empty add/subtract/toggle are no-op.

## 4. Screen-region mathematics

All region coordinates are CSS pixels.

```text
box activation threshold: 4 px Euclidean distance
lasso sample spacing:      2 px
minimum distinct points:   3
minimum lasso area:        16 px²
RDP tolerance:             1.5 px
boundary policy:           inclusive
```

Lasso validation:

```text
raw samples
→ consecutive-duplicate cleanup
→ distinct-point validation
→ simple-ring validation
→ minimum-area validation
→ RDP simplification
→ repeat simple-ring and area validation
→ implicit closure
```

Repeated non-consecutive vertices, non-adjacent crossings, touches and collinear overlaps reject. Invalid completion preserves selection and keeps explicit mode available for direct retry.

## 5. Broad and narrow phases

MapLibre is used only as a candidate index:

```text
region bounds
→ queryRenderedFeatures(committed fill/line/point layers)
→ plotId extraction and deduplication
→ existing-id filtering
→ PlotStore-order normalization
```

Exact hit testing then regenerates each unique candidate from canonical Store state:

```text
Registry.generate(feature)
→ select semantic fill/line/point output
→ map.project every coordinate
→ exact screen-region intersection
```

Rules:

- Point uses the projected semantic center;
- line uses projected segments;
- polygons support boundary crossing and both containment directions;
- Polygon holes are respected;
- Multi geometries use any-component semantics;
- one compound PlotFeature selects at most once;
- CSS line width, point radius and hit-area geometry are ignored;
- labels, drafts, guides, handles and selection overlays are excluded;
- query order and tile duplicates never define result order;
- query, generation or projection failure rejects the whole completion;
- partial selection is prohibited.

## 6. Overlay and resource boundary

The box/lasso guide is an absolutely positioned DOM/SVG overlay:

```text
CSS-pixel coordinates
pointer-events:none
aria-hidden:true
clipped by the map container
removed on complete/cancel/destroy
independent from style.load
```

007B adds no geographic source or layer. The renderer remains:

```text
MapLibre Sources: 4
MapLibre Layers:  10
```

## 7. Pointer and lifecycle ownership

The unified controller replaced immediate Shift-mousedown selection mutation.

- feature Shift-click remains a normal click-add path;
- Shift-empty drag becomes box selection only after threshold;
- synthetic post-region click is suppressed;
- MapLibre boxZoom is reserved while the controller is installed and restored on destroy;
- dragPan is disabled only for an active region gesture and restored exactly once;
- pointer capture is released exactly once;
- Escape, pointercancel, unexpected lost capture, style/resize/camera start, Store changes, external selection changes and document lifecycle operations cancel safely;
- entering or cancelling explicit mode preserves existing selection membership.

### Browser-discovered lifecycle correction

Real Chromium revealed that intentional `releasePointerCapture()` emits `lostpointercapture`. The first implementation treated that event as unexpected cancellation and erased a newly created rejected lasso state.

The final controller ignores pointer-cancel/lost-capture events after it has intentionally cleared its owned pointer id. Unexpected loss while ownership is active still cancels. This correction is included in PR #43 and covered by the 32-test Chromium run.

## 8. Playground

The Playground toolbar now exposes:

```text
框选
套索
取消区域
```

The existing status area reports armed, active, rejected, retry and completion states. Real Chromium verifies:

- explicit box replace;
- overlay visibility during drag and cleanup after completion;
- exact selected ids and Primary;
- invalid lasso preserves selection and rejected state after pointer release;
- direct retry in the same explicit mode;
- final Store-order selection result.

## 9. Validation inventory

Node coverage includes:

- box normalization, all drag directions, threshold and degenerate no-op;
- lasso sampling, cleanup, signed area, RDP and topology;
- bow-tie, repeated vertex, touch and overlap rejection;
- Point, LineString, Polygon, MultiLineString and MultiPolygon intersections;
- Polygon-hole exclusion and hole-boundary crossing;
- `applyMany` ordering, Primary, immutability, validation and no-op;
- rendered-query deduplication and Store-order normalization;
- generation/projection/query fail-closed behavior;
- explicit/neutral region modes, modifier override and lifecycle cleanup;
- rejected-session direct retry;
- all historical symbol, Store, History, translation and rendering regressions.

Final baseline:

```text
Node tests:       264
Chromium tests:   32
public symbols:   19
MapLibre Sources: 4
MapLibre Layers:  10
```

## 10. Performance boundary

The resolver exposes candidate and projection metrics, and the implementation generates only unique broad-phase candidates. A custom persistent spatial index was deliberately not added.

The required 100 / 1,000 / 10,000 feature latency study is not yet published. No median, p95 or hard latency guarantee is claimed in this handover. A future benchmark must record hardware, OS/browser, viewport/camera, feature mix, generated vertices, rendered-query time, exact-test time, candidate count and total latency before an indexing decision.

## 11. Clean-room provenance

Reference revisions used during design:

```text
JamesLMilner/terra-draw@26d7ec91f071ab5d2bdeab774d14763746cd798b — MIT
geoman-io/maplibre-geoman@b177748cac826fc820ff7ea068186f8eb6e0fc3c — MIT
mapbox/mapbox-gl-draw@cb0ca464872d8468f0b912a2321f2e0503718c52 — ISC-style
maplibre/maplibre-gl-js@v6.0.0 — BSD-3-Clause
```

Observed concepts were public mode lifecycle, Shift box behavior, DOM region UI, rendered-feature queries and adapter boundaries. Code reuse: `none`.

## 12. Deferred scope

```text
007B follow-up: measured scale benchmark and indexing decision
007C: local-metre rotation and positive uniform scale
007D: groups, locks, visibility and z-order after formal PlotJSON migration design
```

Also deferred: snapping, touch region gestures, contain-only policy, persistent selection tools, new symbols, package release coordination and Playground code splitting.

## 13. Continuation

1. merge the 0.0.22 documentation-only finalization after unchanged 264/32 current-head CI;
2. measure 100 / 1,000 / 10,000 feature region selection before adding a persistent index;
3. begin 007C as a separate design-only branch;
4. preserve the current semantic-state, fail-closed and one-operation boundaries.

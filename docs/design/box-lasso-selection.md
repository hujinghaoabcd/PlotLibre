# Milestone 007B — Box and Lasso Selection Semantic Design

Status: implemented and merged through PR #42/#43.  
Current merged baseline: `main@f98483d3504ce464c93e5a03a49f7f856d1cc1a0`.  
Workspace: `0.0.22`.  
Validation baseline: 264 Node tests and 32 Chromium tests.

## 1. Scope

Milestone 007B adds deterministic screen-space region selection while preserving the canonical state boundary:

```text
box/lasso gesture
→ transient screen region
→ broad-phase rendered candidate ids
→ exact projected semantic-geometry intersection
→ one ordered SelectionController mutation
```

Included:

- additive Shift-empty box convenience;
- explicit one-shot box and lasso modes;
- replace/add/toggle/subtract intents;
- engine-independent screen-region math and session state;
- deterministic one-event multi-id selection;
- MapLibre broad-phase candidate lookup;
- exact projected semantic-geometry predicates;
- transient DOM/SVG overlay;
- rejection, retry and lifecycle policy;
- Playground controls and real Chromium validation.

Excluded:

- rotation or scale;
- groups, locks, visibility or z-order;
- snapping or angle constraints;
- touch region gestures;
- persisted region geometry;
- contain-only policy;
- persistent region-tool mode;
- new public symbols.

## 2. Canonical-state invariant

Region selection changes transient interaction state only.

It never modifies:

```text
PlotFeature
PlotFeature.revision
PlotStore document order
CommandHistory
PlotJSON
Definition RenderBundle
```

The region path, rectangle, projected candidate geometry, broad-phase query results, rejection and overlay are derived state.

## 3. Input ownership

The former immediate Shift-add-on-mousedown path was replaced by one unified region controller.

Entry paths:

```text
Shift + empty primary drag → one-shot additive box
explicit box mode          → default replace
explicit lasso mode        → default replace
```

Public API:

```ts
plot.regionSelection
plot.regionSelectionSnapshot
plot.regionSelectionRejection
plot.startBoxSelection(options?)
plot.startLassoSelection(options?)
plot.cancelRegionSelection()
```

`selectionModifiers` remains a compatibility alias for the same controller.

Modifier priority at pointerdown:

```text
Alt > Ctrl/Cmd > Shift > configured/default intent
```

Feature Shift-click remains click-add. The region controller never mutates selection on pointerdown.

## 4. Gesture priority

```text
active drawing
> authored-handle drag
> active whole-selection translation
> active region gesture
> explicit region mode
> neutral Shift-empty box arm
> selected-body translation
> click selection
> camera gesture
```

Convenience box starts only from empty selectable space. Lasso is explicit-mode only. Touch is deferred.

## 5. Screen geometry

All region coordinates are CSS pixels relative to the map canvas.

```text
box activation threshold: 4 px Euclidean distance
lasso sample spacing:      2 px
minimum distinct points:   3
minimum area:              16 px²
RDP tolerance:             1.5 px
predicate boundary:        inclusive
```

Box selection requires positive width and height. Sub-threshold or degenerate boxes are no-op.

Lasso processing:

```text
raw samples
→ remove consecutive duplicates
→ validate point count
→ reject repeated non-consecutive vertices
→ reject non-adjacent crossing/touch/overlap
→ validate area
→ RDP simplify
→ repeat point/topology/area validation
→ implicit closure
```

Invalid completion preserves selection and leaves explicit mode available for direct retry.

## 6. Selection application

Region completion calls one engine-independent operation:

```ts
selection.applyMany(ids, intent, "box" | "lasso")
```

Invariants:

- every id exists before mutation;
- ids are deduplicated by first occurrence;
- adapter results are ordered by PlotStore/document order;
- replace uses candidates exactly;
- add appends only new candidates;
- subtract preserves survivors;
- toggle removes current candidates then appends newly selected candidates;
- the final selected id becomes Primary;
- one effective completion emits one immutable change;
- no-op emits nothing;
- region selection never creates History.

Empty candidates:

```text
replace  clear
add      no-op
subtract no-op
toggle   no-op
```

## 7. Broad phase

MapLibre's rendered feature index is candidate lookup only:

```text
region bounds
→ queryRenderedFeatures(committed fill/line/point layers)
→ extract plotId
→ deduplicate tile/layer duplicates
→ filter existing Store ids
→ reorder by Store/document order
```

Excluded from broad phase:

```text
selection layers
draft layers
handles and guides
labels
transient region overlay
```

MapLibre query order never defines semantics.

## 8. Exact narrow phase

Each unique broad-phase candidate is regenerated from canonical Store state:

```text
Registry.generate(feature)
→ semantic fills + lines + points
→ map.project every coordinate
→ exact screen-region intersection
```

Rules:

- Point uses its projected semantic center;
- line uses projected segments;
- polygon supports boundary crossing and both containment directions;
- Polygon holes are respected;
- Multi geometries use any-component semantics;
- compound PlotFeature selects at most once;
- boundary is inclusive;
- CSS stroke width and point radius are ignored;
- labels, hit-area geometry, guides, drafts, handles and selection overlays are ignored;
- generated sampled vertices are authoritative for curved paths;
- query, generation or projection failure rejects the complete operation;
- partial selection is prohibited.

## 9. Overlay and renderer boundary

The region guide is an absolutely positioned DOM/SVG overlay:

```text
CSS-pixel coordinates
pointer-events:none
aria-hidden:true
clipped to map container
independent from style.load
removed on complete/cancel/destroy
```

No new MapLibre Source or Layer was added. The merged baseline remains four Sources and ten Layers.

## 10. Pointer and lifecycle

The unified controller owns:

- MapLibre boxZoom disable/restore;
- four-pixel threshold arbitration;
- pointer capture;
- dragPan disable/restore during active gestures;
- synthetic post-region click suppression;
- explicit-mode handle visibility.

Cancel safely on:

```text
Escape
pointercancel
unexpected lost pointer capture
style.load
resize
camera movement start
Store mutation
external selection revision
draw/import/clear/undo/redo
destroy
```

Intentional pointer release is special: Chromium emits `lostpointercapture` after `releasePointerCapture()`. The final controller clears its owned pointer id first and ignores that resulting event, preserving a new rejected state. Unexpected loss while ownership is active still cancels.

## 11. Rejection contract

Stable codes:

```text
SELECTION_REGION_TOO_SMALL
SELECTION_REGION_LASSO_TOO_FEW_POINTS
SELECTION_REGION_LASSO_SELF_INTERSECTS
SELECTION_REGION_QUERY_FAILED
SELECTION_REGION_CANDIDATE_GENERATION_FAILED
SELECTION_REGION_PROJECTION_FAILED
```

Rejection never changes selection or document state. Empty candidates are valid outcomes.

## 12. Playground acceptance

The Playground exposes:

```text
框选
套索
取消区域
```

The status area reports armed, active, rejected, retry and completion states.

Real Chromium acceptance covers:

- explicit box replace;
- overlay visibility and cleanup;
- exact selected ids and Primary;
- invalid lasso preserves selection and rejected state after pointer release;
- direct retry in the same explicit mode;
- Store-order result;
- all historical drawing/editing flows.

## 13. Validation evidence

```text
PR #42 runtime foundation
head:  812183a47413bdac554fbd6ca75e1443026ac474
CI:    #437 / 30920263173
Node:  264 passed
E2E:   30 passed
merge: e18183df5be4b98c38ba177e8440b28e859c2c90

PR #43 Playground/browser finalization
head:  f7d9e107221d4ee3fc4278f697a7c0ba84d95a59
CI:    #445 / 30924648279
Node:  264 passed
E2E:   32 passed
merge: f98483d3504ce464c93e5a03a49f7f856d1cc1a0
```

Both PRs had zero unresolved review threads and used expected-head squash merge.

## 14. Performance decision boundary

A custom persistent spatial index is not part of 007B. The MapLibre rendered index remains the broad phase.

Before an indexing decision, measure 100 / 1,000 / 10,000 feature fixtures and report environment, feature mix, generated vertices, Store size, unique candidate count, query time, generation/projection time, exact-intersection time, total latency, median and p95.

No hard latency guarantee is currently published.

## 15. Deferred work

```text
007B-P measured scale benchmark and indexing decision
007C local rotation and positive uniform scale
007D groups/locks/visibility/z-order after PlotJSON migration design
```

Snapping, touch region gestures, contain-only policy, persistent region tools and new symbols remain separate work.

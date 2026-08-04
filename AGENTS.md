# PlotLibre Development Contract

This file defines mandatory rules for every developer, coding agent and future conversation.

## 1. Product model

PlotLibre is a semantic parametric plotting framework, not a generic GeoJSON toolbar.

Canonical feature state:

```text
PlotDefinition + authored controlPoints + parameters + style + metadata
```

Rendered geometry, samples, inferred frames, selection overlays, transform previews, screen-region guides and semantic guides are derived output. They must never replace authored state or be serialized as canonical PlotJSON.

## 2. Dependency direction

```text
core <- geometry <- symbols
core <- interaction
core + interaction <- maplibre
public packages <- playground / wrappers
```

- Core cannot depend on MapLibre, DOM or screen coordinates;
- geometry cannot depend on Store, UI, events or map engines;
- interaction state and commands remain engine-independent;
- MapLibre translates screen/map gestures and performs adapter queries;
- Playground consumes public APIs only;
- circular dependencies are prohibited.

## 3. Current merged baseline

```text
main SHA:           a9b9efc090c01f45133f3f136a0049a97ee52b90
workspace:          0.0.21
public symbols:     19 (14 Arrow + 1 Line + 4 Area)
Node baseline:      219
Chromium baseline:  30
MapLibre Sources:   4
MapLibre Layers:    10
Milestone 007A:     merged through PR #38/#39
Milestone 007B design: merged through PR #40
007B design head:   4a8ee1102bb923801ada95c648a258225ccb9ec4
007B design CI:     #413 / 30912109618
```

Current branch:

```text
agent/007b-design-post-merge-finalization
scope: actual-merge documentation synchronization only
runtime: prohibited
```

Planned runtime branch after finalization:

```text
agent/007b-box-lasso-selection
```

## 4. Selection state boundary

Selection is transient interaction state, not PlotJSON document state.

```ts
interface SelectionSnapshot {
  readonly selectedIds: readonly string[];
  readonly primaryId?: string;
  readonly revision: number;
}
```

Invariants:

- ids are unique existing feature ids;
- order is acquisition order;
- Primary is the final selected id;
- empty selection has no Primary;
- one effective operation emits one immutable change;
- no-op emits nothing;
- Store remove/clear reconciles once;
- only Primary exposes authored handles and Definition guides;
- all selected features may expose lightweight derived overlays;
- selection does not increment PlotFeature revision;
- selection is excluded from PlotJSON;
- historical restoration issues a fresh monotonic interaction revision.

Backward-compatible aliases remain:

```text
plot.select(id | undefined)
plot.selectedId
interaction.select(id | undefined)
interaction.selectedId
```

## 5. Existing click intents

```text
plain click       → replace / make-primary
Shift             → add
Ctrl or Cmd       → toggle
Alt               → subtract
empty plain click → clear
```

Modifier priority:

```text
Alt > Ctrl/Cmd > Shift > default
```

The SelectionController never reads DOM or MapLibre events. Adapters normalize intent.

## 6. 007B screen-region invariant

Box and lasso selection operate in CSS-pixel screen coordinates and change selection only.

They must not mutate:

```text
PlotFeature
PlotFeature revision
Store/document order
CommandHistory
PlotJSON
Definition RenderBundle
```

Region paths, projected candidate geometry, query results, DOM overlays and rejections remain transient.

## 7. Unified Shift/region adapter

The merged 007A `MapLibreSelectionModifierCapture` performs Shift-add on mousedown. 007B runtime must replace it rather than layer another region listener on top.

The replacement adapter must:

1. own MapLibre boxZoom disable/restore;
2. never mutate selection on pointer down;
3. arm click or box intent;
4. wait for the four-CSS-pixel threshold;
5. commit exactly one click or region operation;
6. suppress the synthetic post-drag click;
7. restore pointer capture and dragPan exactly once.

## 8. Region modes and gesture ownership

007B supports:

```text
neutral Shift + empty primary drag → one-shot additive box
explicit one-shot box mode         → default replace
explicit one-shot lasso mode       → default replace
```

Explicit modes support replace/add/toggle/subtract through configured intent plus modifier override.

Priority:

```text
active drawing
> authored-handle drag
> active whole-selection translation
> active region gesture
> explicit region-mode start
> neutral Shift-empty box arm
> selected-body translation
> click selection
> camera gesture
```

Convenience box starts only from empty selectable space. Shift click on a plot remains click-add. Lasso is explicit-mode only. Touch region gestures are deferred.

## 9. Box contract

```text
activation threshold: Euclidean distance >= 4 CSS px
selection mutation:   pointer up only
valid geometry:       positive width and height
```

Sub-threshold or degenerate gestures preserve selection and emit nothing.

Valid empty result:

```text
replace  → clear
add      → no-op
subtract → no-op
toggle   → no-op
```

## 10. Lasso contract

```text
sample spacing:       2 CSS px
minimum distinct pts: 3
minimum area:         16 CSS px²
RDP tolerance:        1.5 CSS px
```

Validation order:

```text
raw path
→ remove consecutive duplicates
→ reject repeated non-consecutive vertices
→ reject non-adjacent crossing/touch/overlap
→ RDP simplify
→ validate simplified closed ring again
```

Simplification cannot hide an invalid raw loop. Invalid completion changes no selection, shows transient rejection and keeps explicit lasso mode armed for one retry.

## 11. One-event multi-id selection

Region selection must use one engine-independent operation, not per-id add/toggle calls.

Required API direction:

```ts
selection.applyMany(
  ids: readonly string[],
  intent: SelectionIntent,
  reason: "box" | "lasso",
): SelectionSnapshot;
```

Adapter inputs are deduplicated and ordered by Store/document order.

Algorithms:

- replace: candidate ids;
- add: current ids plus only new candidates;
- subtract: current survivors;
- toggle: current survivors plus newly selected candidates;
- one effective completion emits one SelectionChange;
- no-op emits nothing;
- region selection never creates a History entry.

## 12. Broad phase

MapLibre's rendered index is the first 007B broad phase:

```text
region screen bounds
→ queryRenderedFeatures(bounds, committed fill/line/point layers)
→ read plotId
→ deduplicate
→ filter existing Store ids
→ reorder by Store/document order
```

Exclude selection, draft, handle, guide and label layers. Query order and tile duplicates never define selection order.

No second persistent spatial index is added before measured evidence and an invalidation design.

## 13. Exact screen narrow phase

Every broad-phase candidate is regenerated from canonical Store state:

```text
Registry.generate(feature)
→ selectable fills + lines + points
→ map.project every coordinate
→ exact screen-region intersection
```

Rules:

- Point uses projected center;
- line uses projected segments;
- polygon crossing and containment respect holes;
- Multi geometries use any-component semantics;
- compound PlotFeature selects once;
- boundary is inclusive;
- CSS line width and point radius are ignored;
- labels, semantic guides, drafts and selection overlays are ignored;
- generated sampled vertices are authoritative for curved paths;
- query/generation/projection failure rejects the whole completion;
- partial selection is prohibited.

## 14. Region overlay

Box/lasso guides use an absolutely positioned DOM/SVG overlay attached to the map container.

Requirements:

```text
CSS-pixel coordinates
pointer-events:none
aria-hidden:true
clipped to map container
removed on complete/cancel/destroy
independent from style.load
```

007B version 1 adds no GeoJSON Source or Layer. The merged four-Source/ten-Layer baseline remains unchanged.

## 15. Lifecycle cancellation

Cancel active region gesture without selection mutation on:

```text
Escape
pointercancel / lost pointer capture
style.load
resize
camera movement start
Store change
external selection revision change
draw/import/clear/undo/redo
destroy
```

Selection membership is preserved when entering or cancelling explicit region mode. Explicit mode hides Primary handles/guides while active and restores them on exit.

## 16. Stable rejection codes

```text
SELECTION_REGION_TOO_SMALL
SELECTION_REGION_LASSO_TOO_FEW_POINTS
SELECTION_REGION_LASSO_SELF_INTERSECTS
SELECTION_REGION_QUERY_FAILED
SELECTION_REGION_CANDIDATE_GENERATION_FAILED
SELECTION_REGION_PROJECTION_FAILED
```

Empty candidates are valid, not rejection.

## 17. Existing atomic document editing

`PlotStore.applyTransaction()`, listener-error isolation, `BatchEditCommand`, batch delete and local-metre whole-selection translation remain unchanged from 007A.

Region selection is not a document command and must not be added to History.

## 18. Performance and scale

Functional implementation must generate only unique broad-phase candidates when candidate count is smaller than Store size.

Measured fixtures:

```text
100
1,000
10,000 features
```

Record hardware, OS, browser, viewport/camera, feature mix, generated vertices, candidate count, query time, exact-intersection time, total latency, median and p95. Do not publish a hard latency guarantee before measurement.

## 19. Required runtime validation

007B runtime must add coverage for:

- box normalization/thresholds;
- lasso sampling/RDP/topology;
- exact Point/Line/Polygon/Multi intersection including holes;
- applyMany intent ordering and Primary behavior;
- Shift click after removing immediate mousedown mutation;
- neutral additive box;
- explicit box/lasso modes and modifier override;
- DOM overlay cleanup and pointer lifecycle;
- query duplicate/order normalization;
- fail-closed generation/projection;
- no History mutation;
- box/lasso followed by translation/delete/undo;
- all historical regressions.

Every PR must pass on its exact current head:

```text
Node 20.19
Node 22
all Node tests
Playground /PlotLibre/ build
handover contract
all Chromium E2E
zero unresolved review threads
```

Never claim CI is green from an older head.

## 20. Clean-room references

```text
JamesLMilner/terra-draw@26d7ec91f071ab5d2bdeab774d14763746cd798b — MIT
geoman-io/maplibre-geoman@b177748cac826fc820ff7ea068186f8eb6e0fc3c — MIT
mapbox/mapbox-gl-draw@cb0ca464872d8468f0b912a2321f2e0503718c52 — ISC-style
maplibre/maplibre-gl-js@v6.0.0 — BSD-3-Clause
```

Observed only public/observable mode lifecycle, Shift box behavior, DOM region UI, render queries and adapter boundaries. Code reuse: `none`.

## 21. Documentation and merge discipline

- design and implementation use separate branches/PRs;
- finalization branches contain Markdown only;
- keep PR Draft until exact current-head CI is green;
- resolve every actionable review thread;
- mark Ready only after validation;
- Squash and merge with `expected_head_sha`;
- synchronize actual squash state through documentation-only finalization;
- create runtime work only from the latest final `main`.

## 22. Continuation order

1. finish `agent/007b-design-post-merge-finalization` as documentation-only;
2. pass unchanged 219/30 exact-head CI;
3. merge finalization with zero unresolved threads;
4. create `agent/007b-box-lasso-selection` from latest final `main`;
5. implement pure screen utilities first;
6. implement `SelectionController.applyMany()` second;
7. implement exact screen predicates third;
8. implement MapLibre broad-phase resolver fourth;
9. replace immediate Shift capture with unified region adapter;
10. add DOM/SVG overlay and public one-shot APIs;
11. add Playground, Chromium and measured benchmark evidence;
12. do not mix rotation/scale, groups/locks, snapping or new symbols into 007B.

# PlotLibre Development Contract

This file defines mandatory rules for every developer, coding agent and future conversation.

## 1. Product model

PlotLibre is a semantic parametric plotting framework, not a generic GeoJSON toolbar.

Canonical feature state:

```text
PlotDefinition + authored controlPoints + parameters + style + metadata
```

Rendered geometry, samples, inferred frames, selection overlays, screen-region paths, transform previews and semantic guides are derived output. They must never replace authored state or be serialized as canonical PlotJSON.

## 2. Dependency direction

```text
core <- geometry <- symbols
core <- interaction
core + interaction <- maplibre
public packages <- playground / wrappers
```

- Core cannot depend on MapLibre, DOM or screen coordinates;
- geometry cannot depend on Store, UI, events or map engines;
- interaction algorithms and commands remain engine-independent;
- MapLibre translates screen/map gestures and performs adapter queries;
- Playground consumes public APIs only;
- circular dependencies are prohibited.

## 3. Current merged baseline

```text
main SHA:           012d17ac8a8f7e71264ef375511b764cb398d111
workspace:          0.0.22
public symbols:     19 (14 Arrow + 1 Line + 4 Area)
Node baseline:      264
Chromium baseline:  32
MapLibre Sources:   4
MapLibre Layers:    10
Milestone 007A:     merged through PR #38/#39
Milestone 007B design: merged through PR #40/#41
Milestone 007B runtime: merged through PR #42/#43
Milestone 007B finalization: merged through PR #44
```

Current branch:

```text
agent/007b-region-selection-benchmark
scope: reproducible resolver benchmark, frozen evidence and indexing decision
selection runtime changes: prohibited
```

Final 007B evidence:

```text
PR #42 head:  812183a47413bdac554fbd6ca75e1443026ac474
PR #42 CI:    #437 / 30920263173 — 264 Node / 30 Chromium
PR #42 merge: e18183df5be4b98c38ba177e8440b28e859c2c90

PR #43 head:  f7d9e107221d4ee3fc4278f697a7c0ba84d95a59
PR #43 CI:    #445 / 30924648279 — 264 Node / 32 Chromium
PR #43 merge: f98483d3504ce464c93e5a03a49f7f856d1cc1a0

PR #44 head:  49b6bd6e6d99d08c8fae0617a9bf0fb1586b1b8b
PR #44 CI:    #448 / 30927338756 — 264 Node / 32 Chromium
PR #44 merge: 012d17ac8a8f7e71264ef375511b764cb398d111
```

Never use old-head validation as evidence for a newer head.

## 4. Selection boundary

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

Compatibility APIs remain:

```text
plot.select(id | undefined)
plot.selectedId
plot.selectedIds
plot.selection
```

## 5. Click intents

```text
plain click       → replace / make Primary
Shift             → add
Ctrl or Cmd       → toggle
Alt               → subtract
empty plain click → clear
```

Modifier priority:

```text
Alt > Ctrl/Cmd > Shift > default
```

The engine-independent SelectionController never reads DOM or MapLibre events.

## 6. Region-selection boundary

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

## 7. Region entry and ownership

Supported entry:

```text
neutral Shift + empty primary drag → one-shot additive box
explicit one-shot box mode         → default replace
explicit one-shot lasso mode       → default replace
```

Public APIs:

```text
plot.regionSelection
plot.regionSelectionSnapshot
plot.regionSelectionRejection
plot.startBoxSelection(options?)
plot.startLassoSelection(options?)
plot.cancelRegionSelection()
```

`selectionModifiers` is a compatibility alias for the same controller, not a second listener.

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

- Shift click on a feature remains click-add;
- convenience box starts only from empty selectable space;
- lasso is explicit-mode only;
- touch region gestures are deferred;
- selection cannot mutate on region pointerdown.

## 8. Box contract

```text
activation threshold: Euclidean distance >= 4 CSS px
selection mutation:   pointerup only
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

## 9. Lasso contract

```text
sample spacing:       2 CSS px
minimum distinct pts: 3
minimum area:         16 CSS px²
RDP tolerance:        1.5 CSS px
```

Validation must cover raw and simplified paths:

```text
remove consecutive duplicates
→ validate distinct points
→ reject repeated non-consecutive vertices
→ reject non-adjacent crossing/touch/overlap
→ validate minimum area
→ RDP simplify
→ repeat topology and area validation
→ close implicitly
```

Simplification cannot hide an invalid raw loop. Invalid completion changes no selection, exposes a transient rejection and keeps explicit mode available for direct retry.

Stable rejection codes:

```text
SELECTION_REGION_TOO_SMALL
SELECTION_REGION_LASSO_TOO_FEW_POINTS
SELECTION_REGION_LASSO_SELF_INTERSECTS
SELECTION_REGION_QUERY_FAILED
SELECTION_REGION_CANDIDATE_GENERATION_FAILED
SELECTION_REGION_PROJECTION_FAILED
```

Empty candidates are valid, not rejection.

## 10. One-event multi-id selection

Region completion uses one engine-independent operation:

```ts
selection.applyMany(
  ids: readonly string[],
  intent: SelectionIntent,
  reason: "box" | "lasso",
): SelectionSnapshot;
```

- validate every id before mutation;
- deduplicate by first occurrence;
- adapter inputs use PlotStore/document order;
- replace uses candidates;
- add preserves current order and appends only new candidates;
- subtract preserves survivors;
- toggle removes current candidates then appends newly selected candidates;
- one effective completion emits one SelectionChange;
- no-op emits nothing;
- region selection never creates History.

## 11. Broad phase

MapLibre's rendered index is the initial broad phase:

```text
region screen bounds
→ queryRenderedFeatures(committed fill/line/point layers)
→ read plotId
→ deduplicate
→ filter existing Store ids
→ reorder by Store/document order
```

Exclude selection, draft, handle, guide and label layers. Query order and tile duplicates never define semantics.

The first measured resolver benchmark does not justify a persistent second spatial index. Any future index proposal requires real-browser query evidence plus a complete invalidation design.

## 12. Exact screen narrow phase

Every unique broad-phase candidate is regenerated from canonical Store state:

```text
Registry.generate(feature)
→ selectable fills + lines + points
→ map.project every coordinate
→ exact screen-region intersection
```

Rules:

- Point uses projected semantic center;
- line uses projected segments;
- polygon crossing and containment respect holes;
- Multi geometries use any-component semantics;
- compound PlotFeature selects once;
- boundary is inclusive;
- CSS line width and point radius are ignored;
- labels, hit areas, guides, drafts, handles and selection overlays are ignored;
- generated sampled vertices are authoritative for curved paths;
- query/generation/projection failure rejects the whole completion;
- partial selection is prohibited.

## 13. Region overlay and render resources

Box/lasso guides use an absolutely positioned DOM/SVG overlay attached to the map container:

```text
CSS-pixel coordinates
pointer-events:none
aria-hidden:true
clipped to map container
removed on complete/cancel/destroy
independent from style.load
```

The geographic renderer remains four Sources and ten Layers. Region UI must not be encoded into a GeoJSON source.

## 14. Pointer and lifecycle invariants

The unified controller owns MapLibre boxZoom disable/restore, threshold arbitration, pointer capture, dragPan and synthetic-click suppression.

Cancel safely on:

```text
Escape
pointercancel
unexpected lost pointer capture
style.load
resize
camera movement start
Store change
external selection revision change
draw/import/clear/undo/redo
destroy
```

Intentional `releasePointerCapture()` may emit `lostpointercapture`. After intentional release, the controller has cleared its owned pointer id and must ignore that event so a newly created rejected state is preserved. Unexpected loss while ownership remains active must still cancel.

Entering or cancelling explicit mode preserves existing selection membership. Explicit mode hides Primary handles/guides and restores them on exit.

## 15. Existing atomic document editing

`PlotStore.applyTransaction()`, listener-error isolation, `BatchEditCommand`, batch delete and local-metre whole-selection translation remain unchanged from 007A.

Region selection is not a document command.

## 16. Measured performance boundary

Reproducible entry:

```bash
npm run benchmark:region-selection
```

Authoritative evidence:

```text
docs/performance/region-selection-resolver-benchmark.md
docs/performance/data/2026-08-04-region-selection-resolver-ci.json
```

Measured run:

```text
CI:                    #457 / 30933193884
source head:           2fca8812e206f799c3580380f4e1cd3ed3a73aa8
Node:                  v22.23.1
profile:               arrow.straight / all-candidates / all-hits
100 candidates:        2.399 ms median / 5.308 ms p95
1,000 candidates:      10.961 ms median / 18.246 ms p95
10,000 candidates:     109.308 ms median / 119.182 ms p95
```

Binding interpretation:

- headline totals are uninstrumented resolver calls;
- diagnostic phases are collected separately and are not additive decomposition;
- real MapLibre tile/style query latency is not measured;
- the fixture deliberately uses a 100% candidate ratio and cannot be treated as normal viewport behavior;
- no hard latency SLA is published;
- the current decision is to retain MapLibre rendered-index broad phase and not add a persistent custom index;
- a future index proposal requires real Chromium/MapLibre measurements, candidate-ratio fixtures and explicit invalidation semantics.

## 17. Validation baseline

Every PR must pass on its exact current head:

```text
Node 20.19
Node 22
all Node tests (current baseline 264)
Playground /PlotLibre/ build
handover contract
region-selection benchmark job and artifact
all Chromium E2E (current baseline 32)
zero unresolved review threads
```

Benchmark success means the script executes, validates result counts and produces JSON/Markdown. It does not enforce a latency threshold.

Functional coverage includes box/lasso math, topology, Point/Line/Polygon/Multi/hole predicates, applyMany ordering, broad-phase normalization, fail-closed behavior, region lifecycle, rejected retry and all historical symbol/editing regressions.

## 18. Clean-room references

```text
JamesLMilner/terra-draw@26d7ec91f071ab5d2bdeab774d14763746cd798b — MIT
geoman-io/maplibre-geoman@b177748cac826fc820ff7ea068186f8eb6e0fc3c — MIT
mapbox/mapbox-gl-draw@cb0ca464872d8468f0b912a2321f2e0503718c52 — ISC-style
maplibre/maplibre-gl-js@v6.0.0 — BSD-3-Clause
```

Observed only public/observable mode lifecycle, Shift box behavior, DOM region UI, render queries and adapter boundaries. Code reuse: `none`.

## 19. Merge discipline

- design, runtime and finalization use separate branches/PRs;
- keep PR Draft until exact current-head CI is green;
- report every failure immediately;
- resolve every actionable review thread;
- mark Ready only after validation;
- Squash and merge with `expected_head_sha`;
- verify `main` after merge;
- create new work only from the latest final `main`;
- never merge feature branches locally.

## 20. Continuation order

1. finish PR #45 benchmark infrastructure, evidence and handover;
2. pass exact-head Node 20.19/22, 264 Node, benchmark artifact, 32 Chromium and handover checks;
3. merge with zero unresolved threads and verify `main`;
4. begin 007C rotation/positive-uniform-scale as a separate design-only branch;
5. add real-browser candidate-ratio performance work only as a separate performance slice;
6. keep groups/locks/visibility/z-order deferred until formal PlotJSON schema and migration design;
7. keep snapping, touch region gestures and new symbols outside these slices.

## 21. Cross-stage engineering tasks

1. decide the open-source license;
2. coordinate workspace/public package versions and release workflow;
3. formalize PlotJSON JSON Schema and migrations;
4. automate docs/Registry/test baseline consistency;
5. add real Chromium/MapLibre performance profiles with varied candidate ratios;
6. review npm package boundaries;
7. split the large Playground production chunk;
8. distinguish source, build, deployment and live-site verification;
9. document or automate branch cleanup when connector delete-ref support is unavailable.

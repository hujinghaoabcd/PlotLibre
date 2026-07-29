# PlotLibre Development Contract

This file defines mandatory rules for every developer, coding agent, or future conversation.

## 1. Product model

PlotLibre is a semantic parametric plotting framework, not a generic GeoJSON toolbar.

Canonical state:

```text
plot definition + control points + parameters + style + metadata
```

Rendered GeoJSON is derived output and must never replace semantic source data.

## 2. Dependency direction

```text
core <- geometry <- symbols
core <- interaction
core + interaction <- maplibre
public packages <- playground / wrappers
```

Rules:

- `core` cannot depend on MapLibre or DOM;
- `geometry` cannot depend on MapLibre, Store, UI or events;
- `symbols` register behavior through `PlotDefinition`;
- `interaction` remains engine-independent;
- `maplibre` translates semantic state to Sources/Layers/events;
- Playground consumes only public APIs;
- avoid circular package dependencies.

## 3. Geometry rules

- Do not run undocumented Euclidean geometry directly on lon/lat.
- Use local metre projection for short symbols and explicit geodesic policies for large symbols.
- Validate coincident, collinear, antimeridian, high-latitude and non-finite inputs.
- Rings must be finite, closed and topologically validated where parameters may cause self-intersection.
- Parameters must be explicit, versioned, validated and serializable.
- Shared primitives must remain pure and worker-ready.
- Related variants must share components, frames or strategies; copying complete generators is prohibited.
- A new public symbol needs a real semantic or structural distinction, not only new default values.
- Multi-point arrow geometry must preserve semantic controls separately from curve samples and polygon vertices.
- Self-intersection checks must not be removed merely to make a difficult path render.
- For topology-sensitive symbols, `PlotDefinition.validate()` must cover complete renderability before Store mutation.
- A variant golden test should prove unchanged shared geometry rather than only snapshot the final polygon.
- A compound symbol must be one coherent semantic geometry, not an array of independently persisted simpler symbols.
- Shaft/head joins must not retain derived offset points beyond the head neck plane.
- Every new compound symbol must declare its coupling topology explicitly: shared body, explicit junction, bridge or another reviewed semantic structure.

## 4. Clean-room and licensing

Reference libraries may be studied for public behavior, terminology and documented mathematics.

Before code reuse:

1. identify source and revision;
2. verify license;
3. record provenance;
4. preserve notices;
5. avoid unclear or incompatible code;
6. prefer independent implementation from mathematical descriptions and behavioral tests.

Never copy proprietary Mapbox code. Current project packages remain `UNLICENSED` until the owner chooses a license.

## 5. API and PlotJSON

- Public types use stable dotted identifiers.
- Public state must be serializable unless documented otherwise.
- Breaking changes require migration notes and a PlotJSON migration plan.
- MapLibre remains a peer dependency.
- Framework wrappers remain optional.
- Definition defaults are part of the visual/data contract.
- Every semantic path control must survive PlotJSON round trip.
- Derived centerline samples, offset vertices, notch vertices, branch points and polygon vertices must not be serialized as semantic controls.
- Definition-derived draft controls and semantic draft guides are transient rendering aids only and must never enter Store, History, handles or PlotJSON.

Current public Arrow identifiers:

```text
arrow.straight
arrow.fine
arrow.fine.tailed
arrow.assault-direction
arrow.curved
arrow.attack
arrow.attack.tailed
arrow.double
arrow.pincer
```

`arrow.double` version 1.0 stores exactly four authored controls. Its temporary mirrored objective and derived branch/body vertices are not canonical PlotJSON.

`arrow.pincer` version 1.0 stores exactly five authored controls in this positional order:

```text
0 outer tail A
1 outer tail B
2 objective A
3 objective B
4 shared inner junction
```

Its A/B arm pairing and exact inner junction are canonical. Four-control double-arrow data cannot be relabeled or silently migrated to pincer data.

## 6. Interaction rules

- Exact two-point definitions use `TwoPointDrawSession`.
- Definitions requiring three or more points use `MultiPointDrawSession`.
- Session choice is derived from `PlotDefinition.controlSchema`, not hard-coded symbol IDs.
- Fixed-count multi-point symbols use `completeAtMaximum`; variable-count symbols use explicit completion.
- Normal pointer drafts require a candidate satisfying the minimum semantic point count.
- A Definition may optionally derive a complete transient draft control set from an incomplete authored state.
- Derived draft controls are for rendering only; completion always uses actual committed points plus an actual pointer candidate when present.
- A draw session may become terminal only after the completion candidate passes full Registry generation/renderability preflight.
- Rejected completion remains in the active drawing session so the user can move or replace the final candidate.
- A rejected fixed-count final point must not trap the session at `maximumPoints`.
- Enter and double-click completion must preserve all semantic controls when enabled by the Definition.
- Backspace/Delete removes one uncommitted multi-point control at a time.
- Drawing-state point removal is not Store history.
- MapLibre double-click zoom must stay disabled through the native `dblclick` event and be restored afterward.
- Cancel and destroy must restore the previous zoom-handler state immediately.
- One completed handle drag produces one `ReplacePlotCommand`.
- Invalid handle previews do not enter Store or History.
- Invalid transient pointer geometry preserves the last valid full draft.
- If no valid full draft exists yet, MapLibre renders a transient semantic guide line and control points rather than a blank canvas.
- `create`, `replace` and document import must run full Registry generation before Store mutation; partial invisible state is prohibited.
- Derived notch/head/body/branch/bridge/junction-shoulder vertices are never semantic handles.
- `arrow.double` must show either a complete transient draft or a visible semantic guide immediately after the third click, replace it with the live fourth-point candidate on movement, and auto-complete only when the fourth-click geometry is renderable.
- `arrow.pincer` uses four committed controls plus the fifth pointer candidate for its first full draft; only a renderable fifth click auto-completes.
- An invalid pincer junction candidate remains visible and replaceable and must not enter Store or History.

## 7. Testing requirements

Required before a milestone is merged:

```bash
npm run typecheck
npm test
npm run playground:typecheck
npm run playground:build
npm run handover:check
```

Browser-facing changes also require:

```bash
npm run playground:e2e
```

For MapLibre symbols, Store size is not sufficient. Tests must verify:

- committed Source data;
- correct `plotType`;
- relevant fill/line Layers;
- at least one actual `queryRenderedFeatures()` result.

New geometry requires numerical, degenerate, parameter-isolation and golden-fixture tests. Multi-point geometry must additionally test:

- exact control-count contract;
- exact semantic tail/tip controls;
- interior-control influence where applicable;
- pair/input-order invariance where declared;
- duplicate-control cleanup or rejection policy;
- self-intersection policy;
- full-path PlotJSON round trip;
- declared completion mode: fixed maximum, double-click or Enter;
- camera stability and zoom restoration when double-click is used;
- semantic handle edit, history depth and undo;
- invalid geometry rejection before Store mutation;
- rejected completion recovery;
- any Definition-derived draft remains transient and cannot satisfy completion by itself.

Variant tests must additionally show that changing the variant-specific parameter does not silently change shared body/head geometry.

Compound-symbol tests must additionally cover the symbol's declared coupling topology, role and invariance claims, distinct objectives and the prohibition on independently persisted component arrows.

Pincer tests must additionally prove:

- all five authored controls occur exactly according to the geometry/handle contract;
- the inner junction appears exactly once in the normalized open ring;
- simultaneous whole-arm A/B exchange preserves normalized geometry;
- independent objective exchange changes or invalidates authored pairing;
- moving the junction changes both arm interiors while preserving exact tips;
- four-control relabeling is rejected;
- one coherent no-hole simple Polygon is produced;
- `PincerArrowFrame` remains independent of `DoubleArrowFrame`.

MapLibre `querySourceFeatures()` may return duplicate tile copies. Semantic handle counts must be validated by unique `plotId + handleIndex`, not raw Feature count.

Current minimum regression baseline after the pincer-arrow implementation slice:

```text
122 Node tests
16 Chromium tests
```

The Chromium suite includes a draft-and-committed visibility matrix for all nine public Arrow types.

## 8. Playground and Pages

- GitHub Pages base is `/PlotLibre/`.
- Production cannot require private API keys.
- Online basemap failure cannot block plotting.
- E2E cannot depend on remote tiles.
- MapLibre 6 Worker and Shared modules remain aligned with the installed package.
- Every public symbol gets a selector/catalog entry and browser test in the same slice.
- Multi-point symbols require visible instructions for their actual completion mode and point removal.
- Fixed-count symbols must clearly state automatic maximum-point completion.
- The double-arrow browser suite must assert visible draft output immediately after the third click without requiring a later `mousemove`.
- The pincer browser suite must assert a full draft from the fifth pointer candidate, fifth-click completion, five unique handles and junction edit/undo.
- The all-arrow matrix must verify both Source presence and actual rendered features for draft and committed states.
- Pages deploys only from `main`.

## 9. Documentation and handover

Every completed task must update:

```text
docs/handover/LATEST.md
```

and add an immutable file:

```text
docs/handover/YYYY-MM-DD-milestone-NNN.md
```

Each handover includes:

- branch, PR and deployment state;
- completed files and capabilities;
- validation commands and exact results;
- architecture decisions;
- limitations and risks;
- prioritized next tasks;
- continuation instructions.

The handover contract requires these exact headings:

```text
## Completed in this milestone
## Next tasks
## Risks and decisions
```

Never delete or rewrite earlier immutable handovers. A later finalization state must be recorded in a new handover file.

## 10. Scope control

One complete high-quality vertical slice is preferred to many incomplete symbols. Do not develop multiple new Arrow types in parallel.

## 11. Current priority

The active implementation slice is the independent five-control `arrow.pincer` vertical slice on:

```text
branch: agent/pincer-arrow-implementation
PR: #21 Implement five-control pincer arrow
workspace: 0.0.13
Node baseline: 122
Chromium baseline: 16
```

The implemented version-1.0 contract is:

1. exactly five authored controls: outer tail A, outer tail B, objective A, objective B and shared inner junction;
2. arm A pairs tail A with objective A, and arm B pairs tail B with objective B;
3. only simultaneous whole-arm A/B exchange is geometry invariant;
4. independent tail or objective swaps change the authored pairing and need not preserve geometry;
5. drawing is fixed at five points and auto-completes only after a renderable fifth click;
6. the inner junction is an exact semantic control on the final inner boundary and survives PlotJSON round trip;
7. the final result is one coherent closed simple Polygon with no holes and no independently persisted component arrows;
8. `PincerArrowFrame` is independent and does not call the double generator or use `DoubleArrowFrame` as its semantic frame;
9. four-control double-arrow data cannot be silently relabeled or upgraded to pincer data;
10. invalid draft, completion, edit and import geometry remains fail-closed and outside Store/History.

Authoritative records:

```text
docs/design/arrow-pincer-semantic-design.md
docs/algorithms/arrow-pincer.md
docs/handover/2026-07-29-milestone-006a-pincer-semantic-design-finalization.md
docs/handover/2026-07-29-milestone-006b-pincer-arrow-implementation.md
```

After PR #21 is green and merged, do not immediately add another complex symbol. First perform pincer quality hardening: visual review across symmetric/asymmetric fixtures, junction admissibility calibration, antimeridian/high-latitude cases, documentation/API review and any user-reported drawing issues. A future symbol begins with an independent semantic design PR and must not be implemented as an alias/default variant of an existing arrow.
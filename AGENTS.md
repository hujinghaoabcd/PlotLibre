# PlotLibre Development Contract

This file defines mandatory rules for every developer, coding agent, or future conversation.

## 1. Product model

PlotLibre is a semantic parametric plotting framework, not a generic GeoJSON toolbar.

Canonical state:

```text
plot definition + authored control points + parameters + style + metadata
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

- Do not run undocumented Euclidean geometry directly on longitude/latitude.
- Use local-metre projection for short symbols and explicit geodesic policies for large symbols.
- Validate coincident, collinear, antimeridian, high-latitude and non-finite inputs.
- Rings must be finite, closed and topologically validated where parameters may cause self-intersection.
- Parameters must be explicit, versioned, validated and serializable.
- Shared primitives and frames must remain pure and worker-ready.
- Related symbols must share components, frames or strategies; copying complete generators is prohibited.
- A public symbol needs a real semantic or structural distinction, not only new defaults.
- Semantic controls must remain separate from samples and polygon vertices.
- Self-intersection checks must not be removed merely to make difficult input render.
- Topology-sensitive Definitions must validate complete renderability before Store mutation.
- Compound symbols must declare coupling topology and emit coherent components under one semantic Definition.
- Shaft/head joins must not retain offset vertices beyond the head neck plane.
- Closed-area symbols must explicitly define authored boundary/path roles, automatic closure and output topology.
- Closed-area symbols must not persist sampled curves, derived closure anchors or final rings as controls.

## 4. Related-symbol groups

A development slice may contain two or three related symbols only when:

1. they share a meaningful mathematical foundation;
2. the shared foundation is extracted as pure geometry;
3. every public identifier has independent semantic controls or closure structure;
4. every Definition has independent validation and tests;
5. Registry, PlotJSON, Playground, browser coverage and handover complete in one milestone.

Do not group unrelated symbols to increase symbol count. Do not create public variants only by changing defaults.

Milestone 006I includes `area.closed-curve` and `area.gathering-place`. `area.route-loop` remains deferred until independent route, direction, entry/exit or operational semantics are documented.

## 5. Clean-room and licensing

Reference libraries may be studied for observable behavior, terminology and documented mathematics.

Before code reuse:

1. identify source and revision;
2. verify license;
3. record provenance;
4. preserve required notices;
5. avoid unclear or incompatible code;
6. prefer independent implementation from mathematics and behavioral tests.

Never copy proprietary Mapbox code. Current packages remain `UNLICENSED` until the owner selects a license.

## 6. API, canonical controls and PlotJSON

- Public types use stable dotted identifiers.
- Public state must be serializable unless documented otherwise.
- Breaking changes require migration notes and a PlotJSON migration plan.
- Definition defaults are part of the visual/data contract.
- Every authored semantic control must survive PlotJSON round trip.
- Derived centerlines, samples, offsets, widths, notches, branches, bridges, shoulders, tail edges, necks, heads, closure anchors and polygon vertices must not be serialized as controls.
- Definition-derived draft controls and semantic guides are transient.
- `canonicalizeControlPoints` may only deterministically permute exact authored coordinates.
- Canonicalization must not add, remove, move, mirror, clamp or synthesize a control.
- Registry validation and generation operate on canonicalized controls.
- Create, replace and import persist canonicalized controls.
- Invalid canonicalization fails closed with `INVALID_CONTROL_POINT_CANONICALIZATION`.
- Automatic ring closure must not append a duplicate authored control to PlotJSON.

Current public identifiers:

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
arrow.squad-combat
arrow.route
arrow.corridor
arrow.route.bidirectional
arrow.route.double-head
area.closed-curve
area.gathering-place
```

### Closed curve

`area.closed-curve@1.0.0` stores 3–64 ordered boundary waypoints. Periodic interpolation and ring closure are derived. Reversing controls preserves the footprint contract while canonical authored order remains unchanged.

### Gathering place

`area.gathering-place@1.0.0` stores exactly:

```text
0 flank A
1 front crown
2 flank B
```

Only the flank pair may be permuted for deterministic canonical orientation. The rear closure anchor is derived and must never enter Store, History, handles or PlotJSON.

### Existing path and compound semantics

- `arrow.squad-combat`: authored centre action path; tail edges derived.
- `arrow.route`: directed centre path; terminal authored point is exact tip.
- `arrow.corridor`: undirected centre path; flat-cap ribbon, no head.
- `arrow.route.bidirectional`: both authored endpoints are exact tips.
- `arrow.route.double-head`: primary exact tip; secondary emphasis head derived.
- `arrow.pincer@1.1.0`: two tails, two objectives and one authored inner junction.

## 7. Interaction and rejection rules

- Exact two-point Definitions use `TwoPointDrawSession`.
- Other fixed or variable schemas use `MultiPointDrawSession`.
- Session choice comes from `controlSchema`, never hard-coded symbol IDs.
- Fixed-count symbols use maximum-point completion; variable-count symbols use explicit completion.
- Pointer drafts may use committed controls plus the live pointer candidate.
- Derived draft controls are rendering-only and cannot complete or persist a plot.
- A session becomes terminal only after Registry validation and full generation preflight.
- `validateCompletion` may return legacy `boolean` or Core `ValidationResult`.
- Invalid issues remain available as `DrawSessionSnapshot.rejection`.
- Rejection is non-terminal and never enters Store, History or PlotJSON.
- Rejected fixed-count candidates must not trap a session at maximum points.
- Pointer movement, point removal, cancellation, a new session and successful completion clear stale rejection.
- Registry issues are the source of truth; Playground must not duplicate geometry logic.
- Backspace/Delete removes one uncommitted multi-point control.
- Invalid transient pointer geometry preserves the last valid draft or shows a semantic guide.
- Create, replace and import complete generation before Store mutation.
- One completed handle drag produces one `ReplacePlotCommand`.
- Invalid handle previews never enter Store or History.
- Variable closed areas complete only through explicit double-click/Enter; pointer movement alone never persists closure.
- Fixed-three gathering place completes on the third authored click.
- Double-click completion must not duplicate the terminal authored point.

## 8. Testing requirements

Required before merge:

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

MapLibre tests verify committed/draft Source data, `plotType`, fill/line Layers and at least one actual `queryRenderedFeatures()` result.

New geometry additionally proves:

- exact semantic controls and declared count limits;
- interior-control influence where applicable;
- duplicate-control policy;
- finite/closed/winding/simple topology;
- parameter isolation;
- PlotJSON round trip;
- completion mode;
- invalid geometry rejection before Store mutation.

Closed-area tests additionally prove:

- automatic closure creates no extra authored control;
- authored boundary controls remain represented;
- ring is finite, closed, counterclockwise and simple;
- reversal or flank-swap behavior matches the documented contract;
- sampled curves, derived anchors and ring vertices do not enter PlotJSON;
- invalid closure and self-intersection remain outside Store and History;
- actual draft and committed rendering are visible.

Milestone 006I regression target:

```text
163 Node tests
23 Chromium tests
16 public symbols: 14 Arrow + 2 Area
```

## 9. Playground and Pages

- GitHub Pages base is `/PlotLibre/`.
- Production cannot require private API keys.
- Basemap failure cannot block plotting or change the semantic catalog.
- E2E cannot depend on remote tiles.
- MapLibre 6 Worker and Shared modules remain aligned.
- Every public symbol receives selector, sample and browser coverage in the same milestone.
- Fixed-count symbols state automatic completion.
- Variable symbols state double-click/Enter completion.
- Production exposes all sixteen current symbols and loads sixteen samples.
- Base compatibility E2E uses `?e2e=1` and intentionally exposes the original nine-selector surface.
- Extended E2E uses `?e2e=1&squad=1&paths=1&areas=1`.
- Symbol-specific status listeners must be installed after generic listeners so actionable guidance is not overwritten.
- Pages deploys only from `main`.

## 10. Documentation and handover

Every completed milestone updates `docs/handover/LATEST.md` and adds an immutable handover:

```text
docs/handover/YYYY-MM-DD-milestone-NNN-description.md
```

Each handover records branch/PR/deployment state, files and capabilities, exact validation, architecture decisions, risks and prioritized continuation.

The handover contract requires these exact headings in `LATEST.md`:

```text
## Current state
## Completed in this milestone
## Validation
## Next tasks
## Risks and decisions
```

Never rewrite earlier immutable handovers. `LATEST.md` must describe the actual active or merged state.

## 11. Scope control

Prefer one complete related-symbol group to many incomplete symbols. Do not develop unrelated complex symbols in parallel. Documentation-state repair may be isolated so implementation starts from an accurate baseline.

## 12. Current priority

Merged baseline before this milestone:

```text
main SHA:           a883cbf382b61309e7d64e788e46d9319b8c0ea1
workspace:          0.0.18
public symbols:     14 Arrow
Node baseline:      154
Chromium baseline:  20
Milestone 006H:     finalized
```

Active milestone:

```text
Milestone: 006I closed action area group
branch:    agent/006i-closed-action-area-group
PR:        #31 Add closed action area symbol group
workspace: 0.0.19
symbols:   16 (14 Arrow + 2 Area)
```

Binding completion order:

1. keep `area.closed-curve@1.0.0` and `area.gathering-place@1.0.0` semantic contracts stable;
2. keep `area.route-loop` deferred;
3. preserve pure cyclic closed-area geometry and strict topology rejection;
4. preserve full Registry/PlotJSON preflight;
5. verify 163 Node and 23 Chromium tests on the final head;
6. update current and immutable handover documents;
7. merge only with a fully green current-head CI and zero unresolved review threads;
8. after 006I finalization, begin 006J arc/sector/lune semantic design;
9. do not return to pincer hardening or add route-head variants in this milestone.

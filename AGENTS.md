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

- Do not run undocumented Euclidean geometry directly on longitude/latitude.
- Use local-metre projection for short symbols and explicit geodesic policies for large symbols.
- Validate coincident, collinear, antimeridian, high-latitude and non-finite inputs.
- Rings must be finite, closed and topologically validated where parameters may cause self-intersection.
- Parameters must be explicit, versioned, validated and serializable.
- Shared primitives and frames must remain pure and worker-ready.
- Related symbols must share components, frames or strategies; copying complete generators is prohibited.
- A public symbol needs a real semantic or structural distinction, not only new defaults.
- Semantic controls must remain separate from curve samples and polygon vertices.
- Self-intersection checks must not be removed merely to make a difficult path render.
- Topology-sensitive Definitions must validate complete renderability before Store mutation.
- Compound symbols must declare their coupling topology and produce one coherent semantic geometry.
- Shaft/head joins must not retain offset vertices beyond the head neck plane.

## 4. Related-symbol groups

A development slice may contain two or three related symbols when all of the following are true:

1. they share a meaningful mathematical foundation;
2. the shared foundation is extracted as a pure geometry frame or component;
3. every public identifier has independent semantic controls or closure structure;
4. each Definition has independent validation and tests;
5. the group completes Registry, PlotJSON, Playground, browser coverage and handover in one PR.

Do not group unrelated symbols merely to increase symbol count. Do not create variants by changing only default parameters. A difficult coupled symbol may still be developed alone.

## 5. Clean-room and licensing

Reference libraries may be studied for observable behavior, terminology and documented mathematics.

Before code reuse:

1. identify source and revision;
2. verify license;
3. record provenance;
4. preserve notices;
5. avoid unclear or incompatible code;
6. prefer independent implementation from mathematical descriptions and behavioral tests.

Never copy proprietary Mapbox code. Current packages remain `UNLICENSED` until the owner selects a license.

## 6. API, canonical controls and PlotJSON

- Public types use stable dotted identifiers.
- Public state must be serializable unless documented otherwise.
- Breaking changes require migration notes and a PlotJSON migration plan.
- Definition defaults are part of the visual/data contract.
- Every authored semantic control must survive PlotJSON round trip.
- Derived centerline, sample, offset, width, notch, branch, bridge, shoulder, tail edge, neck, head and polygon vertices must not be serialized as controls.
- Definition-derived draft controls and semantic guides are transient and never enter Store, History, handles or PlotJSON.
- A Definition may provide `canonicalizeControlPoints` to reorder authored coordinates into stable positional roles.
- Canonicalization must be deterministic and may only permute the exact input coordinates.
- Canonicalization must not add, remove, move, mirror, clamp or synthesize a control.
- Registry validation and generation operate on canonicalized controls.
- Create, replace and import persist canonicalized controls so Store and PlotJSON expose one stable role order.
- Invalid canonicalization fails closed with `INVALID_CONTROL_POINT_CANONICALIZATION`.

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
arrow.squad-combat
arrow.route
arrow.corridor
```

### Squad combat

`arrow.squad-combat@1.0.0` stores a centre action path:

```text
0      tail centre
1..n-2 optional path controls
n-1    exact objective/tip
```

Its two tail edges and tail width are derived in local metres. Derived tails never enter Store, handles, History or PlotJSON. It is distinct from `arrow.attack`, whose two tail edges are authored controls.

### Route

`arrow.route@1.0.0` stores a directed centre path:

```text
0      route origin
1..n-2 optional path controls
n-1    exact objective/tip
```

The constant-width shaft, neck plane and arrow head are derived. The final authored coordinate must remain the exact rendered tip.

### Corridor

`arrow.corridor@1.0.0` stores an undirected centre path:

```text
0      endpoint A
1..n-2 optional path controls
n-1    endpoint B
```

The output is a constant-width ribbon with flat end caps and no arrow head. It must not be implemented as a route arrow with a hidden, zero-width or degenerate head.

Route and corridor may share `PathRibbonFrame`, but their public closure structures remain independent.

## 7. Interaction and rejection rules

- Exact two-point Definitions use `TwoPointDrawSession`.
- Fixed or variable schemas that are not exact-two use `MultiPointDrawSession`.
- A variable schema may use `minPoints = 2` only when `maxPoints > 2` is explicit.
- Session choice comes from `controlSchema`, never hard-coded symbol IDs.
- Fixed-count symbols use maximum-point completion; variable-count symbols use explicit completion.
- Pointer drafts may use committed controls plus the live pointer candidate.
- Derived draft controls are rendering-only and cannot complete or persist a plot.
- A session becomes terminal only after full Registry validation and generation preflight.
- `validateCompletion` may return legacy `boolean` or a full Core `ValidationResult`.
- Invalid validation issues must be retained as `DrawSessionSnapshot.rejection`.
- Rejection is non-terminal and must never enter Store, History or PlotJSON.
- Rejected completion remains active so the final candidate can be replaced.
- Rejected fixed-count candidates must not trap the session at maximum points.
- Pointer movement, Backspace/Delete, cancellation, a new session and successful completion clear stale rejection state.
- Registry issues are the source of truth; Playground must not duplicate geometry logic.
- Backspace/Delete removes one uncommitted multi-point control.
- Drawing-state point removal is not Store history.
- Invalid transient pointer geometry preserves the last valid draft or shows a semantic guide.
- Create, replace and import must complete generation before Store mutation.
- One completed handle drag produces one `ReplacePlotCommand`.
- Invalid handle previews never enter Store or History.
- Variable path symbols show a full draft after one committed start plus the live terminal candidate.
- Squad combat, route and corridor complete with double-click or Enter and persist only authored centre-path controls.

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

For MapLibre symbols, tests must verify committed/draft Source data, correct `plotType`, relevant fill/line Layers and at least one actual `queryRenderedFeatures()` result.

New geometry additionally requires:

- exact semantic controls;
- two-control minimum where declared;
- interior-control influence where applicable;
- duplicate-control policy;
- finite/closed/winding/simple topology;
- parameter isolation;
- PlotJSON round trip;
- completion mode;
- invalid geometry rejection before Store mutation.

Path-ribbon group tests additionally prove:

- one shared width is derived from authored path length;
- route preserves the exact terminal tip;
- route shaft is trimmed at a derived neck plane;
- corridor has flat end caps and no head;
- both respond to an interior path control and width parameter;
- both produce one coherent no-hole simple Polygon;
- sampled centreline and offset vertices do not survive PlotJSON;
- actual browser draft and committed rendering are visible for both.

Current minimum regression baseline:

```text
145 Node tests
20 Chromium tests
12 public Arrow types
```

## 9. Playground and Pages

- GitHub Pages base is `/PlotLibre/`.
- Production cannot require private API keys.
- Basemap failure cannot block plotting.
- E2E cannot depend on remote tiles.
- MapLibre 6 Worker and Shared modules must remain aligned.
- Every public symbol gets selector, sample and browser coverage in the same slice.
- Fixed-count symbols clearly state automatic maximum-point completion.
- Variable symbols clearly state double-click/Enter completion.
- Production exposes squad combat, route and corridor by default.
- Extended E2E uses `?e2e=1&squad=1&paths=1`; legacy initial nine-symbol/sample tests remain stable.
- Clicking Load Sample under the extended flag produces all twelve samples.
- Pages deploys only from `main`.

## 10. Documentation and handover

Every completed task must update `docs/handover/LATEST.md` and add an immutable handover:

```text
docs/handover/YYYY-MM-DD-milestone-NNN.md
```

Each handover records branch/PR/deployment state, files and capabilities, exact validation, architecture decisions, risks and prioritized continuation.

The handover contract requires these exact headings:

```text
## Completed in this milestone
## Next tasks
## Risks and decisions
```

Never rewrite earlier immutable handovers.

## 11. Scope control

Prefer one complete related-symbol group to many incomplete symbols. Do not develop unrelated complex symbols in parallel. For routine groups, use one implementation PR unless a genuinely unresolved semantic design requires a separate design review.

## 12. Current priority

Active related-symbol group:

```text
branch: agent/route-corridor-symbol-group
PR: #28 Add route and corridor symbol group
workspace: 0.0.17
Definitions: arrow.route@1.0.0, arrow.corridor@1.0.0
expected Node baseline: 145
expected Chromium baseline: 20
```

Approved behavior:

1. both symbols persist authored centre paths;
2. both allow a two-control straight form and optional intermediate controls;
3. `PathRibbonFrame` is the shared pure geometry foundation;
4. route is directed and preserves an exact terminal tip;
5. corridor is undirected and uses flat end caps;
6. strict simple-ring validation remains;
7. Store and PlotJSON contain only authored controls;
8. no symbol-ID branch is added to interaction;
9. Playground exposes twelve public symbols and a full twelve-sample action;
10. this group stays in one implementation PR.

After PR #28 merges, continue to the next related symbol group rather than returning to pincer hardening. The next planned group is multi-head path extensions, with exact identifiers frozen before implementation.

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
- Shared primitives must remain pure and worker-ready.
- Related variants must share components, frames or strategies; copying complete generators is prohibited.
- A public symbol needs a real semantic or structural distinction, not only new defaults.
- Semantic controls must remain separate from curve samples and polygon vertices.
- Self-intersection checks must not be removed merely to make a difficult path render.
- Topology-sensitive Definitions must validate complete renderability before Store mutation.
- Compound symbols must declare their coupling topology and produce one coherent semantic geometry.
- Shaft/head joins must not retain offset vertices beyond the head neck plane.

## 4. Clean-room and licensing

Reference libraries may be studied for observable behavior, terminology and documented mathematics.

Before code reuse:

1. identify source and revision;
2. verify license;
3. record provenance;
4. preserve notices;
5. avoid unclear or incompatible code;
6. prefer independent implementation from mathematical descriptions and behavioral tests.

Never copy proprietary Mapbox code. Current packages remain `UNLICENSED` until the owner selects a license.

## 5. API, canonical controls and PlotJSON

- Public types use stable dotted identifiers.
- Public state must be serializable unless documented otherwise.
- Breaking changes require migration notes and a PlotJSON migration plan.
- Definition defaults are part of the visual/data contract.
- Every authored semantic control must survive PlotJSON round trip.
- Derived centerline, offset, notch, branch, bridge, shoulder and polygon vertices must not be serialized as controls.
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
```

`arrow.double` version 1.0 stores four authored controls. Its mirrored draft objective and derived branch/body vertices are not canonical PlotJSON.

`arrow.pincer` Definition version 1.1 stores exactly five canonical controls:

```text
0 outer tail A
1 outer tail B
2 objective A
3 objective B
4 shared inner junction
```

The two objective clicks may arrive in either left/right order. The Definition first tests the direct positional pairing; when it is invalid but swapping controls 2 and 3 is renderable, it persists the swapped permutation as the explicit A/B pairing. The pure geometry API remains strict and positional. Four-control double-arrow data cannot be relabeled as pincer data.

## 6. Interaction and rejection rules

- Exact two-point Definitions use `TwoPointDrawSession`.
- Definitions requiring three or more points use `MultiPointDrawSession`.
- Session choice comes from `controlSchema`, never hard-coded symbol IDs.
- Fixed-count symbols use maximum-point completion; variable-count symbols use explicit completion.
- Pointer drafts may use committed controls plus the live pointer candidate.
- Derived draft controls are rendering-only and cannot complete or persist a plot.
- A session becomes terminal only after full Registry validation and generation preflight.
- `validateCompletion` may return legacy `boolean` or a full Core `ValidationResult`.
- Invalid `ValidationResult` issues must be retained as `DrawSessionSnapshot.rejection`.
- Rejection is non-terminal and must never enter Store, History or PlotJSON.
- Rejected completion remains active so the final candidate can be replaced.
- Rejected fixed-count candidates must not trap the session at maximum points.
- A rejected fixed-count candidate may remain visible together with its structured rejection reason.
- Pointer movement, Backspace/Delete, cancellation, a new session and successful completion clear stale rejection state.
- `MapLibrePlotInteraction.drawRejection` exposes only the most recent completion rejection; it is not continuous validation for every pointer draft.
- Registry issues are the source of truth; Playground must translate stable issue codes rather than duplicate geometry logic.
- Backspace/Delete removes one uncommitted multi-point control.
- Drawing-state point removal is not Store history.
- Invalid transient pointer geometry preserves the last valid draft or shows a semantic guide.
- Create, replace and import must complete generation before Store mutation.
- One completed handle drag produces one `ReplacePlotCommand`.
- Invalid handle previews never enter Store or History.
- Double-arrow must show a complete draft or guide immediately after the third click.
- Pincer uses four committed controls plus the fifth pointer candidate for its first full draft.
- Pincer must complete on a renderable fifth click for both objective click orders.
- Invalid pincer junction/topology candidates remain active and visible; canonicalization must not make genuinely invalid geometry valid by moving controls.
- Stable pincer rejection codes must remain covered by tests and actionable Playground guidance.

## 7. Testing requirements

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

- exact control-count and exact semantic controls;
- interior-control influence where applicable;
- declared pair/order invariance;
- duplicate-control policy;
- finite/closed/winding/simple topology;
- parameter isolation;
- deterministic golden fixture;
- PlotJSON round trip;
- completion mode and rejected-completion recovery;
- handle edit, history and undo;
- invalid geometry rejection before Store mutation.

Canonicalization tests additionally require:

- output is an exact permutation of the input controls;
- idempotence;
- no invented or moved coordinates;
- raw and canonical generation behavior;
- Store and PlotJSON persist canonical roles;
- browser coverage for the user-reported click order.

Structured rejection tests additionally require:

- detailed `ValidationResult` issues survive into the session snapshot;
- legacy boolean rejection receives a stable generic fallback issue;
- rejected candidates remain outside Store, History and PlotJSON;
- the candidate remains visible and replaceable;
- pointer movement clears stale rejection;
- a valid retry completes normally;
- browser status text provides an actionable explanation derived from the stable issue code.

Pincer tests additionally prove:

- exact five controls and exact junction;
- junction occurs once in the open normalized ring;
- whole-arm exchange invariance;
- strict pure geometry remains pairing-sensitive;
- public Definition accepts either objective click order by permutation only;
- moving the junction changes both arms while preserving objectives;
- one coherent no-hole simple Polygon;
- four-control relabel rejection;
- stable validation issue codes for representative invalid fifth points;
- `PincerArrowFrame` remains independent of `DoubleArrowFrame`.

Current minimum regression baseline:

```text
127 Node tests
18 Chromium tests
9 public Arrow types
```

## 8. Playground and Pages

- GitHub Pages base is `/PlotLibre/`.
- Production cannot require private API keys.
- Basemap failure cannot block plotting.
- E2E cannot depend on remote tiles.
- MapLibre 6 Worker and Shared modules must remain aligned.
- Every public symbol gets selector, sample and browser coverage in the same slice.
- Fixed-count symbols clearly state automatic maximum-point completion.
- Pincer instructions state that its two objectives may be clicked in either order.
- A genuinely invalid pincer fifth point must show a specific adjustment reason while keeping the session active.
- Moving the pointer after a rejection must remove the stale error instruction.
- Pages deploys only from `main`.

## 9. Documentation and handover

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

Never rewrite earlier immutable handovers. A later merge/deployment finalization gets a new immutable file.

## 10. Scope control

Prefer one complete high-quality vertical slice to many incomplete symbols. Do not develop multiple complex Arrow types in parallel.

## 11. Current priority

Active quality-hardening slice:

```text
branch: agent/pincer-rejection-feedback
PR: #25 Add actionable pincer completion feedback
workspace: 0.0.15
pincer Definition: 1.1.0
Node baseline: 127
Chromium baseline: 18
```

The approved behavior is:

1. Registry `ValidationResult` is the authority for completion rejection;
2. session snapshots preserve structured issues without becoming terminal;
3. rejected final candidates remain visible and replaceable;
4. rejected candidates never mutate Store, History or PlotJSON;
5. MapLibre exposes the latest reason through `drawRejection`;
6. Playground translates stable pincer issue codes into actionable Chinese instructions;
7. pointer movement clears stale feedback and a valid retry completes normally;
8. no geometry, canonical-control or PlotJSON semantics are changed;
9. topology checks remain strict;
10. `arrow.pincer` stays Definition 1.1.0 while the workspace advances to 0.0.15.

After PR #25 reaches `main` and Pages, continue pincer robustness work: asymmetric/off-center fixtures, junction-boundary calibration, high-latitude/antimeridian cases and API/migration review. Do not begin another complex symbol until this feedback loop is complete.

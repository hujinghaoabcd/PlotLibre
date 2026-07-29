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
- Derived centerline, offset, notch, branch, bridge, shoulder, tail edge and polygon vertices must not be serialized as controls.
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

The two objective clicks may arrive in either left/right order. The Definition first tests the direct positional pairing; when it is invalid but swapping controls 2 and 3 is renderable, it persists the swapped permutation as the explicit A/B pairing. The pure geometry API remains strict and positional.

`arrow.squad-combat` Definition version 1.0 stores a center action path:

```text
0      tail centre
1..n-2 optional path controls
n-1    exact objective/tip
```

Its two tail edges and tail width are derived in local metres. Derived tails never enter Store, handles, History or PlotJSON. `arrow.squad-combat` is distinct from `arrow.attack`, whose two tail edges are authored controls.

## 6. Interaction and rejection rules

- Exact two-point Definitions use `TwoPointDrawSession`.
- Fixed or variable schemas that are not exact-two use `MultiPointDrawSession`.
- A variable schema may use `minPoints = 2` only when `maxPoints > 2` is explicit.
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
- Pointer movement, Backspace/Delete, cancellation, a new session and successful completion clear stale rejection state.
- `MapLibrePlotInteraction.drawRejection` exposes only the most recent completion rejection.
- Registry issues are the source of truth; Playground must translate stable issue codes rather than duplicate geometry logic.
- Backspace/Delete removes one uncommitted multi-point control.
- Drawing-state point removal is not Store history.
- Invalid transient pointer geometry preserves the last valid draft or shows a semantic guide.
- Create, replace and import must complete generation before Store mutation.
- One completed handle drag produces one `ReplacePlotCommand`.
- Invalid handle previews never enter Store or History.
- Double-arrow must show a complete draft or guide immediately after the third click.
- Pincer uses four committed controls plus the fifth pointer candidate for its first full draft.
- Squad combat must show a full draft after one committed tail centre plus the live objective candidate.
- Squad combat completes with double-click or Enter and preserves only authored centre-path controls.

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

- exact semantic controls;
- interior-control influence where applicable;
- duplicate-control policy;
- finite/closed/winding/simple topology;
- parameter isolation;
- PlotJSON round trip;
- completion mode;
- handle edit/history/undo where the slice changes editing behavior;
- invalid geometry rejection before Store mutation.

Canonicalization tests additionally require:

- output is an exact permutation of input controls;
- idempotence;
- no invented or moved coordinates;
- raw and canonical generation behavior;
- Store and PlotJSON persist canonical roles;
- browser coverage for reported click order.

Structured rejection tests additionally require:

- detailed `ValidationResult` issues survive into the session snapshot;
- legacy boolean rejection receives a stable generic fallback issue;
- rejected candidates remain outside Store, History and PlotJSON;
- pointer movement clears stale rejection;
- a valid retry completes normally.

Squad-combat tests additionally prove:

- a two-control straight case is valid;
- intermediate path controls affect derived geometry;
- temporary tail edges are symmetric around the authored tail centre;
- tail width responds to `tailWidthPathRatio`;
- the exact objective/tip survives;
- derived tail edges do not survive PlotJSON;
- variable two-minimum multipoint drawing is schema-driven rather than symbol-hard-coded;
- one coherent no-hole simple Polygon is produced;
- actual browser draft and committed rendering are visible.

Current minimum regression baseline:

```text
135 Node tests
19 Chromium tests
10 public Arrow types
```

## 8. Playground and Pages

- GitHub Pages base is `/PlotLibre/`.
- Production cannot require private API keys.
- Basemap failure cannot block plotting.
- E2E cannot depend on remote tiles.
- MapLibre 6 Worker and Shared modules must remain aligned.
- Every public symbol gets selector, sample and browser coverage in the same slice.
- Fixed-count symbols clearly state automatic maximum-point completion.
- Variable symbols clearly state double-click/Enter completion.
- Production exposes squad combat by default; its E2E fixture uses `?e2e=1&squad=1` so the legacy nine-symbol suite remains stable while the ten-type matrix verifies the new public symbol.
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

Never rewrite earlier immutable handovers.

## 10. Scope control

Prefer one complete vertical slice to many incomplete symbols. Do not develop multiple complex Arrow types in parallel. For routine new symbols, use one implementation PR unless a genuinely unresolved semantic design requires a separate design review.

## 11. Current priority

Active new-symbol slice:

```text
branch: agent/squad-combat-arrow
PR: #27 Add squad combat arrow
workspace: 0.0.16
squad-combat Definition: 1.0.0
expected Node baseline: 135
expected Chromium baseline: 19
```

Approved behavior:

1. authored data is a centre action path;
2. minimum two controls produce a straight form;
3. optional intermediate controls shape the path;
4. tail edges and width are derived, transient and symmetric;
5. existing attack-arrow body/head construction may be reused after the independent derivation layer;
6. strict simple-ring validation remains;
7. Store and PlotJSON contain only authored center-path controls;
8. no symbol-ID branch is added to the generic interaction engine;
9. Playground exposes a tenth symbol and ten-symbol sample set;
10. this work stays in one implementation PR.

After PR #27, continue directly to the next new symbol from the roadmap rather than returning to pincer hardening. The next planned complex arrow is `arrow.route`.

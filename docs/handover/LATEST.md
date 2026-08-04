# PlotLibre Development Handover — Milestone 007B Runtime Merged

日期：2026-08-04  
仓库：`hujinghaoabcd/PlotLibre`  
完整不可变交接：`docs/handover/2026-08-04-milestone-007b-box-lasso-runtime.md`

## Current state

```text
main:                f98483d3504ce464c93e5a03a49f7f856d1cc1a0
workspace:           0.0.22
public symbols:      19 (14 Arrow + 1 Line + 4 Area)
Node.js:             20.19+
Node tests:          264
Chromium tests:      32
MapLibre GL JS:      6.0.0
MapLibre Sources:    4
MapLibre Layers:     10
007A:                merged through PR #38/#39
007B design:         merged through PR #40/#41
007B runtime:        merged through PR #42/#43
current finalization: PR #44, documentation/version only
```

Box/lasso runtime、Playground controls、real-browser acceptance and the pointer-capture lifecycle correction are already synchronized to `main`. PR #44 changes authority documents, the root development version and Playground help copy only; it does not change region-selection algorithms.

## Completed in this milestone

Milestone 007B now includes:

- CSS-pixel box and lasso selection;
- Shift-empty additive box after a 4 CSS px threshold;
- explicit one-shot box/lasso modes, default replace;
- replace/add/toggle/subtract intent support;
- one-event `SelectionController.applyMany()`;
- MapLibre rendered index used only as broad phase;
- candidate deduplication and PlotStore-order normalization;
- canonical Registry generation and exact projected semantic-geometry intersection;
- Point、LineString、Polygon、MultiLineString and MultiPolygon support;
- Polygon-hole-aware hit testing;
- fail-closed query、generation and projection behavior without partial selection;
- DOM/SVG region overlay with no new geographic Source or Layer;
- Escape、camera、style、resize、Store、selection and pointer lifecycle cancellation;
- direct retry after invalid explicit lasso;
- Playground `框选`、`套索` and `取消区域` controls;
- armed、active、rejected、retry and completion status feedback;
- real Chromium explicit-box and invalid-lasso retry flows.

Selection remains transient and outside PlotJSON and CommandHistory. Region paths、projected candidates、query results、rejections and overlays remain derived interaction state.

### Browser-discovered correction

Chromium emits `lostpointercapture` after intentional `releasePointerCapture()`. The final controller clears its owned pointer id before release and ignores the resulting event, so a newly created rejected lasso state is preserved. Unexpected pointer loss while ownership remains active still cancels safely.

## Validation

### PR #42 — runtime foundation

```text
validated head: 812183a47413bdac554fbd6ca75e1443026ac474
CI:             #437 / 30920263173
Node 20.19/22:  success
Node tests:     264 passed
Chromium:       30 passed
threads:        0 unresolved
squash SHA:     e18183df5be4b98c38ba177e8440b28e859c2c90
```

### PR #43 — Playground/browser finalization

```text
validated head: f7d9e107221d4ee3fc4278f697a7c0ba84d95a59
CI:             #445 / 30924648279
Node 20.19/22:  success
Node tests:     264 passed
Chromium:       32 passed
threads:        0 unresolved
squash SHA:     f98483d3504ce464c93e5a03a49f7f856d1cc1a0
```

After PR #43, `main` and `f98483d...` were explicitly compared and were identical.

### PR #44 — documentation/version finalization

CI #447 confirmed that strict TypeScript、264 Node tests and the Playground production build passed. The first run stopped only because this `LATEST.md` file did not preserve the five required handover headings. The heading contract is now restored; PR #44 must obtain a new exact-head run with Node 20.19/22、handover check and all 32 Chromium tests before Ready or merge.

## Next tasks

1. pass PR #44 exact-current-head CI with unchanged 264 Node and 32 Chromium tests;
2. confirm zero unresolved review threads;
3. squash merge PR #44 using its exact expected head SHA and verify `main` equals the returned squash SHA;
4. create a separate benchmark branch from that final `main`;
5. measure 100、1,000 and 10,000 feature fixtures before considering a persistent spatial index;
6. begin Milestone 007C rotation and positive-uniform-scale as a separate design-only branch;
7. keep groups、locks、visibility and z-order deferred until formal PlotJSON schema and migration design.

## Risks and decisions

- No hard region-selection latency guarantee is published; scale evidence is still pending.
- No persistent custom spatial index may be added before the 100 / 1,000 / 10,000 benchmark and an explicit invalidation design.
- The geographic renderer remains four Sources and ten Layers; region UI stays in DOM/SVG.
- Root `0.0.22` is a development baseline, not a coordinated npm release across public packages.
- The Playground production bundle remains larger than 500 kB and still needs a separate code-splitting task.
- GitHub Actions reports a non-blocking Node 20 deprecation warning for `actions/upload-artifact@v4`.
- Touch region gestures、contain-only policy、persistent region tools、snapping and new symbols remain out of 007B scope.
- Rotation/scale belongs to 007C; groups/locks/visibility/z-order require PlotJSON migration design first.

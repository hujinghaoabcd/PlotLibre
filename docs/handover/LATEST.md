# PlotLibre Development Handover — Milestone 008C Merged

日期：2026-08-05  
仓库：`hujinghaoabcd/PlotLibre`  
完整交接：`docs/handover/2026-08-05-milestone-008c-post-merge-finalization.md`

## Current state

```text
main:                9d5b8dc23ad0e5b4ae6be3d1d1656f6d84f6adbe
workspace:           0.0.22
PlotJSON schema:     1.0.0
production migrations: none
public symbols:      19 (14 Arrow + 1 Line + 4 Area)
Node tests:          375
Chromium tests:      34
MapLibre Sources:    4
MapLibre Layers:     10
008A runtime:        merged PR #53/#54
008B runtime:        merged PR #55/#56
008C runtime:        merged PR #57
current branch:      agent/008c-plotjson-post-merge-finalization
next branch:         agent/008d-plotjson-atomic-import-runtime
```

## Validation

```text
PR:                    #57
validated head:        ecd14daa1b83f6702027aca785e326f510e267cf
CI:                    30962224541 / #559
Node 20.19 / 22:       success
Node tests:            375 passed
Playground typecheck:  success
Playground build:      success
handover check:        success
region benchmark:      success / artifact 8913362065
transform benchmark:   success / artifact 8913357021
Chromium tests:        34 passed
review threads:        0
changed files:         9 expected files
merge method:          squash with expected head
squash/main SHA:       9d5b8dc23ad0e5b4ae6be3d1d1656f6d84f6adbe
```

Artifact digests:

```text
region:    sha256:efceaac29fd9f9093fe3de4ca8cb184db3d516b8a32f2cc3630ab768495a023f
transform: sha256:356ed2ba3a6b30674d9e991a2d3b093dcb104ff62e476d9e8329474685b79013
```

## Completed in this milestone

- added report-bearing `readPlotDocument()`;
- retained `parsePlotDocument()` as a compatibility wrapper;
- guarded string input by UTF-8 bytes before parsing;
- cloned direct objects through the getter-free descriptor-safe boundary;
- executed exact document migration chains on frozen cloned JSON;
- rejected same-object, Promise, malformed and unsafe migration outputs;
- rescanned every migration output against JSON and resource limits;
- preserved historical PlotJSON 1.0 defaults while reporting them;
- dropped unknown fields in deterministic sorted order;
- rejected document-wide duplicate feature ids;
- executed explicit Definition migration and plotType rename chains;
- required stable feature id and exact target Definition reference;
- enforced `controlPointsPerFeature` after every Definition step;
- attributed malformed final Definition decode to migration output;
- rebuilt and scanned the complete final document;
- enforced aggregate `totalControlPoints` after all migrations;
- returned detached deeply frozen documents and migration reports;
- kept Store, Registry generation, History, selection and MapLibre mutation out of scope.

Authority:

```text
packages/core/src/plotjson-reader.ts
packages/core/src/plotjson-current-decoder.ts
packages/core/src/plotjson.ts
packages/core/src/index.ts

docs/design/plotjson-reader-runtime.md
docs/handover/2026-08-05-milestone-008c-reader-runtime.md
docs/handover/2026-08-05-milestone-008c-post-merge-finalization.md
```

## Next tasks

1. compare this branch against `9d5b8dc23ad0e5b4ae6be3d1d1656f6d84f6adbe` and prove Markdown-only scope;
2. open a Draft post-merge finalization PR;
3. run exact-head Node 20.19/22 and 375 Node tests;
4. run Playground typecheck/build and handover check;
5. run both benchmark jobs and capture artifacts;
6. run 34 Chromium tests;
7. confirm zero review threads;
8. mark the finalization PR Ready without changing head;
9. squash merge with expected head;
10. verify synchronized `main`;
11. create `agent/008d-plotjson-atomic-import-runtime` from synchronized main.

## 008D frozen boundary

008D must:

- derive final Definition targets from live `PlotRegistry`;
- require final Definition-version equality;
- call the pure reader before application mutation;
- canonicalize/generate every feature in memory;
- validate complete ids and exact order;
- replace Store state in one atomic transaction and one event;
- preserve Store/order/selection/History/interactions on expected failure;
- clear transient state only after successful commit;
- integrate `PlotLibre.importDocument()` and derived MapLibre refresh;
- add Node and Chromium rollback/success regressions.

008D cannot introduce schema changes, groups, locks, visibility, z-order, downgrade migration, unresolved-feature mode or future-version best effort.

## Risks and decisions

- migration functions are trusted synchronous application code and cannot be sandboxed by JavaScript runtime checks;
- frozen inputs, new-object/Promise rejection and output rescanning limit accidental or malformed behavior;
- per-feature scans cannot enforce aggregate document controls, so the final whole-document scan is mandatory;
- explicit `definitionTargets` is temporary application configuration until 008D binds to live Registry;
- omitting targets preserves parser-only 1.0 compatibility and does not claim live Definition equality;
- the existing high-level import remains non-atomic until 008D;
- groups, locks, visibility and z-order remain blocked through 008D/E.

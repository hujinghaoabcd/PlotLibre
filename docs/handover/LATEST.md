# PlotLibre Development Handover — Milestone 008C Reader Runtime

日期：2026-08-05  
仓库：`hujinghaoabcd/PlotLibre`  
Runtime PR：#57  
分支：`agent/008c-plotjson-reader-runtime`  
完整设计：`docs/design/plotjson-reader-runtime.md`  
最终交接：`docs/handover/2026-08-05-milestone-008c-reader-runtime.md`

## Current state

```text
base main:            dead641a40852758bcdecbfad99cbf2215024916
workspace:            0.0.22
PlotJSON schema:      1.0.0
production migrations: none
public symbols:       19 (14 Arrow + 1 Line + 4 Area)
merged Node baseline: 348
008C candidate:       375 Node tests
Chromium baseline:    34
MapLibre Sources:     4
MapLibre Layers:      10
008A runtime:         merged PR #53/#54
008B runtime:         merged PR #55/#56
008C runtime:         Draft PR #57
next milestone:       008D atomic import
```

## Completed in this milestone

- added `readPlotDocument()` as the report-bearing safe reader;
- retained `parsePlotDocument()` as a compatibility wrapper;
- guarded string input by UTF-8 byte count before JSON parsing;
- wrapped syntax failures in structured `PlotJsonError` values;
- cloned direct objects through the descriptor-safe 008A boundary;
- planned and executed exact document migration chains;
- froze every migration input and rejected same-object returns;
- rejected asynchronous migration results;
- rescanned every migration result against JSON-safety and resource limits;
- required every document step to produce its exact target envelope;
- extracted current 1.0 decoding into a dedicated pure module;
- preserved historical defaults while recording normalizations and warnings;
- dropped unknown fields in deterministic sorted order;
- enforced document-wide unique feature ids;
- supported explicit Definition target maps and plotType rename chains;
- required Definition outputs to preserve feature id and exact target reference;
- enforced `controlPointsPerFeature` after each Definition step;
- attributed malformed final Definition structures to migration output failure;
- rebuilt and scanned the complete final document for aggregate semantic limits;
- enforced final `totalControlPoints` after all Definition migrations;
- produced deeply frozen detached documents and migration reports;
- kept Store, Registry generation, History, selection and MapLibre mutation out of scope.

Runtime authority:

```text
packages/core/src/plotjson-reader.ts
packages/core/src/plotjson-current-decoder.ts
packages/core/src/plotjson.ts
packages/core/src/index.ts
```

Tests:

```text
tests/plotjson-reader.test.mjs
tests/plotjson-reader-hardening.test.mjs
```

Documentation:

```text
docs/design/plotjson-reader-runtime.md
docs/handover/2026-08-05-milestone-008c-reader-runtime.md
docs/handover/LATEST.md
```

## Validation status

The structured reader head passed 364 Node tests and 34 Chromium tests. A later 372-test head passed the runtime gate before semantic-budget review. The current 375-test semantic-budget candidate requires its own exact-head CI; old-head evidence must not be reused.

Required final gate:

```text
Node 20.19
Node 22
375 Node tests
Playground typecheck/build
handover check
region-selection benchmark
selection-transform benchmark
34 Chromium tests
0 unresolved review threads
```

## Next tasks

1. verify the current 375-test exact head and changed-file scope;
2. run exact-head CI and capture both benchmark artifacts;
3. confirm 375 Node and 34 Chromium tests;
4. confirm zero unresolved review threads;
5. write exact head/run/artifact evidence into both handover files;
6. run one final exact-head CI after evidence synchronization;
7. mark PR #57 Ready without changing its head;
8. squash merge with expected head;
9. verify the returned squash SHA as current `main`;
10. create a Markdown-only 008C post-merge finalization branch;
11. synchronize README, AGENTS, architecture, PlotJSON spec and roadmap;
12. merge finalization and create `agent/008d-plotjson-atomic-import-runtime` from synchronized main.

## 008D frozen boundary

008D must derive final Definition targets from the live `PlotRegistry`, require exact Definition-version equality, canonicalize/generate every feature, validate the complete ordered candidate and replace Store state in one atomic transaction.

Any expected failure must preserve:

```text
old Store contents and order
selection and Primary
CommandHistory
active drawing/region/transform interaction state
MapLibre derived rendering
```

008D cannot introduce a schema bump, production group/lock/visibility/z-order fields, downgrade migration or future-version best effort.

## Risks and decisions

- migration functions are trusted synchronous application code; JavaScript execution cannot be sandboxed by this runtime;
- frozen inputs, same-object rejection, Promise rejection and output rescanning limit accidental or malformed behavior;
- a standalone Definition feature scan cannot infer document aggregate semantic roles, so the final whole-document scan is mandatory;
- `definitionTargets` is explicit application configuration until 008D binds the reader to `PlotRegistry`;
- omitting `definitionTargets` preserves parser-only 1.0 compatibility and does not claim live Definition equality;
- normalizations are compatibility facts, not silent undocumented coercions;
- complete document and metadata payloads are not retained in errors or reports;
- the existing `PlotLibre.importDocument()` remains non-atomic until 008D;
- groups, locks, visibility and z-order remain blocked through 008D/E.

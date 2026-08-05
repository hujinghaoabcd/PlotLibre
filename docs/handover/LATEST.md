# PlotLibre Development Handover — Milestone 008D Atomic Import

日期：2026-08-05  
仓库：`hujinghaoabcd/PlotLibre`  
Runtime PR：#59  
分支：`agent/008d-plotjson-atomic-import-runtime`  
完整设计：`docs/design/plotjson-atomic-import-runtime.md`  
完整交接：`docs/handover/2026-08-05-milestone-008d-atomic-import.md`

## Current state

```text
base main:            b1c394f93a0a685d291fba54207dad9f9d020cb2
workspace:            0.0.22
PlotJSON schema:      1.0.0
production migrations: none
public symbols:       19 (14 Arrow + 1 Line + 4 Area)
merged Node baseline: 375
008D candidate:       400 Node tests
Chromium baseline:    34
MapLibre Sources:     4
MapLibre Layers:      10
008A runtime:         merged PR #53/#54
008B runtime:         merged PR #55/#56
008C runtime:         merged PR #57/#58
008D runtime:         Draft PR #59
next milestone:       008E compatibility closure
```

## Completed in this milestone

- added pure `preparePlotDocumentImport()`;
- added live Registry Definition target derivation;
- used exact live source before following migration history;
- followed only unique Definition chains to exact live targets;
- allowed multiple historical versions to converge to one live target;
- rejected conflicting final targets for one source plotType;
- required canonical live Definition versions;
- ensured document migrations execute once;
- Registry-canonicalized and generated every feature before mutation;
- added final detached current-document scan after canonicalization;
- added `PlotStore.replaceDocument()`;
- committed complete imported order in one staged transaction;
- emitted one immutable Store batch event;
- preserved imported revisions;
- added injectable migration registry and copied/frozen limits to `PlotLibre`;
- added report-bearing `importDocumentWithReport()`;
- retained document-only `importDocument()` compatibility;
- preserved Store/order/selection/History on every tested precommit failure;
- preserved active drawing/draft, region and transform state on failure;
- cleared incompatible transient state only after successful Store commit;
- isolated external post-commit cleanup-listener failures;
- ensured a committed import cannot be reported as failed.

Runtime authority:

```text
packages/core/src/plotjson-import.ts
packages/core/src/store.ts
packages/core/src/index.ts
packages/maplibre/src/plotlibre.ts
```

Tests:

```text
tests/plotjson-import.test.mjs
tests/plotjson-import-hardening.test.mjs
tests/store-document-replacement.test.mjs
tests/maplibre-import-atomic.test.mjs
tests/maplibre-import-state-hardening.test.mjs
tests/maplibre-import-cleanup.test.mjs
```

Documentation:

```text
docs/design/plotjson-atomic-import-runtime.md
docs/handover/2026-08-05-milestone-008d-atomic-import.md
docs/handover/LATEST.md
```

## Validation status

The cleanup-isolation candidate head passed Node 20.19/22, candidate 400 Node tests, Playground, handover and both benchmarks. Its artifacts are:

```text
head:                dc08add7ccb9be4aff4403b16c5a48ecfe9a0951
CI:                  30964661175
region artifact:     8914251924
transform artifact:  8914251697
```

Artifact digests:

```text
region:    sha256:0577b7c7df90293e4af2190889daa584ec425a0ee824bc3f5b06a2ec25e2d6b8
transform: sha256:97036074e208c487220ae475b60b7a6fe4ade678f65191572de5bfd1ac7c0785
```

That evidence predates the authority-document commits and cannot be used for final merge. The final documentation head requires its own complete gate.

## Required final gate

```text
Node 20.19
Node 22
400 Node tests
Playground typecheck/build
handover check
region-selection benchmark
selection-transform benchmark
34 Chromium tests
0 unresolved review threads
```

## Next tasks

1. compare the final branch against base and verify expected runtime/test/docs scope;
2. run complete exact-head CI;
3. capture exact Node total and both benchmark artifacts;
4. confirm 34 Chromium tests and zero review threads;
5. update the immutable handover with final evidence;
6. run one final evidence-synchronization CI;
7. update PR #59 body only;
8. mark Ready without changing head;
9. squash merge with expected head;
10. verify current `main`;
11. create Markdown-only 008D post-merge finalization;
12. create 008E only from synchronized main.

## 008E frozen boundary

008E closes the PlotJSON evolution sequence with:

- current exact round-trip golden fixtures;
- historical compatibility/default fixtures;
- document and Definition migration fixtures;
- explicit plotType rename fixtures;
- invalid/future/missing-chain fixtures;
- atomic import success and rollback fixtures;
- public reader/import examples;
- completed compatibility matrix;
- final documentation/handover synchronization.

008E does not add schema 1.1, production groups/locks/visibility/z-order, unresolved-feature mode, downgrade migration or future-version best effort.

## Risks and decisions

- migration functions are trusted synchronous application code and cannot be sandboxed;
- three reader passes avoid duplicate document migration while reusing one safety boundary;
- live target derivation never guesses aliases or nearest versions;
- one source plotType must resolve to one final live target;
- import is not undoable and clears prior History after success;
- post-commit cleanup errors are logged rather than thrown because canonical Store state is already committed;
- Store listener errors remain isolated after commit;
- renderer resources remain unchanged;
- groups, locks, visibility and z-order remain blocked until 008E closure.

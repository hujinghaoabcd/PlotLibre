# PlotLibre Handover — Milestone 008C Post-Merge Finalization

日期：2026-08-05  
仓库：`hujinghaoabcd/PlotLibre`  
Runtime PR：#57  
Runtime branch：`agent/008c-plotjson-reader-runtime`  
Runtime validated head：`ecd14daa1b83f6702027aca785e326f510e267cf`  
Squash / merged main：`9d5b8dc23ad0e5b4ae6be3d1d1656f6d84f6adbe`

## 1. Final merged state

```text
workspace:             0.0.22
PlotJSON schema:       PlotLibreDocument / 1.0.0
production migrations: none
public Definitions:    19 (14 Arrow + 1 Line + 4 Area)
Node tests:            375
Chromium tests:        34
MapLibre Sources:      4
MapLibre Layers:       10
008A:                  merged PR #53/#54
008B:                  merged PR #55/#56
008C:                  merged PR #57
next runtime:          008D Registry-aware atomic import
next branch:           agent/008d-plotjson-atomic-import-runtime
```

008C was squash-merged only after exact-head CI, complete scope review and zero unresolved review threads. The returned squash SHA is the current repository `main` before this Markdown-only finalization.

## 2. Exact-head validation

```text
head:                  ecd14daa1b83f6702027aca785e326f510e267cf
CI run:                30962224541 / #559
Node 20.19:            passed
Node 22:               passed
Node tests:            375 passed
Playground typecheck:  passed
Playground build:      passed
handover check:        passed
region benchmark:      passed
transform benchmark:   passed
Chromium:              34 passed (2.5m)
review threads:        0
changed files:         9 expected files
merge method:          squash with expected head
squash/main SHA:       9d5b8dc23ad0e5b4ae6be3d1d1656f6d84f6adbe
```

Artifacts:

```text
region-selection-benchmark: 8913362065
region digest: sha256:efceaac29fd9f9093fe3de4ca8cb184db3d516b8a32f2cc3630ab768495a023f

selection-transform-benchmark: 8913357021
transform digest: sha256:356ed2ba3a6b30674d9e991a2d3b093dcb104ff62e476d9e8329474685b79013
```

## 3. Merged runtime authority

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

Design and runtime handover:

```text
docs/design/plotjson-reader-runtime.md
docs/handover/2026-08-05-milestone-008c-reader-runtime.md
```

## 4. Public reader contract

```ts
interface ReadPlotDocumentOptions {
  readonly migrations?: PlotJsonMigrationRegistry;
  readonly definitionTargets?: Readonly<
    Record<string, PlotJsonDefinitionReference>
  >;
  readonly limits?: Partial<PlotJsonLimits>;
}

interface ReadPlotDocumentResult {
  readonly document: PlotDocument;
  readonly report: PlotJsonMigrationReport;
}

readPlotDocument(input, options?)
parsePlotDocument(input, options?)
```

`readPlotDocument()` is the evidence-bearing public API. `parsePlotDocument()` is now a compatibility wrapper returning only `result.document`.

## 5. Merged input boundary

### 5.1 Text input

- measures UTF-8 bytes before `JSON.parse`;
- rejects oversized text with `PLOTJSON_RESOURCE_LIMIT_EXCEEDED`;
- converts syntax failure to `PLOTJSON_SYNTAX_INVALID`;
- returns no partial document or report on failure.

### 5.2 Direct-object input

- passes through the descriptor-safe 008A clone;
- does not invoke getters;
- rejects accessors, hidden/symbol properties, custom prototypes, sparse arrays, cycles, non-finite values and non-JSON object families;
- does not reuse caller containers in the returned document.

## 6. Document migration execution

```text
safe cloned root
→ exact deterministic document plan
→ frozen cloned input for each step
→ trusted synchronous migration function
→ reject same-object or Promise output
→ descriptor-safe clone and resource scan
→ require exact target document envelope
→ append applied-step fact only after success
```

Document migration failures use `PLOTJSON_MIGRATION_OUTPUT_INVALID` and carry scalar source/target context without retaining full documents.

## 7. Current 1.0 compatibility decoding

008C preserves the historical 1.0 interpretation and makes every default observable:

```text
missing/non-string definitionVersion → "1.0.0"
missing/non-record parameters         → {}
missing/non-record style              → {}
missing/non-record feature metadata   → {}
missing/invalid revision              → 0
unknown root/feature fields           → dropped
```

Unknown fields are reported in sorted key order. The reader additionally validates root structure, feature structure, numeric control pairs, latitude range, canonical Definition versions, non-negative safe-integer retained revisions and document-wide unique feature ids.

Duplicate ids fail with `PLOTJSON_FEATURE_ID_DUPLICATE` before any Store or MapLibre mutation can occur.

## 8. Definition migration execution

Definition migration remains explicit through `definitionTargets`, keyed by the source plotType after document decoding.

```text
source (plotType, definitionVersion)
→ exact deterministic Definition plan
→ frozen cloned feature per step
→ new synchronous JSON object
→ generic JSON/resource scan
→ per-step controlPointsPerFeature check
→ exact feature id and target reference
→ current feature decode
→ final target equality
```

An exact source/target reference performs no migration and creates no feature-step report. Missing targets fail closed. Explicit plotType renames remain auditable in the immutable report.

## 9. Semantic-budget hardening

A standalone Definition feature scan cannot infer document roles such as `features[i].controlPoints` or aggregate document controls. 008C therefore enforces two levels:

1. `controlPointsPerFeature` after every Definition migration step;
2. a complete final document clone/scan after all Definition migrations.

The final scan enforces `features`, `controlPointsPerFeature`, `totalControlPoints`, depth, nodes, object keys and string limits over the actual returned document.

Malformed final Definition structures are attributed to `PLOTJSON_DEFINITION_MIGRATION_OUTPUT_INVALID`, with the structural error retained as scalar cause.

## 10. Immutability and determinism

Successful results are detached and deeply frozen, including the result record, document, feature array, feature records, control arrays, parameter/style/metadata trees and migration report.

Repeated reads of fixed input with fixed migrations, targets and limits are deeply equal but return distinct detached objects.

Migration functions are trusted installed synchronous code. JavaScript cannot sandbox them; the contract forbids clock, random, network, DOM, MapLibre, Store and History access. Runtime defenses freeze input, reject asynchronous/same-object output and rescan every returned value.

## 11. Explicit non-effects

008C did not modify:

```text
packages/core/src/registry.ts
packages/core/src/store.ts
packages/maplibre/**
apps/playground runtime
.github/workflows/**
PlotJSON persisted schema
PlotJSON serializer output
public Definition implementations
```

It does not perform Registry generation, atomic Store replacement, selection cleanup, History cleanup or MapLibre import. No production migration is registered and the persisted schema remains `1.0.0`.

## 12. Known remaining gaps

- `PlotLibre.importDocument()` still performs Registry preflight followed by `store.clear()` and repeated `store.add()`;
- the old import path can partially replace state if a later addition fails;
- reader Definition targets are explicit configuration rather than derived from live `PlotRegistry`;
- live Definition-version equality and Registry generation are not part of the pure reader;
- selection, History and interaction cleanup are not transactionally coupled to import;
- no production document or Definition migration exists;
- groups, locks, visibility and z-order remain blocked.

## 13. 008D frozen boundary

Create `agent/008d-plotjson-atomic-import-runtime` only after this Markdown-only finalization is squash-merged and the new `main` is re-verified.

008D owns:

1. derive exact final Definition targets from live `PlotRegistry`;
2. require final Definition-version equality;
3. run `readPlotDocument()` before application mutation;
4. canonicalize and generate every feature in memory;
5. validate complete ids and exact document order;
6. add a dedicated atomic Store document-replacement transaction;
7. commit one Store batch event;
8. preserve old Store/order/selection/History/interactions on every expected failure;
9. clear selection, History and incompatible active interactions only after successful commit;
10. integrate `PlotLibre.importDocument()`;
11. rebuild MapLibre derived state from the one successful Store event;
12. add Node and Chromium rollback/success regressions.

008D must not introduce a schema bump, groups, locks, visibility, z-order, downgrade migration, unresolved-feature mode or future-version best effort.

## 14. Required 008D atomicity

```text
untrusted input
→ pure read/migration result
→ live Definition target/equality check
→ complete Registry canonicalize/generate preflight
→ stage exact ordered Store replacement
→ one atomic commit
→ post-success selection/History/interaction cleanup
→ derived MapLibre refresh
```

Any failure before commit must preserve all application state. Listener failures after commit remain isolated and cannot reverse a successful canonical Store transaction.

## 15. Merge discipline for this finalization

This branch may change Markdown files only.

1. synchronize README, AGENTS, architecture, PlotJSON specification, roadmap and LATEST;
2. compare against `9d5b8dc23ad0e5b4ae6be3d1d1656f6d84f6adbe` and verify Markdown-only scope;
3. open a Draft PR;
4. run exact-head Node 20.19/22, 375 Node tests, Playground build, handover, both benchmarks and 34 Chromium tests;
5. verify zero review threads;
6. mark Ready without changing head;
7. squash merge with expected head;
8. verify the new synchronized `main`;
9. create 008D only from synchronized main.

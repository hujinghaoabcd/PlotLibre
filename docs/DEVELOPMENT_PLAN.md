# PlotLibre 开发路线图

## 工程流程

```text
设计冻结
→ 小范围独立 runtime PR
→ exact-head CI
→ immutable handover
→ Ready
→ squash merge
→ post-merge authority synchronization
```

禁止编辑派生 GeoJSON 顶点代替 authored controls、部分批量提交、绕过 Registry generation preflight、在设计或收尾 PR 混入 runtime、使用旧 head CI 或发布未经测量的性能保证。

## 当前基线

```text
main SHA:             9d5b8dc23ad0e5b4ae6be3d1d1656f6d84f6adbe
workspace:            0.0.22
PlotJSON schema:      1.0.0
production migrations: none
public symbols:       19 (14 Arrow + 1 Line + 4 Area)
merged Node tests:    375
Chromium tests:       34
MapLibre Sources:     4
MapLibre Layers:      10
benchmark jobs:       region selection + selection transform
completed:            007A + 007B + 007B-P + 007C + 008 Design + 008A + 008B + 008C
current slice:        008C post-merge authority synchronization
current branch:       agent/008c-plotjson-post-merge-finalization
next branch:          agent/008d-plotjson-atomic-import-runtime
```

PR #57 validated head `ecd14daa1b83f6702027aca785e326f510e267cf` in CI #559 and squash-merged as `9d5b8dc23ad0e5b4ae6be3d1d1656f6d84f6adbe`.

## Milestones

| 里程碑 | 成果 | 状态 |
|---|---|---|
| 001–006J | Core、History、PlotJSON 1.0、MapLibre、geometry、19 symbols | 已完成 |
| 007A | selection、atomic Store、delete、translation | PR #38/#39，已完成 |
| 007B | box/lasso design/runtime/Playground/docs | PR #40–#44，已完成 |
| 007B-P | resolver benchmark 与索引决策 | PR #45/#46，已完成 |
| 007C | shared-pivot rotation + positive uniform scale | PR #47–#50，已完成 |
| 008 Design | PlotJSON versioning、migration、compatibility、atomic import | PR #51/#52，已完成 |
| 008A | version / JSON safety / limits / errors | PR #53/#54，已完成 |
| 008B | migration registry / deterministic planner / report records | PR #55/#56，已完成 |
| 008C | safe reader / migration execution / current compatibility / invariants | PR #57，已完成 |
| 008C Finalization | merge-state authority synchronization | 当前 Markdown-only 分支 |
| 008D | Registry-aware preparation / atomic Store and MapLibre import | 下一阶段 |
| 008E | compatibility fixtures / docs / finalization | runtime 收尾 |
| 007D | groups / locks / visibility / z-order + production schema migration | 008D/E 后解除阻塞 |

## Authority

PlotJSON design/runtime:

```text
docs/PLOTJSON_SPEC.md
docs/design/plotjson-migrations.md
docs/design/plotjson-compatibility-matrix.md
docs/design/plotjson-version-json-safety-runtime.md
docs/design/plotjson-migration-registry-runtime.md
docs/design/plotjson-reader-runtime.md
docs/algorithms/plotjson-migration-pipeline.md
```

008A runtime:

```text
packages/core/src/plotjson-version.ts
packages/core/src/plotjson-error.ts
packages/core/src/plotjson-safety.ts
```

008B runtime:

```text
packages/core/src/plotjson-migration-types.ts
packages/core/src/plotjson-migration-registry.ts
packages/core/src/plotjson-migration-report.ts
```

008C runtime:

```text
packages/core/src/plotjson-reader.ts
packages/core/src/plotjson-current-decoder.ts
packages/core/src/plotjson.ts
packages/core/src/index.ts
docs/handover/2026-08-05-milestone-008c-reader-runtime.md
docs/handover/2026-08-05-milestone-008c-post-merge-finalization.md
```

## Merged 008A foundation

### Version and error boundary

```ts
PLOTJSON_DOCUMENT_TYPE
CURRENT_PLOTJSON_SCHEMA_VERSION
parsePlotJsonVersion(...)
comparePlotJsonVersions(...)
isCanonicalPlotJsonVersion(...)
PlotJsonError
```

Versions are canonical numeric `MAJOR.MINOR.PATCH`; comparison is numeric. Parsed records are frozen, forged records reject, and malformed messages do not echo untrusted payloads.

### JSON safety and limits

Accepted direct values are JSON primitives, dense arrays and plain/null-prototype objects. Iterative descriptor inspection rejects non-JSON values, custom prototypes, accessors, hidden/symbol properties, sparse/custom arrays and cycles without invoking getters.

```text
inputBytes:                16 MiB UTF-8
maximum depth:             128
value nodes:               1,000,000
object keys:               250,000
string/key length:         1,000,000 UTF-16 code units
features:                  100,000
controls per feature:      10,000
total authored controls:   1,000,000
```

## Merged 008B runtime

Document nodes are schema versions; Definition nodes are exact `(plotType, definitionVersion)` references. Registration requires canonical strictly increasing single outgoing edges. Planning is exact, deterministic, immutable and never executes migration functions.

The report factory copies and deeply freezes structural records, omits absent optional scalar fields and stores no complete document, metadata or executable migration function.

## Merged 008C runtime

### Public API

```ts
readPlotDocument(input, options?): ReadPlotDocumentResult
parsePlotDocument(input, options?): PlotDocument
```

### Pure reader pipeline

```text
UTF-8 guard or direct-object safe clone
→ document envelope
→ exact document migration execution
→ output scan after every step
→ current 1.0 compatibility decode and report facts
→ duplicate-id validation
→ explicit Definition migration
→ per-step controlPointsPerFeature check
→ final whole-document totalControlPoints scan
→ detached deeply frozen document/report
```

### Compatibility behavior

```text
missing/non-string definitionVersion → 1.0.0 + report
missing/non-record parameters        → {} + report
missing/non-record style             → {} + report
missing/non-record feature metadata  → {} + report
missing/invalid revision             → 0 + report
unknown root/feature fields          → dropped + report
```

### Migration execution rules

- input is a frozen safe clone;
- migration is trusted synchronous code;
- output must be a new JSON object;
- Promise/async, same-object and malformed output reject;
- every output is rescanned;
- document output must match exact target envelope;
- Definition output must preserve feature id and exact target reference;
- malformed final Definition decode is attributed to migration output;
- caller input is never mutated;
- no partial result is exposed.

### Semantic-budget hardening

A standalone feature scan cannot infer aggregate document roles. Therefore:

1. every Definition step explicitly enforces `controlPointsPerFeature`;
2. the rebuilt final document is scanned to enforce `totalControlPoints` and all complete-document limits.

### Validation evidence

```text
head:                  ecd14daa1b83f6702027aca785e326f510e267cf
CI:                    30962224541 / #559
Node 20.19 / 22:       passed
Node tests:            375
Playground build:      passed
handover:              passed
region artifact:       8913362065
transform artifact:    8913357021
Chromium:              34 passed
review threads:        0
squash/main:           9d5b8dc23ad0e5b4ae6be3d1d1656f6d84f6adbe
```

## Current gap: high-level import is not atomic

`PlotLibre.importDocument()` still performs complete Registry preflight followed by:

```text
store.clear()
→ repeated store.add()
```

A later failure can occur after partial replacement. The pure 008C reader prevents malformed documents from reaching that stage, but it does not make application-state replacement atomic.

## 008D — Registry-aware preparation and atomic import

Create only after this Markdown-only finalization is squash-merged:

```text
agent/008d-plotjson-atomic-import-runtime
```

Scope:

1. derive exact Definition targets from live `PlotRegistry`;
2. require final Definition-version equality;
3. call `readPlotDocument()` before mutation;
4. canonicalize/generate every feature completely in memory;
5. validate all ids and exact document order;
6. add a dedicated exact-order Store replacement transaction;
7. emit one Store batch event;
8. preserve old Store/order/selection/History/interactions on expected failure;
9. clear selection, History and incompatible interactions only after successful commit;
10. integrate `PlotLibre.importDocument()`;
11. rebuild MapLibre derived state from the successful event;
12. add Node and Chromium rollback/success regressions.

### Required atomicity

```text
untrusted input
→ pure read/migration
→ live Registry target/equality check
→ complete canonicalize/generate preflight
→ stage exact ordered replacement
→ one atomic Store commit
→ post-success transient-state cleanup
→ derived renderer refresh
```

Failure before commit must preserve all application state.

## 008E — closure

- real compatibility fixtures and completed matrix;
- public docs and examples;
- exact-head CI and artifacts;
- immutable runtime handover;
- post-merge synchronization.

## 007D unblock condition

007D begins only after 008D/E. Future schema must define feature-array z-order, schema-owned lock/visibility, stable group ids, validated references, deterministic effective state, production old-to-new migration and golden fixtures.

## Validation gate

Every runtime exact head:

```text
Node 20.19 and 22
all Node tests (current baseline 375)
Playground typecheck/build
handover contract
both observational benchmarks
34 Chromium tests
0 unresolved review threads
immutable runtime handover
```

Post-merge finalization additionally proves Markdown-only scope.

## Cross-stage tasks

Open-source license、coordinated release、docs/test consistency automation、real-browser performance、Playground code splitting、npm boundaries、source/build/deploy/live verification、branch cleanup documentation。

## Non-goals for the current 008 sequence

```text
schema 1.1 production shape before 007D design
groups/locks/visibility/z-order runtime
downgrade or future-version best effort
unresolved feature mode
async/network migration
arbitrary migration DAG
canonical signed JSON
collaboration version vectors
derived geometry cache
new symbols
reflection/non-uniform scale/snapping/touch transforms
```

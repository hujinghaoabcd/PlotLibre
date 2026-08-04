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

禁止编辑派生 GeoJSON 顶点代替 authored controls、部分批量提交、绕过 Registry generation preflight、在设计/收尾 PR 混入 runtime、使用旧 head CI 或发布未经测量的性能保证。

## 当前基线

```text
main SHA:            c77c5c50ea5976f7afd40f0e48bc712515a99cd5
workspace:           0.0.22
PlotJSON schema:     1.0.0
production migrations: none
public symbols:      19 (14 Arrow + 1 Line + 4 Area)
merged Node tests:   324
008B expected Node:  348
Chromium tests:      34
MapLibre Sources:    4
MapLibre Layers:     10
benchmark jobs:      region selection + selection transform
completed:           007A + 007B + 007B-P + 007C + 008 Design + 008A
current slice:       008B migration registry / planner / report records
current branch:      agent/008b-plotjson-migration-registry-runtime
current PR:          #55
next branch:         agent/008c-plotjson-reader-runtime
```

PR #54 finalized 008A and squash-merged as `c77c5c50ea5976f7afd40f0e48bc712515a99cd5`.

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
| 008B | migration registry / planner / report records | PR #55，进行中 |
| 008B Finalization | merge-state authority synchronization | PR #55 合并后 |
| 008C | safe reader / migration execution / current compatibility / invariants | 008B 同步后 |
| 008D | Registry-aware preparation / atomic Store and MapLibre import | 008C 后 |
| 008E | compatibility fixtures / docs / finalization | runtime 收尾 |
| 007D | groups / locks / visibility / z-order + production schema migration | 008D/E 后解除阻塞 |

## Authority

PlotJSON design:

```text
docs/PLOTJSON_SPEC.md
docs/design/plotjson-migrations.md
docs/design/plotjson-compatibility-matrix.md
docs/algorithms/plotjson-migration-pipeline.md
docs/handover/2026-08-05-milestone-008-plotjson-migrations-design.md
docs/handover/2026-08-05-milestone-008-design-post-merge-finalization.md
```

008A runtime:

```text
packages/core/src/plotjson-version.ts
packages/core/src/plotjson-error.ts
packages/core/src/plotjson-safety.ts
docs/design/plotjson-version-json-safety-runtime.md
docs/handover/2026-08-05-milestone-008a-post-merge-finalization.md
```

008B runtime:

```text
packages/core/src/plotjson-migration-types.ts
packages/core/src/plotjson-migration-registry.ts
packages/core/src/plotjson-migration-report.ts
docs/design/plotjson-migration-registry-runtime.md
docs/handover/2026-08-05-milestone-008b-migration-planning.md
```

## 008A merged foundation

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

These are finite security ceilings, not document-size recommendations or latency SLAs.

## Existing gaps retained intentionally

### Historical parser

`parsePlotDocument()` still accepts exact `PlotLibreDocument / 1.0.0`, combines syntax/structure/default normalization, drops unknown fields, defaults missing Definition version and records, and does not expose a report.

It also does not detect document-wide duplicate feature ids or enforce registered Definition version equality.

### Current import

`PlotLibre.importDocument()` still performs complete Registry preflight followed by:

```text
store.clear()
→ repeated store.add()
```

Duplicate ids can fail after partial replacement. 008D must replace this with one complete staged transaction.

## 008B delivered runtime

### Public graph types

```ts
PlotJsonObject
PlotJsonMigrationScope
PlotJsonMigrationContext
PlotJsonMigrationFunction
PlotJsonDocumentMigration
PlotJsonDefinitionReference
PlotJsonDefinitionMigration
PlotJsonPlannedDocumentStep
PlotJsonPlannedDefinitionStep
```

Document node:

```text
schemaVersion
```

Definition node:

```text
(plotType, definitionVersion)
```

Explicit Definition rename example:

```text
arrow.legacy@1.0.0
→ arrow.bridge@1.1.0
→ arrow.current@2.0.0
```

### Registry and errors

```ts
PlotJsonMigrationRegistry
PlotJsonMigrationRegistryError
```

Registration rules:

1. descriptor and migration function required;
2. canonical versions only;
3. target strictly newer than source;
4. non-empty Definition plot types;
5. descriptor/reference copied and frozen;
6. one outgoing edge per source node;
7. exact duplicate and branch reject;
8. invalid insertion is rolled back;
9. registration order cannot change a valid plan.

Developer configuration codes:

```text
PLOTJSON_MIGRATION_REGISTRATION_INVALID
PLOTJSON_MIGRATION_SOURCE_DUPLICATE
PLOTJSON_MIGRATION_GRAPH_CYCLE
```

### Deterministic planner

```ts
registry.planDocument(fromVersion, toVersion)
registry.planDefinition(fromReference, toReference)
```

Planning:

- validates endpoints before graph lookup;
- returns a shared frozen empty plan for exact equality;
- rejects downgrade/newer source;
- follows the unique outgoing edge;
- rejects missing or overshooting paths;
- requires exact target version and exact target plot type;
- returns a frozen ordered array;
- never invokes migration functions;
- performs no shortest/nearest/best-effort choice.

### Immutable report records

```ts
PlotJsonAppliedDocumentStep
PlotJsonAppliedDefinitionStep
PlotJsonFeatureMigrationRecord
PlotJsonNormalizationRecord
PlotJsonWarning
PlotJsonMigrationReport
createPlotJsonMigrationReport(...)
```

The report factory copies and deeply freezes structural records, omits absent optional scalar fields and stores no complete document, metadata or executable migration function.

### Complexity

```text
registration graph validation: O(E) per insertion
snapshot sorting:              O(E log E)
planning:                      O(L)
```

Histories are expected to be small. A 256-step chain test proves iterative exact-order planning. No timing SLA is claimed.

## 008B validation

New tests:

```text
tests/plotjson-migration-registry.test.mjs
tests/plotjson-migration-registry-hardening.test.mjs
tests/plotjson-migration-report.test.mjs
```

Coverage includes deterministic/reversed registration, exact empty plans, missing/overshoot/downgrade, duplicate/branch/self/decreasing/malformed registration, same-type chains, explicit multi-step rename, wrong target type, frozen snapshots, caller mutation isolation, no migration execution, long-chain planning and deeply frozen reports.

Initial head `291d08cf517569b1598f40e71487c1fc3c220657` passed 343 Node tests in CI #531. Five hardening tests were added afterward, making the expected final total 348. Only a later stopped exact head can become merge evidence.

## 008B explicit exclusions

```text
migration execution
migration output safety scans
readPlotDocument()
parsePlotDocument replacement
historical 1.0 normalization integration
document invariants / duplicate-id detection
production migrations
Registry Definition-version enforcement
Store document replacement
MapLibre import changes
schema bump
007D fields
```

## 008C — safe reader and compatibility

Create only after 008B squash merge and post-merge synchronization:

```text
agent/008c-plotjson-reader-runtime
```

Scope:

1. string UTF-8 size guard and JSON syntax parsing;
2. direct-object JSON safety/resource scan;
3. minimal type/schema envelope;
4. document plan execution on cloned JSON;
5. output scan after every migration step;
6. strict current decode with historical `1.0.0` normalization facts;
7. document invariants and duplicate feature ids;
8. Definition plan execution and final version equality;
9. immutable migration report;
10. `readPlotDocument()` plus compatibility `parsePlotDocument()`;
11. current/legacy/invalid/future fixture tree and idempotence.

008C cannot mutate Store or MapLibre.

## 008D — Registry-aware preparation and atomic import

- complete canonical preparation before mutation;
- all-feature canonicalize/generate;
- dedicated Store document replacement with reused ids and exact order;
- one Store batch event;
- no mutation on expected failure;
- interaction/selection/History cleanup only after successful commit;
- MapLibre integration and Chromium rollback regressions.

## 008E — closure

- real compatibility fixtures and matrix;
- public docs/examples;
- exact-head CI and artifacts;
- immutable runtime handover;
- post-merge synchronization.

## 007D unblock condition

007D begins only after 008D/E. Future schema must define feature-array z-order, schema-owned lock/visibility, stable group ids, validated references, deterministic effective state, production old-to-new migration and golden fixtures.

## Validation gate

Every runtime exact head:

```text
Node 20.19 and 22
all Node tests (008B expected 348)
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

## Non-goals for 008 foundation

```text
schema 1.1 production shape
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

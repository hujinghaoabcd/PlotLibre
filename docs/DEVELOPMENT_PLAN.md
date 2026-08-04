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
main SHA:          6012868d4c74e64374bfbeb3c032ee47a4a9fb2c
workspace:         0.0.22
PlotJSON schema:   1.0.0
production migrations: none
public symbols:    19 (14 Arrow + 1 Line + 4 Area)
Node tests:        299
Chromium tests:    34
MapLibre Sources:  4
MapLibre Layers:   10
benchmark jobs:    region selection + selection transform
completed:         007A + 007B + 007B-P + 007C + 008 Design
current slice:     008 design post-merge authority synchronization
current branch:    agent/008-plotjson-design-post-merge-finalization
next branch:       agent/008a-plotjson-version-json-safety-runtime
```

PR #51 exact head `908ab22401d71dfefe0a9d28add67e28723c13c0` passed CI `30947578825` / `#510` and squash-merged as `6012868d4c74e64374bfbeb3c032ee47a4a9fb2c`.

## Milestones

| 里程碑 | 成果 | 状态 |
|---|---|---|
| 001–006J | Core、History、PlotJSON 1.0、MapLibre、geometry、19 symbols | 已完成 |
| 007A | selection、atomic Store、delete、translation | PR #38/#39，已完成 |
| 007B | box/lasso design/runtime/Playground/docs | PR #40–#44，已完成 |
| 007B-P | resolver benchmark 与索引决策 | PR #45/#46，已完成 |
| 007C | shared-pivot rotation + positive uniform scale design/runtime/finalization | PR #47–#50，已完成 |
| 008 Design | PlotJSON versioning、migration、compatibility、atomic import | PR #51，已合并 |
| 008 Design Finalization | merge-state authority synchronization | 当前 Markdown-only 分支 |
| 008A | version / JSON safety / limits / errors | 下一阶段 |
| 008B | migration registry / planner / report | 008A 后 |
| 008C | current reader compatibility / invariants | 008B 后 |
| 008D | Registry-aware preparation / atomic import | 008C 后 |
| 008E | docs / CI / immutable handover / post-merge sync | runtime 收尾 |
| 007D | groups / locks / visibility / z-order + production schema migration | 008 完成后解除阻塞 |

## Merged 008 design authority

```text
docs/PLOTJSON_SPEC.md
docs/design/plotjson-migrations.md
docs/design/plotjson-compatibility-matrix.md
docs/algorithms/plotjson-migration-pipeline.md
docs/handover/2026-08-05-milestone-008-plotjson-migrations-design.md
docs/handover/2026-08-05-milestone-008-design-post-merge-finalization.md
```

## Repository findings driving runtime

### Current parser

`parsePlotDocument()`:

- accepts only exact `PlotLibreDocument` / `1.0.0`;
- combines syntax parsing、structure checks and default normalization;
- drops unknown root/feature fields;
- defaults missing `definitionVersion` to `1.0.0`;
- defaults missing/non-record parameters、style、feature metadata to `{}`;
- defaults missing/non-integer revision to `0`;
- has no migration chain、report、limits or dedicated errors;
- does not detect document-wide duplicate feature ids;
- does not enforce the registered Definition version.

### Current Registry

Registry canonicalizes、validates and generates by `plotType`, but does not require:

```text
feature.definitionVersion === definition.version
```

### Current import

`PlotLibre.importDocument()` performs Registry preflight before mutation, then executes:

```text
store.clear()
→ repeated store.add()
```

A duplicate id can fail after partial replacement. 008D must implement one complete staged document replacement and one Store event.

## Binding version model

### Document `schemaVersion`

Owns document structure、order、references and future persisted editor state.

### Feature `definitionVersion`

Owns control roles、parameters and one symbol Definition's authored semantics.

### Required order

```text
raw input
→ document schema migration
→ current schema decode
→ Definition migration for every feature
→ final Definition-version equality
→ all-member Registry preflight
→ one atomic Store replacement
```

## Current `1.0.0` compatibility

The actual accepted parser behavior remains the historical normalization baseline:

```text
missing definitionVersion → 1.0.0
missing/non-record parameters → {}
missing/non-record style → {}
missing/non-record feature metadata → {}
missing/non-integer revision → 0
unknown schema fields → dropped
```

008 runtime reports these changes but does not silently tighten the same version. Strict future fields require a new schema version and migration.

## 008A — version、JSON safety、limits、errors

Create from synchronized main:

```text
agent/008a-plotjson-version-json-safety-runtime
```

### Scope

1. `CURRENT_PLOTJSON_SCHEMA_VERSION` and document type constants;
2. canonical numeric version type/parser/comparator;
3. dedicated PlotJSON error base and complete stable code union;
4. JSON-safe iterative traversal and deep clone;
5. plain-object/prototype/accessor/symbol-key/cycle rejection;
6. deterministic JSON paths;
7. resource-limit type, validation and finite defaults;
8. scans before/after clone with immutable statistics;
9. public core exports;
10. pure Node tests and immutable handover.

### Explicit exclusions

```text
migration registration or execution
migration report implementation
parsePlotDocument replacement
Definition migration
Registry-version enforcement
Store document replacement
MapLibre import changes
schema bump
007D fields
```

### Required tests

Version:

- valid `0.0.0`, `1.0.0`, large safe components;
- invalid prefix、missing component、leading zero、negative、decimal、prerelease、build、unsafe integer;
- numeric comparison versus string-order traps;
- immutable parsed result.

JSON safety:

- primitives、arrays、plain objects;
- nested path accuracy;
- caller input not mutated;
- clone has no shared nested references;
- NaN/Infinity、undefined、BigInt、function、Symbol;
- Date/Map/Set/typed array/class instance;
- accessor and symbol key;
- direct and indirect cycles;
- `__proto__`/`constructor` keys without prototype pollution;
- deterministic own-key traversal.

Limits:

- below、exact and one-over boundaries;
- depth、nodes、keys、string length、features、per-feature controls、total controls;
- invalid configured limits;
- immutable statistics and context.

Errors:

- stable code、path、feature/version context and cause;
- no complete document dump;
- `instanceof PlotLibreError` and `instanceof PlotJsonError`.

## 008B — migration registry and report

After 008A merges:

- document/Definition migration step registration;
- one outgoing edge per source version;
- strictly increasing versions;
- duplicate/self/decreasing/cycle/branch rejection;
- deterministic chain planning independent of registration order;
- immutable migration report records;
- test-only pure migrators proving input immutability and deterministic output.

## 008C — reader compatibility and invariants

- `readPlotDocument()` report-bearing API;
- `parsePlotDocument()` compatibility wrapper;
- historical `1.0.0` normalizations;
- strict JSON/current-schema invariants;
- duplicate feature-id detection;
- Definition-version migration/equality;
- current/legacy/future/invalid fixture tree;
- repeat-read idempotence.

## 008D — Registry-aware preparation and atomic import

- prepare a complete canonical document before mutation;
- canonicalize and generate every feature;
- dedicated Store document replacement with reused ids and exact order;
- one Store batch event;
- no mutation on expected failure;
- interaction/selection/History cleanup after successful commit;
- MapLibre facade integration;
- Chromium import and rollback regressions.

## 008E — closure

- complete public docs and examples;
- compatibility matrix populated from real fixtures;
- exact-head CI and artifacts;
- immutable runtime handover;
- post-merge authority synchronization.

## Required fixture structure

```text
tests/fixtures/plotjson/current
tests/fixtures/plotjson/legacy
tests/fixtures/plotjson/future
tests/fixtures/plotjson/invalid
```

Coverage:

- exact current round trip;
- historical normalization;
- malformed/non-JSON input;
- old/current/future version behavior;
- migration graph failures;
- Definition migration and plotType rename;
- duplicate ids and unknown Definitions;
- limit boundaries;
- invalid migration output;
- Registry failure;
- atomic import rollback;
- exact successful order;
- deterministic/idempotent repeated reads.

## 007D unblock condition

007D begins only after 008D/E merges.

Future production schema must define and migrate:

```text
feature array as bottom-to-top z-order
schema-owned feature lock/visibility
stable document-level group ids
validated feature references
one feature in at most one first-generation group
deterministic group/feature effective state
production old-to-new schema migration
golden compatibility fixtures
```

The exact future schema JSON belongs to 007D design, not 008 foundation runtime.

## Exact design evidence

```text
PR:                    #51
validated head:        908ab22401d71dfefe0a9d28add67e28723c13c0
CI:                    30947578825 / #510
Node 20.19 / 22:       success
Node tests:            299 passed
Playground typecheck:  success
Playground build:      success
handover check:        success
region artifact:       8907720007
transform artifact:    8907717329
Chromium tests:        34 passed
review threads:        0
merge method:          squash
squash SHA:            6012868d4c74e64374bfbeb3c032ee47a4a9fb2c
```

## Runtime validation gate

```text
Node 20.19 and 22
299 historical Node tests plus milestone tests
Playground typecheck/build
handover contract
both observational benchmarks
34 historical Chromium tests plus milestone tests
0 unresolved review threads
immutable runtime handover
```

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

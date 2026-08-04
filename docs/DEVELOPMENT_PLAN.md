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
main SHA:          d8b2d889dee81064069f96e555dd75b1c851ccf3
workspace:         0.0.22
PlotJSON schema:   1.0.0
production migrations: none
public symbols:    19 (14 Arrow + 1 Line + 4 Area)
Node tests:        324
Chromium tests:    34
MapLibre Sources:  4
MapLibre Layers:   10
benchmark jobs:    region selection + selection transform
completed:         007A + 007B + 007B-P + 007C + 008 Design + 008A
current slice:     008A post-merge authority synchronization
current branch:    agent/008a-plotjson-post-merge-finalization
next branch:       agent/008b-plotjson-migration-registry-runtime
```

PR #53 exact head `cb3db0fa6dc38c9b852524c15e4066b52b0c7b38` passed CI run `30951490118` and squash-merged as `d8b2d889dee81064069f96e555dd75b1c851ccf3`.

## Milestones

| 里程碑 | 成果 | 状态 |
|---|---|---|
| 001–006J | Core、History、PlotJSON 1.0、MapLibre、geometry、19 symbols | 已完成 |
| 007A | selection、atomic Store、delete、translation | PR #38/#39，已完成 |
| 007B | box/lasso design/runtime/Playground/docs | PR #40–#44，已完成 |
| 007B-P | resolver benchmark 与索引决策 | PR #45/#46，已完成 |
| 007C | shared-pivot rotation + positive uniform scale | PR #47–#50，已完成 |
| 008 Design | PlotJSON versioning、migration、compatibility、atomic import | PR #51/#52，已完成 |
| 008A | version / JSON safety / limits / errors | PR #53，已合并 |
| 008A Finalization | merge-state authority synchronization | 当前 Markdown-only 分支 |
| 008B | migration registry / planner / report records | 下一阶段 |
| 008C | report-bearing reader / current compatibility / invariants | 008B 后 |
| 008D | Registry-aware preparation / atomic import | 008C 后 |
| 008E | runtime docs / compatibility fixtures / finalization | runtime 收尾 |
| 007D | groups / locks / visibility / z-order + production schema migration | 008 完成后解除阻塞 |

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
docs/handover/2026-08-05-milestone-008a-plotjson-foundations.md
docs/handover/2026-08-05-milestone-008a-post-merge-finalization.md
```

## 008A merged runtime

### Public primitives

```ts
PLOTJSON_DOCUMENT_TYPE
CURRENT_PLOTJSON_SCHEMA_VERSION
parsePlotJsonVersion(...)
comparePlotJsonVersions(...)
isCanonicalPlotJsonVersion(...)
PlotJsonError
DEFAULT_PLOTJSON_LIMITS
resolvePlotJsonLimits(...)
assertPlotJsonInputSize(...)
clonePlotJsonValue(...)
scanPlotJsonValue(...)
```

### Version contract

- canonical numeric `MAJOR.MINOR.PATCH`;
- non-negative safe-integer components;
- no prefix、leading zero、prerelease、build、decimal or exponent form;
- numeric tuple comparison;
- frozen parsed records;
- forged records reject;
- malformed-version messages do not echo untrusted payloads.

### JSON-safety contract

Accepted:

```text
null / string / boolean / finite number
dense arrays
plain and null-prototype objects
```

Rejected:

```text
undefined / NaN / Infinity / BigInt / Symbol / function
Date / Map / Set / RegExp / typed arrays / class instances
custom prototypes / accessors / hidden or symbol properties
sparse arrays / custom array properties / cycles
```

Implementation rules:

- iterative traversal, not recursion;
- descriptor inspection without getter invocation;
- lexicographic object-key order;
- repeated non-cyclic references cloned independently;
- safe data handling for `__proto__` and `constructor` keys;
- no caller-input mutation or shared nested output containers;
- immutable result envelope、limits and statistics.

### Resource ceilings

```text
inputBytes:               16 MiB UTF-8
maximum depth:            128
value nodes:              1,000,000
object keys:              250,000
string/key length:        1,000,000 UTF-16 code units
features:                 100,000
controls per feature:     10,000
total controls:           1,000,000
```

These are finite security ceilings, not recommended document sizes or latency SLAs. Overrides must be finite positive safe integers.

### Validation evidence

```text
PR:                    #53
validated head:        cb3db0fa6dc38c9b852524c15e4066b52b0c7b38
CI run:                30951490118
Node 20.19 / 22:       success
Node tests:            324 passed
Playground typecheck:  success
Playground build:      success
handover check:        success
region artifact:       8909283653
transform artifact:    8909282981
Chromium tests:        34 passed
review threads:        0
merge method:          squash
squash SHA:            d8b2d889dee81064069f96e555dd75b1c851ccf3
```

## Existing gaps retained intentionally

### Current parser

`parsePlotDocument()` still:

- accepts only exact `PlotLibreDocument` / `1.0.0`;
- combines JSON parsing、structure checks and historical normalization;
- drops unknown root/feature fields;
- defaults missing `definitionVersion` to `1.0.0`;
- defaults missing/non-record parameters、style、feature metadata to `{}`;
- defaults missing/non-integer revision to `0`;
- has no migration report or dedicated reader limits;
- does not detect document-wide duplicate feature ids;
- does not enforce the registered Definition version.

008A primitives are not integrated into this parser. That compatibility-sensitive work remains 008C.

### Current Registry

Registry does not require:

```text
feature.definitionVersion === definition.version
```

### Current import

`PlotLibre.importDocument()` still performs:

```text
full Registry preflight
→ store.clear()
→ repeated store.add()
```

A duplicate id can fail after partial replacement. 008D must replace this with one complete staged document transaction and one Store event.

## 008B — migration registry、planner、report records

Create after this finalization merges:

```text
agent/008b-plotjson-migration-registry-runtime
```

### Scope

1. immutable document migration step type;
2. immutable Definition migration reference `{ plotType, version }`;
3. immutable Definition migration step with explicit source/target references;
4. separate document and Definition registration APIs;
5. one outgoing edge per source node and scope;
6. strict target-version increase;
7. duplicate、self、decreasing、cycle and branch rejection;
8. deterministic linear chain planning independent of registration order;
9. explicit plotType rename edges;
10. immutable planned/applied step and report record types;
11. public core exports、pure Node tests、runtime docs and immutable handover.

### Graph model

```text
document node   = schema version
Definition node = (plotType, definitionVersion)
```

Rules:

- one source node has at most one outgoing edge;
- versions strictly increase across an edge;
- Definition rename can change plotType only through an explicit edge;
- no cycles or branch ambiguity;
- no arbitrary shortest-path search;
- registration order cannot alter a valid plan;
- missing chain becomes a structured PlotJSON error.

### Exclusions

```text
production migration execution
parsePlotDocument replacement
historical 1.0 normalization integration
production symbol migrations
Registry-version enforcement
Store document replacement
MapLibre import changes
schema bump
007D fields
```

## 008C — reader compatibility and invariants

- report-bearing `readPlotDocument()`;
- `parsePlotDocument()` compatibility wrapper;
- input-byte and JSON-safety integration;
- historical `1.0.0` normalization records;
- document-wide duplicate-id detection;
- Definition migration and final version equality;
- current/legacy/future/invalid fixture tree;
- deterministic/idempotent repeated reads.

## 008D — Registry-aware preparation and atomic import

- complete canonical preparation before mutation;
- all-feature canonicalize/generate;
- dedicated Store document replacement with reused ids and exact order;
- one Store batch event;
- no mutation on expected failure;
- interaction/selection/History cleanup after successful commit;
- MapLibre integration and Chromium rollback regressions.

## 008E — closure

- complete public docs and examples;
- compatibility matrix populated from real fixtures;
- exact-head CI and artifacts;
- immutable runtime handover;
- post-merge synchronization.

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

## Validation gate

Every runtime exact head:

```text
Node 20.19 and 22
324 current Node tests plus milestone tests
Playground typecheck/build
handover contract
both observational benchmarks
34 Chromium tests plus milestone tests
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

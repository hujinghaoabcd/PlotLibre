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
main SHA:          add70f52eb252b1167f7abfb4ecf4b93370bfbdf
workspace:         0.0.22
PlotJSON schema:   1.0.0
production migrations: none
public symbols:    19 (14 Arrow + 1 Line + 4 Area)
historical Node:   299
008A expected Node: 324
Chromium tests:    34
MapLibre Sources:  4
MapLibre Layers:   10
benchmark jobs:    region selection + selection transform
completed:         007A + 007B + 007B-P + 007C + 008 Design
current slice:     008A version / JSON safety / limits / errors
current branch:    agent/008a-plotjson-version-json-safety-runtime
current PR:        #53
next branch:       agent/008b-plotjson-migration-registry-runtime
```

PR #51 design squash：`6012868d4c74e64374bfbeb3c032ee47a4a9fb2c`。  
PR #52 design-finalization squash/main：`add70f52eb252b1167f7abfb4ecf4b93370bfbdf`。

## Milestones

| 里程碑 | 成果 | 状态 |
|---|---|---|
| 001–006J | Core、History、PlotJSON 1.0、MapLibre、geometry、19 symbols | 已完成 |
| 007A | selection、atomic Store、delete、translation | PR #38/#39，已完成 |
| 007B | box/lasso design/runtime/Playground/docs | PR #40–#44，已完成 |
| 007B-P | resolver benchmark 与索引决策 | PR #45/#46，已完成 |
| 007C | shared-pivot rotation + positive uniform scale | PR #47–#50，已完成 |
| 008 Design | PlotJSON versioning、migration、compatibility、atomic import | PR #51/#52，已完成 |
| 008A | version / JSON safety / limits / errors | PR #53，收尾中 |
| 008A Finalization | merge-state authority synchronization | PR #53 合并后 |
| 008B | migration registry / planner / report | 008A 同步后 |
| 008C | current reader compatibility / invariants | 008B 后 |
| 008D | Registry-aware preparation / atomic import | 008C 后 |
| 008E | docs / CI / immutable handover / post-merge sync | runtime 收尾 |
| 007D | groups / locks / visibility / z-order + production schema migration | 008 完成后解除阻塞 |

## 008 authority

Design:

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
```

## Repository findings driving 008

### Current parser

`parsePlotDocument()` still:

- accepts only exact `PlotLibreDocument` / `1.0.0`;
- combines syntax parsing、structure checks and default normalization;
- drops unknown root/feature fields;
- defaults missing `definitionVersion` to `1.0.0`;
- defaults missing/non-record parameters、style、feature metadata to `{}`;
- defaults missing/non-integer revision to `0`;
- has no migration chain、report、limits or dedicated errors;
- does not detect document-wide duplicate feature ids;
- does not enforce the registered Definition version.

008A deliberately does not integrate its new primitives into this parser. That compatibility-sensitive work remains 008C.

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

### Required future order

```text
raw input
→ input byte guard and JSON safety
→ document schema migration
→ current schema decode
→ Definition migration for every feature
→ final Definition-version equality
→ all-member Registry preflight
→ one atomic Store replacement
```

## Current `1.0.0` compatibility

Historical normalization remains binding:

```text
missing definitionVersion → 1.0.0
missing/non-record parameters → {}
missing/non-record style → {}
missing/non-record feature metadata → {}
missing/non-integer revision → 0
unknown schema fields → dropped
```

008A exports primitives only. It does not silently tighten same-version interpretation. 008C must preserve and report these normalizations.

## 008A delivered runtime

### Version primitives

```ts
PLOTJSON_DOCUMENT_TYPE
CURRENT_PLOTJSON_SCHEMA_VERSION
parsePlotJsonVersion(...)
comparePlotJsonVersions(...)
isCanonicalPlotJsonVersion(...)
```

Contract:

- canonical numeric `MAJOR.MINOR.PATCH`;
- non-negative safe-integer components;
- no leading zeros except `0`;
- no prefix、prerelease、build、decimal or exponent form;
- numeric tuple comparison;
- frozen parsed results;
- forged parsed records reject;
- invalid messages do not echo untrusted payloads.

### Structured errors

`PlotJsonError` extends `PlotLibreError` and exports the complete Milestone 008 code union. It can expose scalar path、feature、plotType、version、limit and cause context without retaining complete documents or metadata.

### Iterative JSON safety

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
custom prototypes / accessors / hidden properties / symbol keys
sparse arrays / custom array properties / cycles
```

Implementation rules:

- explicit traversal stack, not recursion;
- descriptor inspection without getter invocation;
- lexicographic object-key order;
- repeated non-cyclic references cloned independently;
- own `__proto__` and `constructor` remain safe data properties;
- caller input is not mutated;
- clone shares no nested containers with input;
- result envelope、limits and statistics are frozen.

### Resource limits

```text
inputBytes:               16 MiB
maximum depth:            128
value nodes:              1,000,000
object keys:              250,000
string/key length:        1,000,000 UTF-16 code units
features:                 100,000
controls per feature:     10,000
total controls:           1,000,000
```

These are finite security ceilings, not document-size recommendations or latency SLAs. Overrides must be finite positive safe integers. UTF-8 input bytes are measured separately; string length applies to values and keys.

### Statistics

```text
totalNodes
objectKeys
maximumDepth
maximumStringLength
features
maximumControlPointsPerFeature
totalControlPoints
```

Feature/control observations recognize only `$.features` and `$.features[i].controlPoints`; they are not schema validation.

## 008A validation

New test files:

```text
tests/plotjson-version-foundation.test.mjs
tests/plotjson-safety.test.mjs
tests/plotjson-safety-hardening.test.mjs
```

Coverage:

- valid/invalid/unsafe version triples;
- lexical-order traps and forged records;
- bounded malformed-version messages;
- all accepted/prohibited value families;
- getter non-invocation;
- null/custom prototypes and prototype-pollution keys;
- sparse/custom arrays;
- direct/indirect cycles and repeated references;
- insertion-order-independent paths;
- 2,000-level iterative traversal;
- UTF-8 bytes;
- all limit categories;
- immutable statistics and limits;
- all historical regressions.

Expected final exact-head gate:

```text
Node 20.19 and 22
324 Node tests
Playground typecheck/build
handover contract
region benchmark
selection-transform benchmark
34 Chromium tests
0 unresolved review threads
```

## 008A explicit exclusions

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

## 008B — migration registry、planner、report types

Create only after 008A squash merge and post-merge synchronization:

```text
agent/008b-plotjson-migration-registry-runtime
```

Scope:

1. document and Definition migration step types;
2. registry registration APIs;
3. one outgoing edge per source version/scope;
4. strict version increase;
5. duplicate/self/decreasing/cycle/branch rejection;
6. deterministic linear chain planning independent of registration order;
7. immutable migration report record types;
8. pure test migrations proving determinism and input immutability;
9. public core exports and immutable handover.

Excluded from 008B:

```text
parsePlotDocument replacement
current 1.0 normalization integration
production symbol migrations
Registry-version enforcement
Store/MapLibre changes
schema bump
```

## 008C — reader compatibility and invariants

- report-bearing `readPlotDocument()`;
- `parsePlotDocument()` compatibility wrapper;
- 1.0 historical normalization records;
- JSON/current-schema invariants;
- duplicate feature-id detection;
- Definition migration/equality;
- current/legacy/future/invalid fixture tree;
- repeat-read idempotence.

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

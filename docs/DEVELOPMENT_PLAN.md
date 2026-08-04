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
main SHA:          fa1648fcd7b263244dabdba31bcdb5b69f74f9a2
workspace:         0.0.22
PlotJSON schema:   1.0.0
production migrations: none
public symbols:    19 (14 Arrow + 1 Line + 4 Area)
Node tests:        299
Chromium tests:    34
MapLibre Sources:  4
MapLibre Layers:   10
benchmark jobs:    region selection + selection transform
completed:         007A + 007B + 007B-P + 007C
current slice:     008 PlotJSON migration design
current branch:    agent/008-plotjson-migrations-design
next branch:       agent/008a-plotjson-version-json-safety-runtime
```

PR #49 runtime squash：`2b06d02ba851a9c6ae01d0db1fc503ad5f8699c0`。  
PR #50 post-merge authority squash/main：`fa1648fcd7b263244dabdba31bcdb5b69f74f9a2`。

## Milestones

| 里程碑 | 成果 | 状态 |
|---|---|---|
| 001–006J | Core、History、PlotJSON 1.0、MapLibre、geometry、19 symbols | 已完成 |
| 007A | selection、atomic Store、delete、translation | PR #38/#39，已完成 |
| 007B | box/lasso design/runtime/Playground/docs | PR #40–#44，已完成 |
| 007B-P | resolver benchmark 与索引决策 | PR #45/#46，已完成 |
| 007C | shared-pivot rotation + positive uniform scale design/runtime/finalization | PR #47–#50，已完成 |
| 008 Design | PlotJSON versioning、migration、compatibility、atomic import | 当前 Markdown-only 分支 |
| 008A | version / JSON safety / limits / errors | 设计合并后 |
| 008B | migration registry / planner / report | 008A 后 |
| 008C | current reader compatibility / invariants | 008B 后 |
| 008D | Registry-aware preparation / atomic import | 008C 后 |
| 008E | docs / CI / immutable handover / post-merge sync | runtime 收尾 |
| 007D | groups / locks / visibility / z-order + production schema migration | 008 完成后解除阻塞 |

## 007C merged authority

```text
docs/design/rotation-uniform-scale.md
docs/design/rotation-uniform-scale-runtime.md
docs/algorithms/selection-local-transform.md
docs/performance/selection-transform-benchmark.md
docs/handover/2026-08-05-milestone-007c-runtime-post-merge-finalization.md
```

Merged transform pipeline:

```text
all selected authored controls
→ one order-independent local-metre frame
→ fixed authored-control AABB-center pivot
→ clockwise rotation or positive uniform scale
→ canonicalize + Registry.generate every member
→ complete preview or rejection
→ one stale-safe BatchEditCommand
→ exact captured undo/redo
```

007C remains frozen. 008 cannot change transform semantics, renderer resources or interaction priority.

## 008 design authority

```text
docs/PLOTJSON_SPEC.md
docs/design/plotjson-migrations.md
docs/design/plotjson-compatibility-matrix.md
docs/algorithms/plotjson-migration-pipeline.md
docs/handover/2026-08-05-milestone-008-plotjson-migrations-design.md
```

## Repository findings driving 008

### Parser

Current `parsePlotDocument()`:

- accepts only exact `PlotLibreDocument` / `1.0.0`;
- combines syntax parsing、structure checks and default normalization;
- drops unknown root/feature fields;
- defaults missing `definitionVersion` to `1.0.0`;
- defaults missing/non-record parameters、style、feature metadata to `{}`;
- defaults missing/non-integer revision to `0`;
- has no migration chain、report、limits or dedicated errors;
- does not detect document-wide duplicate feature ids;
- does not enforce current registered Definition version.

### Registry

Current Registry canonicalizes、validates and generates by `plotType`, but does not require:

```text
feature.definitionVersion === definition.version
```

### Import

Current `PlotLibre.importDocument()` performs full Registry generation before mutation, then executes:

```text
store.clear()
→ repeated store.add()
```

A duplicate id can therefore fail after partial replacement. 008D must implement one staged document transaction and one Store event.

## Binding version model

### Document `schemaVersion`

Owns document structure、order、references and future persisted editor state.

### Feature `definitionVersion`

Owns control roles、parameters and one symbol Definition's authored semantics.

### Required migration order

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

The actual accepted parser behavior is frozen as historical normalization:

```text
missing definitionVersion → 1.0.0
missing/non-record parameters → {}
missing/non-record style → {}
missing/non-record feature metadata → {}
missing/non-integer revision → 0
unknown schema fields → dropped
```

008 runtime reports these changes but does not silently tighten the same version. Strict future fields require a new schema version and migration.

## Migration registry contract

```text
document migration scope
Definition migration scope keyed by plotType
one outgoing step per source
strictly increasing versions
no cycles or branches
pure synchronous migration
new JSON object per step
resource scan after every step
explicit plotType rename only
```

Unknown/future schema versions、unknown Definitions、newer Definition versions and missing chains fail closed.

## JSON safety and limits

Runtime must reject non-JSON direct objects:

```text
undefined / non-finite number / BigInt / Symbol / function
Date / Map / Set / typed array / class instance
accessor / symbol key / cycle
```

Configurable finite limits cover input bytes、depth、nodes、keys、string length、features、controls per feature and total controls. Concrete defaults are measured and published in 008A, not invented in design.

## Error and report surface

A dedicated PlotJsonError family exposes stable codes plus path、feature、plotType and version context.

Migration report records:

```text
source and target schema
applied document steps
applied Definition steps
plotType renames
1.0 normalizations
stable warnings and JSON paths
```

`parsePlotDocument()` remains a compatibility wrapper; a report-bearing reader is added in runtime.

## 008 runtime sequence

### 008A — primitives

Scope:

- version constants/parser/comparator;
- JSON-safe scan/deep clone;
- resource-limit model and measured defaults;
- PlotJsonError base and stable codes;
- pure Node tests.

Excluded:

- migration registration or execution;
- parser replacement;
- Registry/Store/MapLibre changes;
- schema bump.

### 008B — registry and planning

Scope:

- document/Definition migration registration;
- graph validation and deterministic chain planning;
- immutable report types;
- test-only migrations proving determinism and immutability.

### 008C — reader

Scope:

- `readPlotDocument()`;
- `parsePlotDocument()` delegation;
- current `1.0.0` compatibility normalization;
- duplicate-id and Definition-version invariants;
- fixture directory and compatibility matrix tests.

### 008D — atomic import

Scope:

- Registry-aware complete preparation;
- dedicated Store document replacement;
- exact no-mutation failures;
- one batch event and order preservation;
- PlotLibre integration and Chromium import regressions.

### 008E — closure

Scope:

- complete public documentation;
- exact-head CI and artifacts;
- immutable runtime handover;
- post-merge main authority synchronization.

## Required runtime fixtures

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

007D can begin only after 008D/E merges.

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

## Design PR acceptance

```text
Markdown-only changed files
accurate implementation inventory
separate schema/Definition version ownership
current 1.0 behavior documented
migration graph/purity contract frozen
pipeline/error/report/limits frozen
partial-import defect documented
atomic replacement mandatory
compatibility matrix complete
runtime slices actionable
Node 20.19 and 22 green
299 Node tests green
Playground build green
handover check green
both benchmarks green
34 Chromium tests green
0 review threads
```

## Cross-stage tasks

Open-source license、coordinated release、docs/test consistency automation、real-browser performance、Playground code splitting、npm boundaries、source/build/deploy/live verification、branch cleanup documentation。

## Non-goals for 008 design/runtime foundation

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

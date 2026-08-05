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
base main SHA:        b1c394f93a0a685d291fba54207dad9f9d020cb2
workspace:            0.0.22
PlotJSON schema:      1.0.0
production migrations: none
public symbols:       19 (14 Arrow + 1 Line + 4 Area)
merged Node tests:    375
008D candidate:       400 Node
Chromium tests:       34
MapLibre Sources:     4
MapLibre Layers:      10
current slice:        008D Registry-aware atomic import
current branch:       agent/008d-plotjson-atomic-import-runtime
current PR:           #59 Draft
next milestone:       008E compatibility closure
```

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
| 008C | safe reader / migration execution / compatibility / invariants | PR #57/#58，已完成 |
| 008D | live Registry preparation / exact-order atomic Store import | PR #59，当前阶段 |
| 008D Finalization | merge-state authority synchronization | 008D merge 后 |
| 008E | compatibility fixtures / examples / matrix / closure | 下一阶段 |
| 007D | groups / locks / visibility / z-order + production migration | 008E 后解除阻塞 |

## 008A–008C 已完成基础

### 008A

- canonical numeric persisted versions;
- getter-free direct-object clone;
- finite JSON and semantic limits;
- structured scalar-context errors.

### 008B

- separate document and Definition migration graphs;
- one exact outgoing chain per source;
- explicit plotType rename edges;
- immutable plans and report records.

### 008C

```ts
readPlotDocument(input, options?): ReadPlotDocumentResult
parsePlotDocument(input, options?): PlotDocument
```

- string/direct-object safe boundary;
- document and Definition migration execution;
- current 1.0 compatibility normalization report;
- duplicate-id and current-schema validation;
- per-feature and final aggregate semantic-limit checks;
- detached deeply frozen document/report.

## 008D 当前实现

### Core preparation

```ts
preparePlotDocumentImport(input, registry, options?)
deriveRegistryDefinitionTargets(features, registry, migrations)
```

Three-pass pure preparation:

```text
Pass 1: document history/current decode
Pass 2: live-target Definition migration
Pass 3: Registry-canonical final detach/scan
```

Document migrations execute once. Definition migrations execute once per required edge. Pass 3 executes no migration.

### Live target resolution

```text
exact live source → no migration
otherwise → unique outgoing chain → first exact live Definition
```

No aliases, nearest versions or best effort.

Multiple historical versions of one source type may converge to one live target. Conflicting final targets for the same source plotType reject.

### Registry preflight

Every feature must exactly match a live Definition version and pass:

```text
registry.canonicalize
registry.generate
```

before Store mutation.

### Store replacement

```ts
store.replaceDocument(features)
```

- clone and duplicate-id validation before commit;
- new ids add;
- reused ids replace;
- old-only ids remove;
- exact imported order;
- one staged transaction;
- one Store batch event;
- imported revisions preserved.

### High-level import

```ts
plot.importDocumentWithReport(input)
plot.importDocument(input)
```

`PlotLibreOptions` accepts a trusted migration registry and copied/frozen PlotJSON limits.

```text
pure prepare
→ one Store commit
→ post-success cleanup
```

No transient state changes before commit.

### Atomicity guarantee

Precommit failure preserves:

```text
Store contents/order
selection/Primary
History stacks
active drawing/draft
armed region selection
armed rotation/scale
active translation
committed rendering
```

After commit, transform/region/translation/drawing/selection/History cleanup runs operation-by-operation. External cleanup-listener failures are logged and cannot turn a committed import into caller-visible failure.

## 008D test matrix

New coverage includes:

- exact live and migrated Definition targets;
- document/Definition migrations execute once;
- historical-version convergence and conflict rejection;
- unknown/incomplete/future/invalid live Definition cases;
- Registry canonicalization/generation failures;
- exact-order Store replacement and one batch event;
- duplicate-id, empty-document and listener behavior;
- report-bearing and compatibility imports;
- resource-limit snapshots;
- failure preservation of Store/order/selection/History;
- active drawing, region and transform rollback;
- success-only cleanup;
- external cleanup listener isolation.

Candidate total: 400 Node tests plus 34 Chromium tests.

## 008D closure tasks

1. complete all authority documents;
2. compare against base and verify expected runtime/test/docs scope;
3. run exact-head Node 20.19/22 and 400 Node tests;
4. run Playground typecheck/build and handover check;
5. run both benchmark jobs and capture artifacts;
6. run 34 Chromium tests;
7. verify zero unresolved review threads;
8. synchronize immutable handover with exact evidence;
9. run one final evidence-head CI;
10. update PR #59 body only;
11. Ready and expected-head squash merge;
12. verify `main`;
13. create Markdown-only 008D finalization;
14. create 008E from synchronized main.

## 008E — compatibility closure

Planned scope:

```text
fixtures/plotjson/current
fixtures/plotjson/historical
fixtures/plotjson/rename
fixtures/plotjson/invalid
fixtures/plotjson/future
```

008E should provide:

- current exact round-trip golden files;
- historical 1.0 normalization fixtures;
- document and Definition migration fixtures;
- explicit type-rename fixtures;
- invalid/future/missing-chain fixtures;
- atomic import rollback fixtures;
- public reader/import examples;
- completed compatibility matrix;
- final documentation and handover synchronization.

008E is closure, not a schema bump.

## 007D unblock condition

Groups、locks、visibility 和 z-order begin only after 008E. A future schema must define stable group ids, validated references, exact z-order semantics, schema-owned locks/visibility, production migration and golden fixtures.

## Validation gate

Every runtime exact head:

```text
Node 20.19 and 22
all Node tests
Playground typecheck/build
handover contract
both observational benchmarks
34 Chromium tests
0 unresolved review threads
immutable runtime handover
```

Post-merge finalization additionally proves Markdown-only scope.

## Non-goals

```text
schema 1.1 before a real persisted-state change
groups/locks/visibility/z-order in 008D/E
downgrade or future-version best effort
unresolved feature mode
async/network migration
arbitrary migration DAG
canonical signed JSON
collaboration version vectors
new symbols
reflection/non-uniform scale/snapping/touch transforms
```

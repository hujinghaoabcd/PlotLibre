# PlotLibre Development Handover — Milestone 008 Design

日期：2026-08-05  
仓库：`hujinghaoabcd/PlotLibre`  
完整交接：`docs/handover/2026-08-05-milestone-008-plotjson-migrations-design.md`

## Current state

```text
main:               fa1648fcd7b263244dabdba31bcdb5b69f74f9a2
workspace:          0.0.22
PlotJSON schema:    1.0.0
production migrations: none
public symbols:     19 (14 Arrow + 1 Line + 4 Area)
Node tests:         299
Chromium tests:     34
MapLibre Sources:   4
MapLibre Layers:    10
007C:               merged PR #47–#50
current branch:     agent/008-plotjson-migrations-design
next branch:        agent/008a-plotjson-version-json-safety-runtime
```

## Validation

Previous synchronized main authority:

```text
PR #49 runtime CI:      30943895213 / #505
PR #49 runtime squash:  2b06d02ba851a9c6ae01d0db1fc503ad5f8699c0
PR #50 docs CI:         30946115205 / #508
PR #50 docs squash:     fa1648fcd7b263244dabdba31bcdb5b69f74f9a2
Node baseline:          299 passed
Chromium baseline:      34 passed
review threads:         0 at merge
```

Milestone 008 design exact-head evidence must be added to its PR after CI. This design branch is required to remain Markdown-only.

## Completed in this milestone

- inventoried current PlotJSON document, feature, parser, Registry and import behavior;
- separated document `schemaVersion` from feature `definitionVersion` responsibilities;
- froze canonical numeric persisted-version syntax;
- rejected the old single `PlotDefinition.migrate()` proposal in favor of a separate migration registry;
- froze deterministic linear document and Definition migration chains;
- prohibited cycles, branch ambiguity, silent aliases and future-version guessing;
- froze migration purity, input immutability and JSON-safe output requirements;
- defined JSON-safety and resource-limit surfaces;
- documented current `1.0.0` historical normalizations;
- froze migration report and stable PlotJSON error categories;
- defined full parse → migrate → Definition migrate → Registry preflight ordering;
- identified missing duplicate-id validation and Definition-version enforcement;
- identified the current partial-import risk from `store.clear()` plus repeated `add()`;
- required one complete atomic Store replacement and one batch event;
- added compatibility, failure-state, determinism and fixture matrices;
- divided runtime into 008A–008E reviewable slices;
- kept production schema at `1.0.0` during migration-foundation runtime;
- froze the conditions that later unblock 007D groups/locks/visibility/z-order.

Authority:

```text
docs/PLOTJSON_SPEC.md
docs/design/plotjson-migrations.md
docs/design/plotjson-compatibility-matrix.md
docs/algorithms/plotjson-migration-pipeline.md
docs/handover/2026-08-05-milestone-008-plotjson-migrations-design.md
```

## Next tasks

1. verify changed files are Markdown only;
2. create a Draft design PR against synchronized main;
3. run Node 20.19 and Node 22 validation;
4. confirm 299 historical Node tests and Playground build;
5. confirm handover contract and both benchmark jobs;
6. confirm 34 Chromium tests;
7. resolve every review thread;
8. record exact head, CI and artifacts in the PR;
9. mark Ready without changing the head;
10. squash merge with expected head SHA;
11. verify new main and synchronize post-merge authority if required;
12. create `agent/008a-plotjson-version-json-safety-runtime`;
13. implement only version parsing, JSON-safety cloning/scanning, resource limits and PlotJsonError primitives in 008A.

Runtime sequence:

```text
008A version / JSON safety / limits / errors
008B migration registry / chain planner / report
008C current reader compatibility / invariants
008D Registry-aware preparation / atomic import
008E runtime documentation / handover / synchronization
```

007D remains blocked until 008D/E are merged.

## Risks and decisions

- current `1.0.0` parser defaults several malformed optional fields rather than rejecting;
- changing same-version normalization silently would break compatibility;
- unknown `1.0.0` structural fields are dropped and cannot preserve future core state;
- direct object input may contain non-JSON values or cycles and needs deeper validation;
- Registry currently ignores Definition-version mismatch;
- current import can partially replace Store when duplicate ids fail after `clear()`;
- `PlotStore.applyTransaction()` does not yet provide a direct complete-document replacement with reused ids;
- concrete resource-limit defaults require runtime tests and measurement;
- migration reports must not leak complete metadata;
- arbitrary migration DAGs, downgrade, future-version best effort and unresolved-feature mode are excluded;
- exact future group/lock/visibility JSON shape belongs to 007D design, not 008 foundation.

# PlotLibre Development Handover — Milestone 008B Migration Planning

日期：2026-08-05  
仓库：`hujinghaoabcd/PlotLibre`  
完整交接：`docs/handover/2026-08-05-milestone-008b-migration-planning.md`

## Current state

```text
main:               c77c5c50ea5976f7afd40f0e48bc712515a99cd5
workspace:          0.0.22
PlotJSON schema:    1.0.0
production migrations: none
public symbols:     19 (14 Arrow + 1 Line + 4 Area)
merged Node tests:  324
008B expected Node: 348
Chromium tests:     34
MapLibre Sources:   4
MapLibre Layers:    10
008A runtime:       merged PR #53/#54
008B runtime:       Draft PR #55
current branch:     agent/008b-plotjson-migration-registry-runtime
next branch:        agent/008c-plotjson-reader-runtime
```

## Validation

Initial 008B code head:

```text
head:                  291d08cf517569b1598f40e71487c1fc3c220657
CI run:                30957226567 / #531
Node 20.19 / 22:       success
Node tests:            343 passed
Playground typecheck:  success
Playground build:      success
handover check:        success
region benchmark:      success
transform benchmark:   success
browser:               started after non-browser gates
```

Five hardening tests and documentation were added afterward. The expected final Node total is 348. Initial-head results are not final merge evidence.

Final exact-head requirements:

```text
Node 20.19 / 22
348 Node tests
Playground typecheck/build
handover check
region benchmark + artifact
selection-transform benchmark + artifact
34 Chromium tests
0 unresolved review threads
```

## Completed in this milestone

- added engine-independent document migration descriptors;
- added exact Definition references keyed by `(plotType, definitionVersion)`;
- represented plotType renames as explicit migration edges;
- added separate document and Definition registries;
- normalized all versions through the canonical 008A parser;
- required strictly increasing versions;
- rejected self/decreasing/malformed registrations;
- rejected exact duplicates and branch ambiguity through one outgoing edge per source node;
- copied and froze registered descriptors and nested references;
- rolled back invalid insertions;
- added sorted immutable registry snapshots;
- added deterministic document and Definition chain planning;
- rejected downgrade, missing path, overshoot and wrong-target-type plans;
- returned frozen exact-order plans and shared frozen empty plans;
- proved planning never invokes migration functions;
- added immutable applied-step, normalization, warning and report record types;
- added deep-copy/deep-freeze report construction;
- proved iterative exact-order planning over 256 edges;
- kept parser, migration execution, Registry, Store, MapLibre and schema behavior unchanged.

Authority:

```text
packages/core/src/plotjson-migration-types.ts
packages/core/src/plotjson-migration-registry.ts
packages/core/src/plotjson-migration-report.ts
docs/design/plotjson-migration-registry-runtime.md
docs/handover/2026-08-05-milestone-008b-migration-planning.md
```

## Next tasks

1. stop changing the runtime branch after final documentation review;
2. run exact-head CI and confirm 348 Node tests;
3. confirm 34 Chromium tests and both benchmark artifacts;
4. verify zero unresolved review threads;
5. update PR #55 with exact head, CI and artifact evidence;
6. mark PR #55 Ready without changing head;
7. squash merge with expected head SHA;
8. verify new `main`;
9. create a Markdown-only 008B post-merge finalization branch;
10. synchronize actual squash/main authority;
11. create `agent/008c-plotjson-reader-runtime` only from synchronized main;
12. implement safe reader and migration execution without Store/MapLibre mutation.

## Risks and decisions

- migration histories are deliberately linear per source node, not arbitrary DAGs;
- branch ambiguity is rejected rather than resolved heuristically;
- a Definition rename must advance version; same-version rename is excluded;
- registry configuration failures are developer-facing `PlotJsonMigrationRegistryError` values;
- missing input paths and unsupported versions remain `PlotJsonError` values;
- migration functions are trusted references and are not executed or output-validated in 008B;
- graph validation is O(E) per registration; histories are expected to remain small;
- planner complexity is O(L), with no latency SLA claimed;
- current `parsePlotDocument()` remains permissive until 008C;
- Registry still ignores Definition-version mismatch until 008C/008D;
- current import remains non-atomic under duplicate ids until 008D;
- downgrade, future-version best effort and unresolved-feature preservation remain excluded;
- 007D groups/locks/visibility/z-order remains blocked through 008D/E.

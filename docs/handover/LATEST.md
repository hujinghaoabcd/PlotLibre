# PlotLibre Development Handover — Milestone 008B Merged

日期：2026-08-05  
仓库：`hujinghaoabcd/PlotLibre`  
完整交接：`docs/handover/2026-08-05-milestone-008b-post-merge-finalization.md`

## Current state

```text
main:               409786f6a55aeab6e810651410954d78123e32d3
workspace:          0.0.22
PlotJSON schema:    1.0.0
production migrations: none
public symbols:     19 (14 Arrow + 1 Line + 4 Area)
Node tests:         348
Chromium tests:     34
MapLibre Sources:   4
MapLibre Layers:    10
008A runtime:       merged PR #53/#54
008B runtime:       merged PR #55
current branch:     agent/008b-plotjson-post-merge-finalization
next branch:        agent/008c-plotjson-reader-runtime
```

## Validation

```text
PR:                    #55
validated head:        c86bcc02d2b85bb1495d8a3e659d2e3d5ff18335
CI:                    30957964547 / #541
Node 20.19 / 22:       success
Node tests:            348 passed
Playground typecheck:  success
Playground build:      success
handover check:        success
region benchmark:      success / artifact 8911803937
transform benchmark:   success / artifact 8911810112
Chromium tests:        34 passed
review threads:        0
changed files:         15 expected files
merge method:          squash with expected head
squash/main SHA:       409786f6a55aeab6e810651410954d78123e32d3
```

## Completed in this milestone

- added engine-independent document migration descriptors;
- added exact Definition references keyed by `(plotType, definitionVersion)`;
- represented plotType renames as explicit migration edges;
- added separate document and Definition registries;
- normalized versions through the canonical 008A parser;
- required strictly increasing versions;
- rejected self, decreasing and malformed registrations;
- rejected exact duplicates and branch ambiguity;
- copied and froze registered descriptors and nested references;
- rolled back invalid insertions;
- added sorted immutable registry snapshots;
- added deterministic document and Definition chain planning;
- rejected downgrade, missing path, overshoot and wrong-target-type plans;
- returned frozen exact-order plans and shared frozen empty plans;
- proved planning never invokes migration functions;
- added immutable applied-step, normalization, warning and report records;
- added deep-copy/deep-freeze report construction;
- proved iterative exact-order planning over 256 edges;
- synchronized PlotJSON specification and architecture;
- kept parser, migration execution, Registry, Store, MapLibre and schema behavior unchanged.

Authority:

```text
packages/core/src/plotjson-migration-types.ts
packages/core/src/plotjson-migration-registry.ts
packages/core/src/plotjson-migration-report.ts
docs/PLOTJSON_SPEC.md
docs/design/plotjson-migration-registry-runtime.md
docs/handover/2026-08-05-milestone-008b-migration-planning.md
docs/handover/2026-08-05-milestone-008b-post-merge-finalization.md
```

## Next tasks

1. complete exact-head CI for this Markdown-only finalization;
2. confirm 348 Node and 34 Chromium tests;
3. confirm both benchmark artifacts and zero review threads;
4. mark the finalization PR Ready without changing head;
5. squash merge with expected head;
6. verify the new synchronized `main`;
7. delete merged branches when connector support permits;
8. create `agent/008c-plotjson-reader-runtime` from synchronized main;
9. implement string/direct-object safe reading;
10. execute document migrations over cloned JSON;
11. scan every migration output;
12. preserve and report historical `1.0.0` normalization;
13. enforce document invariants and duplicate feature ids;
14. execute Definition migrations and require final version equality;
15. expose `readPlotDocument()` and retain `parsePlotDocument()` compatibility;
16. keep Store and MapLibre mutation out of 008C.

## Risks and decisions

- migration histories are deliberately linear per source node, not arbitrary DAGs;
- branch ambiguity is rejected rather than resolved heuristically;
- a Definition rename must advance version; same-version rename is excluded;
- registry configuration failures are developer-facing `PlotJsonMigrationRegistryError` values;
- missing input paths and unsupported versions remain `PlotJsonError` values;
- migration functions are trusted references and were not executed or output-validated in 008B;
- graph validation is O(E) per registration; histories are expected to remain small;
- planner complexity is O(L), with no latency SLA claimed;
- current `parsePlotDocument()` remains permissive until 008C;
- Registry still ignores Definition-version mismatch until 008C/008D;
- current import remains non-atomic under duplicate ids until 008D;
- downgrade, future-version best effort and unresolved-feature preservation remain excluded;
- 007D groups, locks, visibility and z-order remain blocked through 008D/E.

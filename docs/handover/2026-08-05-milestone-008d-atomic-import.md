# PlotLibre Handover — Milestone 008D Registry-Aware Atomic Import

日期：2026-08-05  
仓库：`hujinghaoabcd/PlotLibre`  
PR：#59  
分支：`agent/008d-plotjson-atomic-import-runtime`  
基线 main：`b1c394f93a0a685d291fba54207dad9f9d020cb2`

## 1. Milestone result

008D connects the pure 008C reader to live Definitions and application state while preserving one strict commit boundary.

```text
workspace:             0.0.22
persisted schema:      PlotLibreDocument / 1.0.0
production migrations: none
public Definitions:    19
candidate Node tests:  400
Chromium baseline:     34
Store import events:   one batch event
schema change:         none
next milestone:        008E compatibility closure
```

## 2. Runtime authority

```text
packages/core/src/plotjson-import.ts
packages/core/src/store.ts
packages/core/src/index.ts
packages/maplibre/src/plotlibre.ts
```

Tests:

```text
tests/plotjson-import.test.mjs
tests/plotjson-import-hardening.test.mjs
tests/store-document-replacement.test.mjs
tests/maplibre-import-atomic.test.mjs
tests/maplibre-import-state-hardening.test.mjs
tests/maplibre-import-cleanup.test.mjs
```

Design:

```text
docs/design/plotjson-atomic-import-runtime.md
```

## 3. New public APIs

```ts
preparePlotDocumentImport(input, registry, options?)
deriveRegistryDefinitionTargets(features, registry, migrations)
store.replaceDocument(features)
plot.importDocumentWithReport(input)
plot.importDocument(input)
```

`PlotLibreOptions` now accepts:

```ts
migrations?: PlotJsonMigrationRegistry
plotJsonLimits?: Partial<PlotJsonLimits>
```

`importDocument()` remains the document-only compatibility wrapper. `importDocumentWithReport()` returns the final prepared current document and immutable migration report.

## 4. Pure preparation

`preparePlotDocumentImport()` mutates no external application state.

It performs three bounded reader passes:

1. document schema migration and current decode;
2. live Definition target derivation and Definition migration;
3. final Registry-canonicalized document detachment and safety scan.

Document migration functions execute exactly once. Definition migration functions execute once per required feature edge. The final pass executes no migrations.

The final report combines first-pass document history and second-pass Definition history.

## 5. Live Definition targets

Each registered live Definition contributes an exact canonical reference:

```text
(definition.type, definition.version)
```

Resolution policy:

```text
exact live source → no migration
otherwise → follow unique outgoing Definition edges
stop → first exact live reference
```

No alias, nearest-version or best-effort choice exists.

Failures:

```text
unknown source            PLOTJSON_DEFINITION_NOT_FOUND
incomplete history        PLOTJSON_DEFINITION_MIGRATION_PATH_MISSING
source newer than live    PLOTJSON_DEFINITION_VERSION_UNSUPPORTED
invalid live version      PLOTJSON_DEFINITION_VERSION_INVALID
```

Multiple versions of one source plotType may converge to one live target. If they resolve to different final targets, the document rejects because the 008C target map is keyed by source plotType.

## 6. Registry preflight

Every migrated feature must exactly match a live Definition version. Then:

```text
registry.canonicalize(feature)
→ registry.generate(canonicalFeature)
```

runs completely in memory.

Any validation or generation failure occurs before Store mutation. Canonicalized features are passed through a final current-reader clone and semantic-limit scan.

## 7. Atomic Store replacement

`PlotStore.replaceDocument()`:

- clones the complete candidate;
- rejects duplicate ids before mutation;
- classifies new, reused and removed ids;
- stages exact imported order;
- delegates to one existing transaction;
- commits one complete Store Map;
- emits one immutable `batch` event.

Reused ids are replacements and retain imported revisions. New ids are additions. Old-only ids are removals.

Listener failures are isolated after commit and cannot roll back Store state.

## 8. High-level import atomicity

Before commit, failures preserve:

```text
Store contents and order
selection and Primary
History undo/redo stacks
active drawing and draft
armed region selection
armed rotation/scale
active translation
committed MapLibre rendering
```

The high-level path is:

```text
preparePlotDocumentImport
→ store.replaceDocument
→ post-success cleanup
```

No interaction is cancelled before preparation and Store commit succeed.

## 9. Success cleanup

After successful Store commit:

```text
selection transform cancel
region selection cancel
translation cancel
drawing cancel
selection clear
History clear
```

The cleanup order is not part of canonical Store atomicity; the Store event is the commit boundary.

## 10. Post-commit cleanup isolation

External transient-state listeners can throw. Once Store has committed, such exceptions cannot truthfully turn import into failure.

Each cleanup operation runs independently. Errors are collected and logged after all operations. Logging errors are ignored. `importDocumentWithReport()` returns the successful result.

This preserves the distinction:

```text
precommit failure  → no state change + caller-visible error
postcommit cleanup failure → committed state + logged cleanup error
```

## 11. Configuration ownership

The migration registry is retained by identity so trusted migrations can be installed intentionally.

PlotJSON limits are shallow-copied and frozen during `PlotLibre` construction. Caller mutation after construction cannot change the active safety policy.

## 12. Tests

The new tests verify:

- exact live Definitions and no-op Definition migration;
- document and Definition migrations execute once;
- explicit plotType rename chains;
- exact live source priority;
- historical-version convergence and target conflict rejection;
- unknown, incomplete, future and malformed live Definition cases;
- Registry canonicalization/generation before mutation;
- exact-order complete Store replacement;
- one Store event and caller-container isolation;
- empty-document replacement and listener isolation;
- report-bearing and compatibility imports;
- renderer update from one Store event;
- failure preservation of Store, order, selection and History;
- active draw, region and transform preservation;
- success-only cleanup;
- cleanup-listener failure isolation;
- immutable configured limit snapshot.

## 13. Explicit non-effects

008D does not:

```text
bump schemaVersion
register production migrations
change Definition geometry algorithms
make import undoable
persist selection or History
add renderer resources
support unresolved Definitions
support downgrade or future-version best effort
add groups, locks, visibility or z-order
```

## 14. Validation history

### Initial implementation

```text
head:                  5e8ba02a6aa1c0c1c05dc958929199bfceedfa7e
CI:                    30963911651
Node tests:            394 passed
Chromium:              34 passed
```

### State hardening

```text
head:                  321de6fba15a2cdd467b239c99dbf74fe2b8f070
CI:                    30964402517
candidate Node tests:  398
```

### Cleanup isolation candidate

```text
head:                  dc08add7ccb9be4aff4403b16c5a48ecfe9a0951
CI:                    30964661175
candidate Node tests:  400
region artifact:       8914251924
transform artifact:    8914251697
```

Artifact digests:

```text
region:    sha256:0577b7c7df90293e4af2190889daa584ec425a0ee824bc3f5b06a2ec25e2d6b8
transform: sha256:97036074e208c487220ae475b60b7a6fe4ade678f65191572de5bfd1ac7c0785
```

The cleanup-isolation candidate's Chromium job was still running when documentation work began. This evidence cannot substitute for the final documentation head.

## 15. Final validation gate

Before Ready/merge, the final exact head must pass:

```text
Node 20.19
Node 22
400 Node tests
Playground typecheck/build
handover contract
region-selection benchmark
selection-transform benchmark
34 Chromium tests
0 unresolved review threads
```

The final PR body must record exact head, run, artifact ids/digests and review-thread count.

## 16. Known remaining work

008E must close the PlotJSON evolution series with:

- stable compatibility fixture directories;
- current, historical, rename, invalid and future golden files;
- completed compatibility matrix;
- public reader/import examples;
- end-to-end round-trip and rollback fixtures;
- final documentation synchronization.

No production 1.1 schema or migration is introduced until a persisted-state feature actually requires it.

## 17. Merge discipline

1. synchronize README, AGENTS, architecture, PlotJSON spec, roadmap and LATEST;
2. compare against `b1c394f93a0a685d291fba54207dad9f9d020cb2` and verify expected scope;
3. run complete exact-head CI;
4. verify 400 Node and 34 Chromium tests;
5. verify both artifacts and zero review threads;
6. update this handover with final evidence;
7. run one final evidence-synchronization CI;
8. update PR #59 body only;
9. mark Ready without changing head;
10. squash merge with expected head;
11. verify current `main`;
12. create a Markdown-only 008D post-merge finalization branch;
13. create 008E only from synchronized main.

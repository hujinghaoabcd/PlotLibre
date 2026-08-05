# PlotJSON Registry-Aware Atomic Import Runtime

Status: Milestone 008D runtime authority  
Branch: `agent/008d-plotjson-atomic-import-runtime`  
Persisted schema: `PlotLibreDocument / 1.0.0`  
Production migrations: none

## 1. Purpose

008D connects the pure 008C reader to live `PlotRegistry`, `PlotStore`, interaction state and MapLibre rendering without weakening the reader's safety boundary.

The central guarantee is:

```text
Every expected failure before Store commit preserves the complete application state.
```

The imported document is not applied feature-by-feature. It is fully read, migrated, resolved against live Definitions, canonicalized and generated in memory before one exact-order Store replacement transaction.

## 2. Public APIs

Core preparation:

```ts
interface PreparePlotDocumentImportOptions {
  readonly migrations?: PlotJsonMigrationRegistry;
  readonly limits?: Partial<PlotJsonLimits>;
}

preparePlotDocumentImport(
  input: string | unknown,
  registry: PlotRegistry,
  options?: PreparePlotDocumentImportOptions,
): ReadPlotDocumentResult

deriveRegistryDefinitionTargets(
  features: readonly PlotFeature[],
  registry: PlotRegistry,
  migrations: PlotJsonMigrationRegistry,
): Readonly<Record<string, PlotJsonDefinitionReference>>
```

Store replacement:

```ts
store.replaceDocument(
  features: readonly PlotFeature[],
): PlotStoreBatchChange
```

High-level MapLibre facade:

```ts
interface PlotLibreOptions {
  readonly migrations?: PlotJsonMigrationRegistry;
  readonly plotJsonLimits?: Partial<PlotJsonLimits>;
}

plot.importDocumentWithReport(input): ReadPlotDocumentResult
plot.importDocument(input): PlotDocument
```

`importDocument()` remains the compatibility wrapper. `importDocumentWithReport()` exposes the prepared current document and immutable migration report.

## 3. Complete import pipeline

```text
untrusted input
→ 008C document read / document migration / current decode
→ derive exact live Definition targets
→ 008C Definition migration and exact target validation
→ Registry canonicalize every feature
→ Registry generate every feature
→ final detached current-document scan
→ one exact-order PlotStore.replaceDocument() commit
→ one Store batch event
→ post-commit transient-state cleanup
→ renderer observes committed Store event
```

No Store, selection, History, interaction or MapLibre mutation occurs during the preparation phase.

## 4. Three-pass pure preparation

`preparePlotDocumentImport()` deliberately uses the existing pure reader in three bounded passes.

### Pass 1 — document history

```text
input
→ JSON boundary
→ document schema migration
→ current 1.0 decode
→ immutable current document + document report
```

Definition targets are omitted. This pass executes every document migration exactly once.

### Pass 2 — Definition history

```text
already-current immutable document
→ explicit targets derived from live Registry
→ exact Definition migration chains
→ immutable migrated document + feature-step report
```

Because the input schema is already current, document migration functions are not executed a second time.

### Pass 3 — canonical final document

```text
Registry-canonicalized features
→ current reader clone/validation
→ detached deeply frozen final document
```

This pass re-establishes PlotJSON safety and semantic limits after Registry canonicalization. It executes no document or Definition migration.

The final report merges:

```text
Pass 1 document steps and compatibility facts
+ Pass 2 Definition steps and compatibility facts
```

Pass 3 is validation/detachment only and contributes no migration history.

## 5. Live Definition target derivation

The live Registry exposes one exact Definition reference per registered type:

```text
(definition.type, canonical definition.version)
```

Every live Definition version must be a canonical numeric `MAJOR.MINOR.PATCH`. Invalid live configuration fails before generation.

For each decoded source feature:

```text
source reference already exactly live
→ use source reference, perform no migration

otherwise
→ follow the unique 008B outgoing Definition edge
→ stop at the first exact live Definition reference
```

The resolver does not infer aliases, choose nearest versions, skip missing steps or select best-effort targets.

Failure behavior:

```text
unknown type with no history  → PLOTJSON_DEFINITION_NOT_FOUND
incomplete chain              → PLOTJSON_DEFINITION_MIGRATION_PATH_MISSING
source newer than live target → PLOTJSON_DEFINITION_VERSION_UNSUPPORTED
invalid live version          → PLOTJSON_DEFINITION_VERSION_INVALID
```

## 6. Source plotType target consistency

The 008C reader's explicit target map is keyed by source `plotType`. Therefore all features sharing one source plotType must resolve to the same final live Definition reference.

Multiple historical versions may converge:

```text
arrow.legacy@0.5.0
→ arrow.legacy@1.0.0
→ arrow.current@2.0.0
```

Both `0.5.0` and `1.0.0` may appear in one document because they share the same final target.

Conflicting histories reject:

```text
arrow.legacy@0.5.0 → arrow.current-a@1.0.0
arrow.legacy@1.0.0 → arrow.current-b@2.0.0
```

A document cannot silently reinterpret one source type as two different live Definitions.

## 7. Registry preflight

After migration, every feature must exactly match a live Definition:

```text
feature.plotType === definition.type
feature.definitionVersion === canonical definition.version
```

Then the complete preflight runs:

```text
registry.canonicalize(feature)
→ registry.generate(canonicalFeature)
```

Generation validates control semantics, parameters, style and renderable geometry. Any failure occurs before Store mutation and exposes no prepared result.

Registry canonicalization may reorder authored controls where the Definition explicitly permits it. The final reader pass detaches and validates those canonical features before commit.

## 8. Atomic Store document replacement

`PlotStore.replaceDocument()` converts a complete ordered candidate into one existing staged transaction:

```text
new-only ids       → add
reused ids         → replace
old-only ids       → remove
candidate id order → orderedIds
```

Before commit it:

- clones every candidate feature;
- rejects duplicate candidate ids;
- validates all add/replace/remove preconditions;
- validates the complete post-transaction order;
- stages the complete Map.

Then it performs:

```text
one Store Map replacement
→ one immutable batch event
```

Reused ids preserve the imported feature's authored revision exactly; import is document replacement, not an interactive revision increment.

Listener failures after commit are isolated by `PlotStore` and cannot roll back canonical state.

## 9. Application-state atomicity

The following state must remain unchanged on every expected precommit failure:

```text
Store contents
Store document order
selection membership and Primary
CommandHistory undo/redo stacks
active drawing session and draft
armed/active box or lasso selection
armed/active rotation or scale
active selection translation
MapLibre committed rendering
```

Examples covered by tests include malformed input, resource limits, unknown Definitions, missing migration paths, invalid live versions and Registry generation failure.

## 10. Success cleanup order

Only after `store.replaceDocument()` succeeds does `PlotLibre` clean incompatible transient state:

```text
cancel selection transform
cancel region selection
cancel translation
cancel drawing
clear selection
clear History
```

The Store event is the canonical commit boundary. Renderer and selection reconciliation observe that event.

## 11. Post-commit cleanup failure isolation

After Store commit, the import is successful even if an external transient-state listener throws. Reporting the method as failed would be false because canonical Store state has already changed.

008D therefore runs each cleanup operation independently:

```text
try operation
→ capture failure
→ continue remaining cleanup
→ log all failures after cleanup
→ return successful import result
```

Logging failure is also ignored. A committed import cannot be converted into a caller-visible failure by external selection listeners or console implementations.

## 12. Configuration snapshots

`PlotLibre` keeps the provided migration registry by identity so applications can install trusted migrations intentionally.

`plotJsonLimits` is copied and frozen at construction. Later caller mutation cannot weaken or relax the configured input boundary.

## 13. Events and rendering

A successful non-empty import emits exactly one Store `batch` event. The event identifies:

```text
addedIds
updatedIds
removedIds
combined ids
```

The Store's exact final order is the imported document order.

MapLibre rendering remains derived. The existing Store subscription renders the complete new Store snapshot from the one successful event. No new Source or Layer is introduced.

## 14. Error and report behavior

Reader/migration failures remain `PlotJsonError` values with scalar context.

Registry validation/generation errors retain their existing framework error semantics. They occur during pure preflight and cannot partially modify application state.

The returned report contains only document/Definition migrations and compatibility normalizations. Registry canonicalization is not represented as schema migration history.

## 15. Explicit non-effects

008D does not:

```text
bump PlotJSON schema
register a production migration
modify public Definition algorithms
persist selection or History
make import undoable
add MapLibre Sources or Layers
add groups, locks, visibility or z-order
support downgrade or future-version best effort
preserve unresolved Definitions
```

Import intentionally resets History after success because prior commands reference the replaced document.

## 16. Test matrix

Core preparation tests cover:

- exact live Definition without migration;
- document and Definition migrations execute once;
- explicit type-renaming chains;
- exact live source wins over newer outgoing history;
- multiple historical versions converge to one live target;
- conflicting targets for one source type reject;
- unknown, incomplete and future Definition histories;
- invalid live Definition versions;
- Registry canonicalization/generation preflight.

Store tests cover:

- reused/new/removed ids in exact imported order;
- one immutable batch event;
- candidate clone isolation;
- duplicate ids before mutation;
- empty document replacement;
- listener failure after commit.

High-level tests cover:

- successful report-bearing and compatibility imports;
- one Store event and renderer refresh;
- migration registry injection;
- configured resource limits;
- failure rollback for Store/order/selection/History;
- active drawing draft preservation;
- armed region and transform preservation;
- success-only transient cleanup;
- external cleanup-listener failure isolation;
- immutable limit snapshots.

## 17. Next milestone

008E closes the PlotJSON evolution sequence with compatibility fixtures, public examples, completed compatibility matrices and final documentation synchronization.

008E does not introduce production groups/locks/visibility/z-order. Those remain 007D work after the migration/import foundation is fully closed.

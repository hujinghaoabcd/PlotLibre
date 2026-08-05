# PlotJSON 1.0 规范与版本策略

状态：

```text
current persisted schema: 1.0.0
public reader: readPlotDocument()
reader wrapper: parsePlotDocument()
public prepared import: preparePlotDocumentImport()
high-level report import: PlotLibre.importDocumentWithReport()
high-level wrapper: PlotLibre.importDocument()
008A: version / JSON safety / limits merged
008B: migration registry / planner / report records merged
008C: safe reader / migration execution / compatibility report merged
008D: Registry-aware atomic import active in PR #59
production migrations: none
future schema bump: deferred until a real persisted-state change
```

权威文档：

```text
docs/design/plotjson-migrations.md
docs/design/plotjson-compatibility-matrix.md
docs/design/plotjson-version-json-safety-runtime.md
docs/design/plotjson-migration-registry-runtime.md
docs/design/plotjson-reader-runtime.md
docs/design/plotjson-atomic-import-runtime.md
docs/algorithms/plotjson-migration-pipeline.md
```

## 1. Purpose

PlotJSON stores semantic parametric plots rather than only generated GeoJSON. It preserves stable identity, `plotType`, Definition version, authored controls, parameters, style, metadata, revision and document order.

Generated geometry, samples, guides, handles, hit areas, selection overlays and transform previews are never canonical persisted state.

## 2. Current document

```json
{
  "type": "PlotLibreDocument",
  "schemaVersion": "1.0.0",
  "id": "operation-plan-001",
  "name": "Operation Plan",
  "features": [],
  "metadata": {}
}
```

Current `features` array order is the document order.

## 3. Current feature

```json
{
  "id": "main-direction",
  "plotType": "arrow.straight",
  "definitionVersion": "1.0.0",
  "controlPoints": [[118.78, 32.04], [118.86, 32.1]],
  "parameters": {},
  "style": {},
  "metadata": {},
  "revision": 0
}
```

Rules:

- `id` is unique within the document;
- `plotType` identifies one semantic Definition history;
- `definitionVersion` identifies authored Definition semantics;
- control points are finite WGS84 `[longitude, latitude]` pairs;
- latitude is within `[-90,90]`;
- parameters/style/metadata are JSON records;
- retained revision is a non-negative safe integer;
- derived geometry is not persisted.

## 4. Independent version domains

```text
schemaVersion
→ document structure, ordering, references and schema-owned state

definitionVersion
→ one Definition's authored-control and parameter semantics
```

A Definition type rename is an explicit migration edge, not a Registry alias.

## 5. Persisted version syntax

Versions are canonical numeric triples:

```text
MAJOR.MINOR.PATCH
```

Each component is a non-negative safe integer. Prefixes, omitted components, leading zeros, prerelease/build suffixes and unsafe integers reject. Comparison is numeric, never lexical.

## 6. JSON boundary and limits

Text input is measured in UTF-8 bytes before parsing. Direct values are cloned through descriptor inspection without invoking getters.

Accepted values are JSON primitives, dense arrays and plain/null-prototype objects. Accessors, symbols, hidden properties, custom prototypes, sparse arrays, cycles, non-finite values and non-JSON object families reject.

Default ceilings:

```text
UTF-8 bytes:             16 MiB
maximum depth:           128
value nodes:             1,000,000
object keys:             250,000
string/key length:       1,000,000 UTF-16 code units
features:                100,000
controls per feature:    10,000
total authored controls: 1,000,000
```

These are untrusted-input safety ceilings, not performance SLAs.

## 7. Current 1.0 compatibility

008C preserves historical interpretation and reports it:

```text
missing/non-string definitionVersion → "1.0.0"
missing/non-record parameters         → {}
missing/non-record style              → {}
missing/non-record feature metadata   → {}
missing/invalid revision              → 0
unknown root/feature fields           → dropped
```

Unknown keys are processed in sorted order. Duplicate feature ids reject before application mutation.

## 8. Migration graphs

Document nodes are schema versions. Definition nodes are exact `(plotType, definitionVersion)` references.

Every source node has at most one strictly increasing outgoing edge. Duplicate, branch, self, decreasing and cycle configurations reject. Planning follows the unique exact chain and never invokes migration functions.

## 9. Reader migration execution

Every document or Definition migration:

```text
receives frozen safe cloned JSON
→ executes synchronously
→ returns a new JSON object
→ passes JSON/resource scan
→ matches exact target envelope/reference
→ records a step only after success
```

Same-object, Promise, thrown, accessor, cycle, custom-prototype, malformed or resource-exceeding outputs reject.

## 10. Reader API

```ts
readPlotDocument(input, options?): ReadPlotDocumentResult
parsePlotDocument(input, options?): PlotDocument
```

`ReadPlotDocumentResult` contains a detached deeply frozen current document and immutable migration report.

`definitionTargets` is explicit configuration keyed by source plotType. Exact source/target equality performs no migration. Missing or incomplete targets fail closed.

After all Definition migrations the complete final document is scanned again to enforce aggregate semantic budgets such as `totalControlPoints`.

## 11. Registry-aware import preparation

```ts
preparePlotDocumentImport(input, registry, options?)
deriveRegistryDefinitionTargets(features, registry, migrations)
```

Preparation has three passes:

```text
Pass 1 document migration/current decode
Pass 2 Definition migration to live targets
Pass 3 Registry-canonical final detach/scan
```

Document migrations execute once. Definition migrations execute once per required edge. Pass 3 executes no migration.

## 12. Live Definition target resolution

Each registered Definition contributes exact `(definition.type, canonical definition.version)`.

```text
source exactly live → no migration
otherwise           → follow unique outgoing Definition edges
stop                → first exact live reference
```

No alias, nearest version or best effort exists.

Failures:

```text
unknown source            PLOTJSON_DEFINITION_NOT_FOUND
incomplete chain          PLOTJSON_DEFINITION_MIGRATION_PATH_MISSING
source newer than live    PLOTJSON_DEFINITION_VERSION_UNSUPPORTED
invalid live version      PLOTJSON_DEFINITION_VERSION_INVALID
```

Multiple historical versions of one source plotType may converge to one live target. Different final targets for one source type reject.

## 13. Registry preflight

Every migrated feature must satisfy:

```text
feature.plotType === liveDefinition.type
feature.definitionVersion === canonical liveDefinition.version
```

Then:

```text
registry.canonicalize(feature)
registry.generate(canonicalFeature)
```

runs completely before Store mutation. Any validation or generation failure exposes no prepared result.

## 14. Atomic Store replacement

```ts
store.replaceDocument(features)
```

The complete candidate is cloned and duplicate ids reject before mutation.

```text
new-only ids  → add
reused ids    → replace
old-only ids  → remove
array order   → exact final Store order
```

One staged transaction commits one Store Map and emits one immutable batch event. Imported revisions are preserved exactly.

## 15. High-level import

```ts
plot.importDocumentWithReport(input): ReadPlotDocumentResult
plot.importDocument(input): PlotDocument
```

`PlotLibreOptions` accepts a trusted migration registry and PlotJSON limits. Limits are copied/frozen at construction.

Sequence:

```text
preparePlotDocumentImport
→ store.replaceDocument
→ post-success transient-state cleanup
```

Every expected precommit failure preserves Store/order, selection/Primary, History, active drawing/draft, region selection, rotation/scale, translation and committed rendering.

## 16. Post-success cleanup

After Store commit:

```text
cancel transform
cancel region
cancel translation
cancel drawing
clear selection
clear History
```

Each cleanup operation is isolated. External listener or logging failures cannot turn an already committed import into a caller-visible failure.

## 17. Reports and errors

Reports include document migration steps, per-feature Definition steps, explicit type renames, compatibility normalizations and warnings. They do not contain full documents, business metadata or executable functions.

Errors retain scalar context only:

```text
path
featureId
plotType
sourceVersion
targetVersion
limitName
limit
actual
cause
```

## 18. Non-goals

```text
schema 1.1 before a real persisted-state change
production migrations without a real old document
undoable import
unresolved Definition preservation
downgrade or future-version best effort
async/network migrations
arbitrary migration DAG
groups / locks / visibility / z-order
```

## 19. Next closure

008E will add golden compatibility fixtures, completed compatibility matrices, public examples and end-to-end round-trip/rollback coverage. Production groups/locks/visibility/z-order remain blocked until that closure is complete.

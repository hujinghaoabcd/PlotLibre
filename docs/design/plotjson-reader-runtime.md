# PlotJSON Reader Runtime

Status: Milestone 008C runtime authority  
Branch: `agent/008c-plotjson-reader-runtime`  
Production schema: `PlotLibreDocument / 1.0.0`  
Store and MapLibre mutation: excluded

## 1. Purpose

008C connects the version, JSON-safety and deterministic migration-planning foundations delivered by 008A/008B into one pure reader. It accepts untrusted text or direct JavaScript values, produces a current immutable `PlotDocument`, and records every successful migration and compatibility normalization in an immutable report.

The reader is intentionally engine-independent. It does not know about MapLibre, browser events, `PlotStore`, selection, History or rendering.

## 2. Public API

```ts
interface ReadPlotDocumentOptions {
  readonly migrations?: PlotJsonMigrationRegistry;
  readonly definitionTargets?: Readonly<
    Record<string, PlotJsonDefinitionReference>
  >;
  readonly limits?: Partial<PlotJsonLimits>;
}

interface ReadPlotDocumentResult {
  readonly document: PlotDocument;
  readonly report: PlotJsonMigrationReport;
}

readPlotDocument(
  input: string | unknown,
  options?: ReadPlotDocumentOptions,
): ReadPlotDocumentResult

parsePlotDocument(
  input: string | unknown,
  options?: ReadPlotDocumentOptions,
): PlotDocument
```

`readPlotDocument()` is the evidence-bearing API. `parsePlotDocument()` is a compatibility wrapper that returns `result.document` only.

## 3. Reader pipeline

```text
string input
→ UTF-8 byte guard
→ JSON.parse

or

direct object input
→ descriptor-safe JSON clone

then

JSON-safe cloned root
→ type/schema envelope
→ deterministic document migration plan
→ execute every document step on frozen cloned JSON
→ clone and safety-scan every step output
→ require exact step target envelope
→ decode current 1.0.0 structure
→ record historical defaults and dropped fields
→ validate document-wide duplicate feature ids
→ resolve explicit Definition target by source plotType
→ deterministic Definition migration plan
→ execute every Definition step on frozen cloned feature JSON
→ clone and safety-scan every step output
→ require stable feature id and exact target type/version
→ decode migrated feature
→ deeply freeze document and report
```

No partial document or partial report is returned on failure.

## 4. Input boundary

### 4.1 Text

Text input is measured as UTF-8 bytes before `JSON.parse`. Oversized input fails with `PLOTJSON_RESOURCE_LIMIT_EXCEEDED`. Syntax errors become `PLOTJSON_SYNTAX_INVALID` with path `$` and the original `SyntaxError` as scalar cause.

### 4.2 Direct values

Direct values use the merged 008A descriptor-safe clone. The reader does not access properties before that clone completes. Getters are never invoked. Accessors, symbols, hidden properties, custom prototypes, sparse arrays, cycles, non-finite values and non-JSON object families reject.

Caller values are never retained as canonical document containers.

## 5. Document migration execution

`PlotJsonMigrationRegistry.planDocument(source, current)` supplies one exact ordered plan. Each trusted synchronous migration receives:

```ts
migrate(frozenClonedInput, {
  scope: "document",
  sourceVersion,
  targetVersion,
})
```

Required output rules:

- return a new object rather than the input object;
- return synchronously; a Promise is not JSON and rejects;
- return JSON-safe plain data;
- remain within the same caller-provided resource limits;
- preserve `type: "PlotLibreDocument"`;
- set `schemaVersion` to the exact step target.

Thrown errors, same-object returns, malformed envelopes, accessors, cycles, custom prototypes and resource violations become `PLOTJSON_MIGRATION_OUTPUT_INVALID` with source/target scalar context. Every successful step is appended to the report only after output validation succeeds.

## 6. Current 1.0.0 decoding

The decoder preserves the historical parser's compatibility behavior while making it observable.

```text
missing/non-string definitionVersion → "1.0.0"
missing/non-record parameters         → {}
missing/non-record style              → {}
missing/non-record feature metadata   → {}
missing/invalid revision              → 0
unknown root/feature fields           → dropped
```

Unknown fields are visited in sorted key order, making report ordering deterministic.

Normalization facts use:

```text
PLOTJSON_DEFINITION_VERSION_DEFAULTED
PLOTJSON_PARAMETERS_DEFAULTED
PLOTJSON_STYLE_DEFAULTED
PLOTJSON_FEATURE_METADATA_DEFAULTED
PLOTJSON_REVISION_DEFAULTED
PLOTJSON_UNKNOWN_FIELD_DROPPED
```

Warnings use:

```text
PLOTJSON_INVALID_RECORD_DEFAULTED
PLOTJSON_INVALID_REVISION_DEFAULTED
PLOTJSON_UNKNOWN_FIELD_DROPPED
```

The decoder also enforces:

- root id/name strings;
- root feature array and metadata object;
- feature id/plotType strings;
- control point arrays of exact numeric pairs;
- latitude in `[-90, 90]`;
- canonical Definition versions when present;
- non-negative safe-integer revision when retained;
- document-wide unique feature ids.

Duplicate ids fail with `PLOTJSON_FEATURE_ID_DUPLICATE` before any external state can be touched.

## 7. Definition target policy

Definition migration is opt-in through `definitionTargets`.

```ts
definitionTargets: {
  "arrow.legacy": {
    plotType: "arrow.current",
    definitionVersion: "2.0.0",
  },
}
```

The key is the source `plotType` after document-schema decoding. The value is the exact final Definition reference.

This explicit map has three purposes:

1. it separates history from the live `PlotRegistry` until 008D;
2. it supports audited plotType renames;
3. it avoids guessing aliases or nearest versions.

When the map is omitted, the reader preserves parser-only current-1.0 compatibility and performs no Definition migration or final Registry equality check. When the map is supplied, every source plotType must have an own-property target. Missing targets fail with `PLOTJSON_DEFINITION_NOT_FOUND`.

An exact source/target reference produces no migration and no feature-step record.

## 8. Definition migration execution

Each planned step receives a frozen cloned feature object and context:

```ts
{
  scope: "definition",
  sourceVersion,
  targetVersion,
  featureId,
  sourcePlotType,
  targetPlotType,
}
```

Each output must:

- be a new synchronous JSON object;
- pass descriptor-safe cloning and resource limits;
- retain the original feature id;
- match the step's exact target `plotType`;
- match the step's exact target `definitionVersion`.

After the final step, the feature is decoded again under current structural rules and must match the requested final reference. Violations become `PLOTJSON_DEFINITION_MIGRATION_OUTPUT_INVALID`.

The report retains explicit source, target and every applied Definition edge so type renames remain auditable.

## 9. Immutability

Successful results are detached from caller input and deeply frozen:

```text
ReadPlotDocumentResult
PlotDocument
features array
feature records
control point arrays
parameters/style/metadata trees
PlotJsonMigrationReport
all report arrays and nested records
```

Repeated reads of the same input are deeply equal but return distinct detached result objects.

## 10. Error behavior

Expected untrusted-input failures use `PlotJsonError`. Important stable codes include:

```text
PLOTJSON_SYNTAX_INVALID
PLOTJSON_VALUE_NOT_JSON
PLOTJSON_RESOURCE_LIMIT_EXCEEDED
PLOTJSON_ROOT_INVALID
PLOTJSON_DOCUMENT_TYPE_UNSUPPORTED
PLOTJSON_SCHEMA_VERSION_INVALID
PLOTJSON_SCHEMA_VERSION_UNSUPPORTED
PLOTJSON_MIGRATION_PATH_MISSING
PLOTJSON_MIGRATION_OUTPUT_INVALID
PLOTJSON_CURRENT_SCHEMA_INVALID
PLOTJSON_FEATURE_ID_DUPLICATE
PLOTJSON_DEFINITION_NOT_FOUND
PLOTJSON_DEFINITION_VERSION_INVALID
PLOTJSON_DEFINITION_VERSION_UNSUPPORTED
PLOTJSON_DEFINITION_MIGRATION_PATH_MISSING
PLOTJSON_DEFINITION_MIGRATION_OUTPUT_INVALID
```

Errors retain scalar context only: path, feature id, plot type, source/target version, limit and cause. They do not retain complete documents or business metadata.

## 11. Determinism and purity

The reader itself is deterministic for a fixed input, migration registry, target map and limits. Migration functions are trusted application code and must be deterministic by contract.

They must not read clock, random, network, DOM, MapLibre, Store or History. The runtime cannot sandbox JavaScript functions, but it freezes inputs, rejects asynchronous outputs, rescans returned values and records only validated successful steps.

## 12. Tests

Runtime tests cover:

- current text and direct-object reads;
- compatibility wrapper behavior;
- UTF-8 byte limits and syntax errors;
- getter-free direct input rejection;
- historical defaults and deterministic unknown-field reports;
- duplicate ids and structural errors;
- one-step and multi-step document execution;
- frozen migration inputs and unchanged caller inputs;
- thrown, same-object, Promise, accessor, non-JSON and resource-limit outputs;
- exact Definition targets with no migration;
- explicit plotType rename migration;
- missing targets and missing paths;
- Definition id/type/version output enforcement;
- cyclic/accessor Definition outputs;
- immutable reports and repeat-read determinism.

## 13. Explicit non-effects

008C does not:

```text
mutate PlotStore
change selection or Primary
clear or append CommandHistory
cancel interactions
touch MapLibre sources or layers
invoke PlotRegistry.generate
register a production migration
bump PlotJSON schema
change serializer output
add unresolved-feature behavior
support downgrade or future-version best effort
```

## 14. 008D boundary

008D will bind the pure reader to live Definitions and atomic application state:

```text
readPlotDocument
→ derive final Definition targets from PlotRegistry
→ require final Definition-version equality
→ canonicalize/generate every feature
→ validate complete ordered candidate document
→ one atomic Store replacement transaction
→ clear selection/History/interactions only after successful commit
```

Every expected 008D failure must preserve the old Store, order, selection, History and active interaction state.

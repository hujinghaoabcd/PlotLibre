# Milestone 008 — PlotJSON Versioning, Migration and Import Design

Status: frozen design proposal.  
Scope: document/version semantics, migration architecture, compatibility, validation and atomic import.  
Runtime changes: prohibited in this design branch.

## 1. Purpose

PlotLibre already persists semantic authored state rather than derived GeoJSON. The current implementation is intentionally small:

```text
JSON.parse
→ exact PlotLibreDocument / schemaVersion 1.0.0 check
→ basic field normalization
→ PlotFeature construction
→ Registry canonicalize/generate in PlotLibre.importDocument
→ clear Store
→ add features one by one
```

This is sufficient for the first public schema but not for long-lived documents, plugins or the planned groups/locks/visibility/z-order milestone.

Milestone 008 freezes a migration architecture before any new persisted editing state is added.

## 2. Current implementation inventory

### 2.1 Document model

```ts
interface PlotDocument {
  type: "PlotLibreDocument";
  schemaVersion: "1.0.0";
  id: string;
  name: string;
  features: readonly PlotFeature[];
  metadata: Readonly<Record<string, JsonValue>>;
}
```

### 2.2 Feature model

```ts
interface PlotFeature {
  id: string;
  plotType: string;
  definitionVersion: string;
  controlPoints: readonly Position[];
  parameters: Readonly<Record<string, JsonValue>>;
  style: PlotStyle;
  metadata: Readonly<Record<string, JsonValue>>;
  revision: number;
}
```

### 2.3 Actual `1.0.0` compatibility behavior

The existing parser is the historical behavior that current documents may rely on:

- document `type` and `schemaVersion` must be exact;
- document `id`, `name`, `features` and `metadata` are required;
- unknown document and feature fields are ignored and dropped;
- missing feature `definitionVersion` becomes `"1.0.0"`;
- missing or non-record `parameters`, `style` and feature `metadata` become `{}`;
- missing or non-integer `revision` becomes `0`;
- control points must be two-number arrays;
- coordinate finiteness, latitude range, point count and Definition rules are deferred to `PlotRegistry`;
- document feature-id uniqueness is not checked by `parsePlotDocument()`;
- registered Definition version equality is not enforced;
- no migration report is exposed.

Milestone 008 must document and test this behavior before tightening any rule. A parser update must not silently reinterpret the same `schemaVersion`.

### 2.4 Current import gap

`PlotLibre.importDocument()` preflights every feature through Registry generation, then clears the Store and adds features sequentially.

A duplicate feature id can therefore fail after the old Store has been cleared and after part of the new document has been added. Import is not yet one Store transaction.

This is a correctness defect to fix in the runtime milestone. The design contract is:

```text
no parse, migration, validation or commit failure may change Store,
selection, interaction state or History
```

## 3. Version domains

PlotLibre has two independent version domains.

### 3.1 Document schema version

`PlotDocument.schemaVersion` describes only document structure and document-level semantics:

- required and optional fields;
- feature container and ordering;
- groups and references;
- persisted lock/visibility/z-order state;
- extension containers;
- document-level invariants.

It does not identify a geometry algorithm.

### 3.2 Definition version

`PlotFeature.definitionVersion` describes only the semantics of one `plotType`:

- authored control roles;
- parameter names, types, defaults and units;
- style interpretation owned by the Definition;
- geometry-generation behavior where old authored data would otherwise change meaning.

It does not identify the document schema.

### 3.3 Independent migration order

Document migration runs before feature-definition migration:

```text
raw document schema
→ current document schema
→ each feature's current plotType / raw definitionVersion
→ current registered Definition version
```

A document migrator may move or rename structural fields. A Definition migrator may update only one feature's semantic authored data. Neither may assume the other's responsibility.

## 4. Version syntax and comparison

Persisted PlotJSON versions use canonical numeric triples only:

```text
MAJOR.MINOR.PATCH
```

Initial runtime excludes prerelease and build metadata in persisted versions.

Valid examples:

```text
1.0.0
1.1.0
2.0.3
```

Invalid examples:

```text
v1.0.0
1.0
01.0.0
1.0.0-beta.1
1.0.0+build
```

Each component must be a non-negative safe integer with no leading zero except `0`.

Comparison is numeric tuple comparison. String comparison is prohibited.

## 5. Schema compatibility rules

### 5.1 Patch

A patch version may clarify validation, fix a serializer defect or add migration metadata only when every document valid under the earlier patch remains semantically equivalent after migration.

### 5.2 Minor

A minor version may add optional/defaultable document structure, explicit extension containers or new persisted editing state with a deterministic migration from the previous supported version.

### 5.3 Major

A major version is required when document meaning cannot be preserved by a deterministic automatic migration, or when previously valid authored information must be discarded or reinterpreted.

### 5.4 Reader behavior

- exact current version: decode directly;
- older supported version: migrate through a complete registered chain;
- older version with missing chain: reject;
- newer version: reject by default;
- malformed version: reject;
- document type other than `PlotLibreDocument`: reject.

There is no best-effort future-version mode in the initial runtime.

## 6. Migration ownership

### 6.1 Separate migration registry

Migration code is not added to `PlotDefinition.generate()` and does not use the earlier proposed single `PlotDefinition.migrate(feature, fromVersion)` hook.

A separate engine-independent registry owns historical transformations:

```ts
interface PlotJsonDocumentMigration {
  readonly fromVersion: PlotJsonVersion;
  readonly toVersion: PlotJsonVersion;
  migrate(
    input: ReadonlyJsonObject,
    context: PlotJsonMigrationContext,
  ): ReadonlyJsonObject;
}

interface PlotJsonDefinitionMigration {
  readonly plotType: string;
  readonly fromVersion: PlotJsonVersion;
  readonly toVersion: PlotJsonVersion;
  migrate(
    input: ReadonlyJsonObject,
    context: PlotJsonMigrationContext,
  ): ReadonlyJsonObject;
}

class PlotJsonMigrationRegistry {
  registerDocument(migration: PlotJsonDocumentMigration): this;
  registerDefinition(migration: PlotJsonDefinitionMigration): this;
  planDocument(from: string, to: string): readonly PlotJsonMigrationStep[];
  planDefinition(
    plotType: string,
    from: string,
    to: string,
  ): readonly PlotJsonMigrationStep[];
}
```

Names may be refined during runtime implementation, but responsibilities and separation are binding.

### 6.2 Registration constraints

For one scope and source version:

- only one outgoing migration is allowed;
- `toVersion` must be greater than `fromVersion`;
- self edges are rejected;
- cycles are rejected;
- duplicate edges are rejected;
- registration order cannot change the planned chain;
- migration functions are synchronous and pure in the initial runtime.

The initial planner does not choose among branches, weights or shortest paths. Ambiguous graphs are prohibited rather than resolved heuristically.

### 6.3 Definition migration and aliases

A `plotType` rename is a migration, not a Registry alias lookup side effect.

A Definition migration may explicitly rewrite both:

```text
plotType
definitionVersion
```

The report must record the rename. `PlotRegistry.get()` continues to require the final registered stable `plotType`.

Unknown plot types fail closed. An unresolved-preservation mode is deferred.

## 7. Purity and determinism

Every migration step must:

- return a new JSON object;
- never mutate caller input;
- never read clock, random state, network, DOM, MapLibre or Store;
- never depend on object identity;
- produce the same output and report for the same input and registry;
- preserve all information not explicitly transformed by that migration;
- emit no Store, History or selection event;
- throw a structured error rather than returning partial output.

Migration output is deep-cloned JSON data. Functions, symbols, BigInt, undefined, accessors, prototypes and cyclic values are prohibited.

## 8. Read and import pipeline

The binding pipeline is:

```text
input string / unknown
→ input-size guard when string
→ JSON syntax parse when string
→ recursive JSON-safety and resource-limit scan
→ minimal envelope decode (type + schemaVersion)
→ schema-version parse
→ complete document migration plan
→ execute document migrations in memory
→ strict current-schema decode / legacy normalization
→ document invariants
→ resolve every registered current Definition target
→ complete feature-definition migration plans
→ execute every feature migration in memory
→ strict current feature decode
→ enforce final Definition version equality
→ canonicalize and Registry.generate every feature
→ build immutable migration report
→ one atomic Store replacement transaction
→ reset selection/interactions/History after successful commit
```

No step after the first mutation may fail under expected input errors. All expected failures must occur before Store commit.

## 9. Parse and import API boundary

The public compatibility function remains:

```ts
parsePlotDocument(value, options?): PlotDocument
```

It returns a current canonical document or throws. Existing call sites do not need to consume a report.

A report-bearing API is added:

```ts
interface ReadPlotDocumentResult {
  readonly document: PlotDocument;
  readonly report: PlotJsonMigrationReport;
}

readPlotDocument(
  value: string | unknown,
  options?: ReadPlotDocumentOptions,
): ReadPlotDocumentResult;
```

A Registry-aware preparation API may be added in core:

```ts
preparePlotDocumentImport(
  value: string | unknown,
  registry: PlotRegistry,
  options?: PreparePlotDocumentImportOptions,
): PreparedPlotDocumentImport;
```

`PlotLibre.importDocument()` delegates to this preparation and then performs one Store transaction. MapLibre must not implement migration logic.

## 10. Migration report

A successful read produces an immutable report:

```ts
interface PlotJsonMigrationReport {
  readonly sourceSchemaVersion: string;
  readonly targetSchemaVersion: string;
  readonly documentSteps: readonly PlotJsonAppliedStep[];
  readonly featureSteps: readonly PlotJsonFeatureMigrationRecord[];
  readonly normalizations: readonly PlotJsonNormalizationRecord[];
  readonly warnings: readonly PlotJsonWarning[];
}
```

The report records facts, not arbitrary logging strings:

- step scope;
- source and target version;
- feature id and plot type when applicable;
- explicit plotType rename;
- historical `1.0.0` default applied;
- unknown field dropped under the historical compatibility policy;
- warning code and JSON path.

The report never contains the complete document or sensitive metadata by default.

## 11. Historical `1.0.0` normalization

The current schema remains `1.0.0` during the migration-foundation runtime milestone.

The runtime must preserve known accepted behavior for same-version documents while making it visible in the report:

| Input condition | `1.0.0` normalized value | Report |
|---|---|---|
| missing `definitionVersion` | `"1.0.0"` | normalization |
| missing/non-record `parameters` | `{}` | normalization/warning |
| missing/non-record `style` | `{}` | normalization/warning |
| missing/non-record feature `metadata` | `{}` | normalization/warning |
| missing/non-integer `revision` | `0` | normalization/warning |
| unknown schema-owned field | dropped | normalization/warning |

This compatibility behavior is limited to `1.0.0`. A future stricter schema must use a new version and explicit migration.

Known fields that contain non-JSON values, cycles or resource-limit violations always reject.

## 12. Current-schema invariants

Before Registry preflight, a current document must satisfy:

- root type and target schemaVersion are exact;
- document id and name are strings;
- document metadata is JSON-safe;
- features is an array within configured limits;
- every feature id and plotType is a string;
- feature ids are unique across the document;
- every control point is exactly two finite numbers;
- latitude is in `[-90,90]`;
- parameters, style and metadata are JSON-safe;
- revision is a non-negative safe integer after normalization;
- final definitionVersion is valid and equals the registered target Definition version;
- every feature canonicalizes and generates successfully;
- final feature order equals document array order.

A duplicate id rejects before Store mutation with its first and duplicate JSON paths.

## 13. Unknown data policy

### 13.1 Unknown document version

Reject with the source version and supported target version. Do not guess the nearest version.

### 13.2 Unknown Definition

Reject. Do not relabel, infer from geometry or import as another parametric symbol.

### 13.3 Unknown structural fields

For historical `1.0.0`, preserve current behavior by dropping them and recording a normalization warning.

Future schemas should reserve an explicit JSON-safe `extensions` object and reject unknown schema-owned fields. Extension keys should be reverse-domain or URI-like application namespaces.

### 13.4 Unknown metadata

Metadata keys are application data and are preserved when values are valid JSON and within limits. Migration code must not reinterpret metadata without an explicit documented step.

## 14. Error model

Add a `PlotJsonError` family derived from `PlotLibreError`. Errors expose:

```ts
code
message
path?
featureId?
plotType?
sourceVersion?
targetVersion?
cause?
```

Binding stable codes:

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
PLOTJSON_REFERENCE_INVALID
PLOTJSON_IMPORT_TRANSACTION_INVALID
```

Existing `InvalidPlotFeatureError` remains for current semantic feature validation. PlotJSON errors may wrap it with JSON path and feature identity.

## 15. Resource limits

Reading untrusted documents must support limits for:

```ts
interface PlotJsonLimits {
  readonly inputBytes: number;
  readonly depth: number;
  readonly totalNodes: number;
  readonly objectKeys: number;
  readonly stringLength: number;
  readonly features: number;
  readonly controlPointsPerFeature: number;
  readonly totalControlPoints: number;
}
```

The runtime PR must publish and test concrete defaults. This design does not invent performance guarantees without measurements.

Rules:

- limits are finite positive safe integers;
- violation reports the limit name and JSON path;
- limits apply to string and direct-object input;
- migration output is scanned again;
- applications may tighten but not disable mandatory finite defaults through invalid values.

## 16. Atomic import contract

A prepared document commit replaces the Store in one `PlotStore.applyTransaction()` call:

```text
remove = all current ids
add = all prepared features
orderedIds = prepared feature ids in document order
```

Because add/remove id sets overlap when replacing a document with stable ids, runtime may add a dedicated `replaceDocument()` transaction primitive or stage a complete Map replacement. It must still emit exactly one Store batch event.

Required commit effects after success:

- Store contains exactly the prepared features in document order;
- one Store batch event;
- active draw/region/translation/transform state is cancelled;
- selection becomes empty;
- History becomes empty;
- renderer regenerates from the committed Store;
- returned document equals the committed canonical document.

On failure, all prior Store features, order, selection, History and active interaction state remain unchanged.

## 17. Definition-version enforcement

After feature migration:

```text
feature.definitionVersion === registry.get(feature.plotType).version
```

is mandatory.

Cases:

- equal: continue;
- older with complete migration chain: migrate;
- older without chain: reject;
- newer: reject;
- malformed: reject;
- unknown plotType: reject.

Registry generation cannot silently render an authored feature under a different Definition version.

## 18. Future `1.1.0` persistence boundary for 007D

Milestone 008 runtime establishes migration infrastructure while keeping current schema `1.0.0`. Milestone 007D may then introduce a real document migration to `1.1.0`.

The future persistence boundary is frozen at a conceptual level:

- feature array order remains bottom-to-top z-order;
- lock and visibility are core persisted editing state, not metadata;
- groups have stable document-level ids;
- one feature belongs to at most one group in the first group schema;
- group membership references feature ids and is validated before commit;
- group-level lock/visibility combines deterministically with feature-level state;
- group runtime cannot precede a production `1.0.0 → 1.1.0` migration and golden fixtures.

The exact `1.1.0` JSON shape is frozen in the later 007D design, not invented by the migration-foundation runtime.

## 19. Golden fixtures and compatibility matrix

Runtime implementation requires fixture directories such as:

```text
tests/fixtures/plotjson/current/
tests/fixtures/plotjson/legacy/
tests/fixtures/plotjson/invalid/
tests/fixtures/plotjson/future/
```

Required cases:

- exact current round trip;
- current historical-default normalization;
- unknown fields under `1.0.0` compatibility;
- malformed JSON;
- non-JSON direct object;
- malformed/older/future schema versions;
- complete and missing document chains;
- complete and missing Definition chains;
- plotType rename migration;
- duplicate feature ids;
- unknown Definition;
- stale/newer definitionVersion;
- migration throw;
- mutation-attempt fixture proving input remains unchanged;
- nondeterministic migration detector;
- migration output schema failure;
- limits at boundary and over boundary;
- Registry generation failure;
- atomic import failure preserving the old Store;
- exact order after successful import;
- empty and large documents.

Compatibility matrix columns:

```text
source schema
source definition version
reader target
migration chain
expected result
report codes
Store mutation count
```

## 20. Runtime milestones

### 008A — Core version and JSON safety primitives

- version parser/comparator;
- JSON-safe deep clone/scan;
- resource limits;
- PlotJsonError family;
- current-version constants.

### 008B — Migration registry and report

- document and Definition migration registration;
- deterministic chain planning;
- cycle/ambiguity rejection;
- immutable report;
- test-only migration fixtures.

### 008C — Current parser compatibility and strict invariants

- `readPlotDocument()`;
- `parsePlotDocument()` compatibility wrapper;
- historical `1.0.0` normalizations with reports;
- duplicate-id and version enforcement;
- current-schema fixtures.

### 008D — Registry-aware preparation and atomic import

- complete feature migration/preflight;
- one Store document-replacement transaction;
- exact rollback/no-mutation tests;
- MapLibre facade integration;
- Chromium import regression.

### 008E — Documentation and immutable handover

- update PlotJSON spec and architecture;
- publish compatibility matrix;
- exact-head CI;
- zero review threads;
- post-merge synchronization.

Only after 008D/E may 007D introduce production schema `1.1.0` and persisted groups/locks/visibility/z-order.

## 21. Non-goals

- no runtime code in this design branch;
- no current schema-version bump;
- no groups/locks/visibility/z-order runtime;
- no unresolved-feature preservation mode;
- no future-version best effort;
- no downgrade/export-to-old-version pipeline;
- no asynchronous/network migration;
- no geometry inference from GeoJSON;
- no JSON signing or canonical cryptographic serialization;
- no collaborative version vector;
- no derived geometry cache persistence;
- no arbitrary migration graph branches.

## 22. Acceptance for this design PR

- repository implementation inventory is accurate;
- schema and Definition version responsibilities are separate;
- current `1.0.0` compatibility behavior is explicit;
- deterministic migration registry contract is frozen;
- validation/import ordering is frozen;
- stable errors, report and resource-limit surfaces are listed;
- duplicate-id partial-import risk is documented;
- all-or-nothing Store replacement is mandatory;
- 007D persistence boundary and unblock conditions are explicit;
- runtime phases and fixture matrix are actionable;
- only Markdown files change;
- full historical CI remains green.

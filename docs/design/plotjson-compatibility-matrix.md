# PlotJSON Compatibility Matrix

Status: Milestone 008 design authority.  
Current target schema: `1.0.0`.  
Production migrations currently registered: none.

## 1. Matrix semantics

Result values:

```text
ACCEPT       decode current canonical document
NORMALIZE    accept historical current-version behavior and report changes
MIGRATE      execute complete deterministic chain, then accept
REJECT       structured failure before application-state mutation
```

Every row assumes resource limits are satisfied unless the row explicitly tests limits.

## 2. Document schema matrix

| Source document | Reader target | Chain | Result | Stable outcome |
|---|---|---|---|---|
| type `PlotLibreDocument`, schema `1.0.0` | `1.0.0` | none | ACCEPT/NORMALIZE | decode under historical 1.0 rules |
| schema older than current | current | complete linear chain | MIGRATE | report every document step |
| schema older than current | current | missing step | REJECT | `PLOTJSON_MIGRATION_PATH_MISSING` |
| schema newer than current | current | irrelevant | REJECT | `PLOTJSON_SCHEMA_VERSION_UNSUPPORTED` |
| malformed version | current | irrelevant | REJECT | `PLOTJSON_SCHEMA_VERSION_INVALID` |
| wrong document type | current | irrelevant | REJECT | `PLOTJSON_DOCUMENT_TYPE_UNSUPPORTED` |
| non-object root | current | irrelevant | REJECT | `PLOTJSON_ROOT_INVALID` |
| malformed JSON string | current | irrelevant | REJECT | `PLOTJSON_SYNTAX_INVALID` |

## 3. Current `1.0.0` normalization matrix

| Input | Canonical output | Report requirement |
|---|---|---|
| missing feature `definitionVersion` | `"1.0.0"` | normalization path and code |
| missing `parameters` | `{}` | normalization |
| non-record `parameters` | `{}` | normalization warning |
| missing `style` | `{}` | normalization |
| non-record `style` | `{}` | normalization warning |
| missing feature `metadata` | `{}` | normalization |
| non-record feature `metadata` | `{}` | normalization warning |
| missing `revision` | `0` | normalization |
| non-integer `revision` | `0` | normalization warning |
| unknown document field | dropped | warning with path |
| unknown feature field | dropped | warning with path |
| document metadata unknown key | preserved | no structural warning |
| feature metadata unknown key | preserved | no structural warning |

Same-version normalization cannot invent control points, change ids, infer plotType or reinterpret metadata.

## 4. Definition matrix

| Feature state | Registered target | Chain | Result | Stable outcome |
|---|---|---|---|---|
| known plotType, equal definitionVersion | same version | none | ACCEPT | Registry preflight |
| known plotType, older definitionVersion | newer version | complete chain | MIGRATE | final version equality |
| known plotType, older definitionVersion | newer version | missing chain | REJECT | `PLOTJSON_DEFINITION_MIGRATION_PATH_MISSING` |
| known plotType, newer definitionVersion | older reader | none | REJECT | `PLOTJSON_DEFINITION_VERSION_UNSUPPORTED` |
| malformed definitionVersion | any | none | REJECT | `PLOTJSON_DEFINITION_VERSION_INVALID` |
| unknown plotType | absent | none | REJECT | `PLOTJSON_DEFINITION_NOT_FOUND` |
| explicit plotType rename step | new type present | complete chain | MIGRATE | report old/new type |
| Registry canonicalization failure | current | complete | REJECT | wrapped current-schema/feature error |
| Registry generation failure | current | complete | REJECT | complete document rejected |

## 5. Document invariants

| Condition | Result | Required behavior |
|---|---|---|
| duplicate feature id | REJECT | identify first and duplicate paths |
| empty features array | ACCEPT | exact empty document |
| order changes only through document migration | MIGRATE | final feature array order authoritative |
| non-finite coordinate from direct object | REJECT | `PLOTJSON_VALUE_NOT_JSON` or current-schema error |
| latitude outside `[-90,90]` | REJECT | before Store commit |
| negative or unsafe revision | REJECT after normalization policy | stable JSON path |
| parameters contain function/cycle | REJECT | no partial clone or report |
| one feature invalid among many | REJECT | no prepared partial document |

## 6. Migration graph matrix

| Registration graph | Result |
|---|---|
| one strictly increasing outgoing edge per source | ACCEPT |
| duplicate edge | REJECT registration |
| two outgoing edges from same source | REJECT registration |
| self edge | REJECT registration |
| decreasing edge | REJECT registration |
| cycle | REJECT registration |
| chain overshoots requested target | REJECT planning |
| registration order changed | same plan |

## 7. Migration function matrix

| Migrator behavior | Result |
|---|---|
| returns new valid JSON object with exact target version | ACCEPT step |
| mutates input | REJECT in contract tests |
| returns same object identity | REJECT step |
| throws | wrap and REJECT |
| returns array/primitive | REJECT |
| returns non-JSON/cyclic value | REJECT |
| returns wrong type | REJECT |
| returns wrong version | REJECT |
| exceeds resource limit | REJECT |
| uses random/time and changes output | determinism test REJECT |

## 8. Atomic import matrix

| Preparation/commit state | Old Store | Events | Selection/History |
|---|---|---|---|
| syntax failure | unchanged | 0 | unchanged |
| schema migration failure | unchanged | 0 | unchanged |
| duplicate id | unchanged | 0 | unchanged |
| missing Definition migration | unchanged | 0 | unchanged |
| Registry failure | unchanged | 0 | unchanged |
| Store staging failure | unchanged | 0 | unchanged |
| successful replacement | exactly new document | 1 batch | selection empty, History empty |
| post-commit listener throws | committed | later listeners still run | cleanup proceeds |

The existing `clear()` plus repeated `add()` sequence does not satisfy this matrix and must be replaced in Milestone 008 runtime.

## 9. Resource-limit matrix

Each configured limit requires three fixtures:

```text
below boundary → ACCEPT
exact boundary → ACCEPT
one over boundary → REJECT
```

Limits:

```text
inputBytes
depth
totalNodes
objectKeys
stringLength
features
controlPointsPerFeature
totalControlPoints
```

Migration output is tested against the same limits after every step.

## 10. Idempotence and round trip

| Operation | Required result |
|---|---|
| read current canonical document twice | deep-equal document, empty migration steps |
| migrate legacy then read migrated result | deep-equal document |
| serialize → parse current canonical | deep-equal semantic document |
| run same migration twice on cloned source | deep-equal output/report |
| metadata key insertion order differs | same semantics and error ordering rules |

## 11. Future `1.1.0` / 007D boundary

When 007D freezes a production schema shape, matrix additions are mandatory for:

- `1.0.0 → 1.1.0` document migration;
- default unlocked/visible state;
- stable group ids;
- duplicate/missing group references;
- feature membership uniqueness;
- feature array bottom-to-top z-order preservation;
- effective feature/group lock and visibility rules;
- current `1.1.0` round trip;
- old reader rejecting `1.1.0` rather than dropping core state.

No 007D runtime may merge without those rows and golden fixtures.

# PlotJSON 1.0 规范与版本策略

状态：

```text
current persisted schema: 1.0.0
current parser: exact-version historical parser
008A runtime: version / errors / JSON safety / resource limits merged
008B runtime: migration registry / deterministic planner / report records merged
008B squash/main: 409786f6a55aeab6e810651410954d78123e32d3
production migrations: none
reader migration execution: not yet connected
next runtime: 008C safe reader and migration execution
future schema bump: deferred until a production persisted-state change
```

权威文档：

```text
docs/design/plotjson-migrations.md
docs/design/plotjson-compatibility-matrix.md
docs/design/plotjson-version-json-safety-runtime.md
docs/design/plotjson-migration-registry-runtime.md
docs/algorithms/plotjson-migration-pipeline.md
```

## 1. 目的

GeoJSON 能表达最终几何，但不能完整表达参数化态势标绘对象的控制点语义、生成算法版本和可编辑参数。

PlotJSON 是 PlotLibre 的语义文档格式。它保存足够的信息，使对象能够：

- 在不同时间重新编辑；
- 重新生成派生几何；
- 使用显式迁移升级；
- 在其他地图引擎中渲染；
- 保持业务属性和文档顺序；
- 在未来安全增加分组、锁定、可见性和层级顺序。

PlotJSON 不把派生 Polygon、LineString、采样点、选择轮廓、变换框、命中区域、handles、guides 或 preview 作为 canonical authored state。

## 2. 当前文档结构

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

| 字段 | 必需 | 含义 |
|---|---:|---|
| `type` | 是 | 固定为 `PlotLibreDocument` |
| `schemaVersion` | 是 | 当前固定为 `1.0.0` |
| `id` | 是 | 文档稳定标识符 |
| `name` | 是 | 文档显示名称 |
| `features` | 是 | 参数化标绘对象数组；当前数组顺序就是文档顺序 |
| `metadata` | 是 | 文档级 JSON 属性，不控制核心运行时行为 |

`metadata.schema` 等信息性字段不是版本权威；读取器只认根级 `schemaVersion`。

## 3. PlotFeature

```json
{
  "id": "main-direction",
  "plotType": "arrow.straight",
  "definitionVersion": "1.0.0",
  "controlPoints": [
    [118.78, 32.04],
    [118.86, 32.1]
  ],
  "parameters": {},
  "style": {},
  "metadata": {},
  "revision": 0
}
```

### 3.1 `id`

文档内必须唯一。重复 ID 必须在 Store 发生任何变化前拒绝。当前 parser 尚未执行文档级重复检查；008C 必须补齐，008D 必须证明失败不修改 Store。

### 3.2 `plotType`

注册 Definition 的稳定名称。公开后不能通过 Registry 静默别名改写。重命名必须是显式 Definition migration，并进入 migration report。

### 3.3 `definitionVersion`

Definition 版本与文档 `schemaVersion` 相互独立。它表示 authored control 角色、参数名称/类型/默认值/单位和会改变旧 authored data 含义的 Definition 语义。

未来读取完成后必须满足：

```text
feature.definitionVersion === registry.get(feature.plotType).version
```

当前 Registry 还未在通用生成路径强制该等式。008C/008D 必须在 Store mutation 前完成迁移或拒绝。

### 3.4 `controlPoints`

WGS84 `[longitude, latitude]` 数组。坐标必须有限、纬度位于 `[-90,90]`，控制点顺序和角色由 Definition 规定。禁止保存派生 Polygon 顶点代替 authored controls。

### 3.5 `parameters`

可序列化算法参数。Definition 必须提供默认值、类型/范围验证、单位说明和不兼容变化的显式 migration。

### 3.6 `style`

样式是 authored state；MapLibre 图层表达是派生结果。当前核心字段包括填充、线、点和文字颜色、透明度、宽度、半径、字号和虚线配置。

### 3.7 `metadata`

业务 JSON 属性，不参与核心几何、迁移路径选择、锁定、可见性或 z-order。未来核心持久化状态必须使用 schema-owned 字段。

### 3.8 `revision`

对象本地修订号。它不是 schema version、Definition version 或协作版本向量。最终值必须是非负安全整数。

## 4. 两类版本的职责

### 4.1 `schemaVersion`

负责根结构、文档字段、feature container、顺序、引用、未来 groups/locks/visibility/z-order 和 extension container。

### 4.2 `definitionVersion`

负责一个 `plotType` 的控制点角色、参数语义和 authored Definition behavior。

### 4.3 必须采用的顺序

```text
input byte guard / direct-object boundary
→ JSON syntax parse when string
→ JSON safety and resource scan
→ minimal type/schemaVersion envelope
→ document migration plan and execution
→ current document decode
→ document invariants
→ Definition migration for every feature
→ final Definition-version equality
→ Registry canonicalize/generate every feature
→ immutable report
→ atomic Store replacement
```

禁止先按当前结构解释旧文档，再猜测迁移。

## 5. 持久化版本语法

公共常量：

```text
PLOTJSON_DOCUMENT_TYPE = PlotLibreDocument
CURRENT_PLOTJSON_SCHEMA_VERSION = 1.0.0
```

版本只能是 canonical numeric triple：

```text
MAJOR.MINOR.PATCH
```

每个组件必须是非负安全整数。禁止前缀、缺少组件、前导零、prerelease、build metadata、指数或非安全整数。

比较必须使用数值 tuple，不能使用字符串字典序。

008A 已提供：

```ts
parsePlotJsonVersion(...)
comparePlotJsonVersions(...)
isCanonicalPlotJsonVersion(...)
```

## 6. 当前 `1.0.0` 实际兼容行为

现有 parser 的真实行为属于兼容基线：

| 条件 | 当前结果 |
|---|---|
| `type` 或 `schemaVersion` 不精确匹配 | 拒绝 |
| 缺少文档 id/name/features/metadata | 拒绝 |
| 未知根或 feature 字段 | 忽略并丢弃 |
| 缺少 `definitionVersion` | 使用 `1.0.0` |
| 缺少或非对象 parameters/style/feature metadata | 使用 `{}` |
| 缺少或非整数 revision | 使用 `0` |
| control point 不是两个 number | 拒绝 |

008A/008B 没有接入 parser，因此没有静默改变这些输入的解释。

008C 的 report-bearing API 必须保留兼容结果，并记录默认值、无效 record 默认化和未知字段丢弃。

非 JSON 值、循环引用、非有限数值和资源限制违规不属于兼容承诺，必须拒绝。

## 7. JSON 安全边界

直接对象输入只接受：

```text
null
string
boolean
finite number
dense array
plain object
null-prototype object
```

拒绝：

```text
undefined
NaN / Infinity
BigInt / Symbol / function
Date / Map / Set / RegExp / typed array / class instance
custom prototype
accessor
non-enumerable property
symbol key
sparse/custom array
cycle
```

008A 实现要求：

- 迭代遍历，不依赖 JavaScript 调用栈；
- descriptor 检查，不调用 getter；
- 对象 key 按字典序访问，错误路径确定；
- 重复但无环的引用复制成独立 JSON tree；
- `__proto__`、`constructor`、`prototype` 保持安全 data property；
- 不修改调用方输入；
- clone 与输入不共享 nested containers。

## 8. 资源限制

当前默认有限上限：

```text
UTF-8 input bytes:       16 MiB
maximum depth:           128
value nodes:             1,000,000
object keys:             250,000
string/key length:       1,000,000 UTF-16 code units
features:                100,000
controls per feature:    10,000
total authored controls: 1,000,000
```

这些是处理不可信输入的安全 ceiling，不是推荐文档规模、内存保证或延迟 SLA。覆盖值必须是有限正安全整数，字符串限制同时作用于 value 和 object key。

## 9. Merged 008B migration registry

008B 已增加独立于 `PlotDefinition` 和 `PlotRegistry` 的历史图。

### 9.1 Document edge

```ts
interface PlotJsonDocumentMigration {
  fromVersion: string;
  toVersion: string;
  migrate: PlotJsonMigrationFunction;
}
```

节点是 document schema version。

### 9.2 Definition edge

```ts
interface PlotJsonDefinitionReference {
  plotType: string;
  definitionVersion: string;
}

interface PlotJsonDefinitionMigration {
  from: PlotJsonDefinitionReference;
  to: PlotJsonDefinitionReference;
  migrate: PlotJsonMigrationFunction;
}
```

节点是 `(plotType, definitionVersion)`。

显式 rename：

```text
arrow.legacy@1.0.0
→ arrow.bridge@1.1.0
→ arrow.current@2.0.0
```

### 9.3 注册约束

- descriptor 必须包含 function；
- 版本必须 canonical；
- target version 严格大于 source version；
- Definition plotType 非空；
- descriptor/reference 复制并冻结；
- 每个 source node 最多一条 outgoing edge；
- exact duplicate 和 branch 都拒绝；
- invalid insertion 回滚；
- registration order 不能影响 valid plan；
- graph 不允许 cycle 或 branch ambiguity。

Developer configuration errors：

```text
PLOTJSON_MIGRATION_REGISTRATION_INVALID
PLOTJSON_MIGRATION_SOURCE_DUPLICATE
PLOTJSON_MIGRATION_GRAPH_CYCLE
```

### 9.4 规划约束

```ts
registry.planDocument(source, target)
registry.planDefinition(sourceReference, targetReference)
```

Planner：

- 首先验证 source/target；
- exact equality 返回共享 frozen empty plan；
- downgrade 拒绝；
- 只沿唯一 outgoing edge；
- missing edge 和 overshoot 拒绝；
- Definition 必须到达 exact version + exact plotType；
- 返回 frozen ordered plan；
- 不执行 migration function；
- 不选择 shortest、nearest 或 best-effort path。

008B exact-head evidence：

```text
validated head: c86bcc02d2b85bb1495d8a3e659d2e3d5ff18335
CI:             30957964547 / #541
Node:           348 passed
Chromium:       34 passed
squash/main:    409786f6a55aeab6e810651410954d78123e32d3
```

## 10. Migration function purity

Migration 是应用安装的 trusted synchronous code。文档不能指定模块或可执行代码。

008B 只保存 function reference，不执行。

008C 执行时必须：

- 输入为安全 clone；
- 不修改旧输入；
- 返回新的 JSON object；
- 不读取 clock、random、network、DOM、MapLibre、Store、History；
- 每一步输出重新扫描；
- 输出和报告确定；
- 失败时不泄漏 partial result。

## 11. Migration report

008B 已定义不可变记录：

```text
source schema version
target schema version
document applied steps
per-feature Definition records
explicit plotType rename facts
1.0.0 normalization facts
warnings with stable code and JSON path
```

`createPlotJsonMigrationReport()` 复制并深度冻结结构，不保留完整文档、业务 metadata 或 migration function。

Normalization codes：

```text
PLOTJSON_DEFINITION_VERSION_DEFAULTED
PLOTJSON_PARAMETERS_DEFAULTED
PLOTJSON_STYLE_DEFAULTED
PLOTJSON_FEATURE_METADATA_DEFAULTED
PLOTJSON_REVISION_DEFAULTED
PLOTJSON_UNKNOWN_FIELD_DROPPED
```

Warning codes：

```text
PLOTJSON_INVALID_RECORD_DEFAULTED
PLOTJSON_INVALID_REVISION_DEFAULTED
PLOTJSON_UNKNOWN_FIELD_DROPPED
```

008C 将从实际 successful read/execution 生成这些记录。

## 12. 008C reader contract

008C 是下一个 runtime slice。它只负责纯读取和迁移执行，不修改 Store 或 MapLibre。

必须实现：

```text
string byte guard or direct-object safe clone
→ syntax parse
→ JSON safety/resource scan
→ minimal envelope
→ document plan + execution
→ output scan after every step
→ current 1.0.0 decode + compatibility report facts
→ duplicate ids and document invariants
→ Definition plan + execution
→ final Definition-version equality
→ immutable document/report result
```

Public API 目标：

```ts
readPlotDocument(...): ReadPlotDocumentResult
parsePlotDocument(...): PlotDocument
```

`parsePlotDocument()` 是兼容 wrapper；报告由 `readPlotDocument()` 提供。

## 13. 结构化错误

`PlotJsonError` 可携带 scalar context：

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

不能保留或打印完整文档或 metadata。

稳定代码包括 syntax、non-JSON、resource、root/type/version、migration path/output、current schema、duplicate id、Definition lookup/version/migration、reference 和 import transaction 错误。

## 14. 原子导入

当前 `PlotLibre.importDocument()` 在 Registry preflight 后执行：

```text
store.clear()
→ store.add(feature) repeatedly
```

这不能满足重复 ID 等中途失败下的原子性。

008D 必须替换为：

```text
prepare complete canonical document in memory
→ stage complete Store replacement
→ validate ids and exact order
→ one Store commit / one batch event
→ clear selection and History only after success
```

失败时必须保持旧 Store/order、selection/Primary、History 和 active interaction state。

## 15. Golden fixtures

008C/008D 至少需要：

```text
current exact round trip
historical 1.0.0 defaults
unknown fields normalization
malformed JSON / non-JSON direct object
old/current/future versions
complete/missing document chain
complete/missing Definition chain
explicit plotType rename
unknown Definition
duplicate feature ids
resource-limit boundaries
invalid migration output
Registry generation failure
atomic import rollback
exact document order after success
repeat-read idempotence
```

所有 migration 必须证明确定性和不修改输入。

## 16. Runtime 分阶段

```text
008A version / errors / JSON safety / limits — merged
008B migration registry / planner / report records — merged
008C report-bearing reader / execution / 1.0 compatibility / invariants — next
008D Registry-aware preparation / atomic Store and MapLibre import
008E fixtures / public docs / finalization
```

008C 明确不包含 Store 和 MapLibre mutation。008D 之前不得把读取成功等同于导入提交。

## 17. 与 007D 的关系

Groups、locks、visibility 和 z-order 是核心持久状态，不能存入 metadata 或只存在于 UI。

007D 必须等 008D/E 完成，并使用真实 production schema migration、引用验证、golden fixtures 和原子 import。

## 18. 非目标

```text
downgrade migration
future-version best effort
arbitrary migration DAG
async/network migration
unresolved feature preservation
canonical signed JSON
collaboration version vectors
derived geometry cache
schema 1.1 production shape before 007D design
```

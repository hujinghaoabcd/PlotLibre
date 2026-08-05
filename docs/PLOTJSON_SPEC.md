# PlotJSON 1.0 规范与版本策略

状态：

```text
current persisted schema: 1.0.0
public reader: readPlotDocument()
compatibility wrapper: parsePlotDocument()
008A runtime: version / errors / JSON safety / resource limits merged
008B runtime: migration registry / deterministic planner / report records merged
008C runtime: safe reader / migration execution / compatibility report merged
008C squash/main: 9d5b8dc23ad0e5b4ae6be3d1d1656f6d84f6adbe
production migrations: none
atomic Store/MapLibre import: not yet connected
next runtime: 008D Registry-aware atomic import
future schema bump: deferred until a production persisted-state change
```

权威文档：

```text
docs/design/plotjson-migrations.md
docs/design/plotjson-compatibility-matrix.md
docs/design/plotjson-version-json-safety-runtime.md
docs/design/plotjson-migration-registry-runtime.md
docs/design/plotjson-reader-runtime.md
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
| `features` | 是 | 参数化标绘对象数组；数组顺序即当前文档顺序 |
| `metadata` | 是 | 文档级 JSON 属性，不控制核心运行时行为 |

`metadata.schema` 等信息性字段不是版本权威；读取器只认根级 `schemaVersion`。

## 3. PlotFeature

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

### 3.1 `id`

文档内必须唯一。008C 已在纯读取阶段执行文档级重复检查，并以 `PLOTJSON_FEATURE_ID_DUPLICATE` 拒绝。008D 仍必须证明该失败不会修改 Store 或其他应用状态。

### 3.2 `plotType`

注册 Definition 的稳定名称。公开后不能通过 Registry 静默别名改写。重命名必须是显式 Definition migration，并进入 migration report。

### 3.3 `definitionVersion`

Definition 版本与文档 `schemaVersion` 相互独立。它表示 authored control 角色、参数名称/类型/默认值/单位和会改变旧 authored data 含义的 Definition 语义。

完整导入在 Store mutation 前必须满足：

```text
feature.definitionVersion === registry.get(feature.plotType).version
```

008C 可以通过显式 `definitionTargets` 完成迁移；008D 负责从 live `PlotRegistry` 派生目标并强制该等式。

### 3.4 `controlPoints`

WGS84 `[longitude, latitude]` 数组。坐标必须有限、纬度位于 `[-90,90]`，控制点顺序和角色由 Definition 规定。禁止保存派生 Polygon 顶点代替 authored controls。

### 3.5 `parameters`

可序列化算法参数。Definition 必须提供默认值、类型/范围验证、单位说明和不兼容变化的显式 migration。

### 3.6 `style`

样式是 authored state；MapLibre 图层表达是派生结果。

### 3.7 `metadata`

业务 JSON 属性，不参与核心几何、迁移路径选择、锁定、可见性或 z-order。未来核心持久化状态必须使用 schema-owned 字段。

### 3.8 `revision`

对象本地修订号。它不是 schema version、Definition version 或协作版本向量。最终保留值必须是非负安全整数。

## 4. 两类版本的职责

### 4.1 `schemaVersion`

负责根结构、文档字段、feature container、顺序、引用、未来 groups/locks/visibility/z-order 和 extension container。

### 4.2 `definitionVersion`

负责一个 `plotType` 的控制点角色、参数语义和 authored Definition behavior。

### 4.3 完整顺序

```text
input byte guard / direct-object boundary
→ JSON syntax parse when string
→ JSON safety and resource scan
→ minimal type/schemaVersion envelope
→ document migration plan and execution
→ current document decode
→ document invariants
→ Definition migration for every feature
→ final complete-document semantic scan
→ final live Definition-version equality
→ Registry canonicalize/generate every feature
→ immutable report
→ atomic Store replacement
```

008C 实现到 immutable current document/report。008D 实现 live Registry equality、generation 和 atomic Store replacement。

禁止先按当前结构解释旧文档，再猜测迁移。

## 5. 持久化版本语法

```text
PLOTJSON_DOCUMENT_TYPE = PlotLibreDocument
CURRENT_PLOTJSON_SCHEMA_VERSION = 1.0.0
```

版本只能是 canonical numeric triple：

```text
MAJOR.MINOR.PATCH
```

每个组件必须是非负安全整数。禁止前缀、缺少组件、前导零、prerelease、build metadata、指数或非安全整数。比较必须使用数值 tuple，不能使用字符串字典序。

## 6. 公共读取 API

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

readPlotDocument(input, options?): ReadPlotDocumentResult
parsePlotDocument(input, options?): PlotDocument
```

`readPlotDocument()` 是权威 evidence-bearing API。`parsePlotDocument()` 是兼容 wrapper，仅返回 `result.document`。

## 7. 当前 `1.0.0` 兼容行为

008C 保留历史解释结果，并将默认化和丢弃行为写入报告：

| 条件 | 当前结果 |
|---|---|
| `type` 不匹配 | 拒绝 |
| schema version 无效/未来/缺链 | 结构化拒绝 |
| 缺少文档 id/name/features/metadata | 拒绝 |
| 未知根或 feature 字段 | 丢弃并报告 |
| 缺少或非字符串 `definitionVersion` | 使用 `1.0.0` 并报告 |
| 缺少或非对象 parameters/style/feature metadata | 使用 `{}` 并报告 |
| 缺少或无效 revision | 使用 `0` 并报告 |
| control point 不是两个 number | 拒绝 |
| 纬度不在 `[-90,90]` | 拒绝 |
| feature id 重复 | 拒绝 |

未知字段按排序后的 key 顺序处理，保证报告顺序确定。

非 JSON 值、循环引用、非有限数值和资源限制违规不属于兼容承诺，必须拒绝。

## 8. JSON 安全边界

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

要求：

- 迭代遍历，不依赖 JavaScript 调用栈；
- descriptor 检查，不调用 getter；
- 对象 key 按字典序访问；
- 重复但无环的引用复制为独立 JSON tree；
- `__proto__`、`constructor`、`prototype` 保持安全 data property；
- 不修改调用方输入；
- clone 与输入不共享 nested containers。

## 9. 资源限制

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

这些是处理不可信输入的安全 ceiling，不是推荐文档规模、内存保证或延迟 SLA。

## 10. Migration registry 与 planner

Document node：

```text
schemaVersion
```

Definition node：

```text
(plotType, definitionVersion)
```

Definition rename 必须是显式 edge，例如：

```text
arrow.legacy@1.0.0
→ arrow.bridge@1.1.0
→ arrow.current@2.0.0
```

注册约束：

- migration function 必须存在；
- 版本必须 canonical；
- target version 严格大于 source version；
- Definition plotType 非空；
- descriptor/reference 复制并冻结；
- 每个 source node 最多一条 outgoing edge；
- duplicate、branch、self、decreasing、cycle 均拒绝；
- invalid insertion 回滚；
- registration order 不影响 valid plan。

Planner 只沿唯一 outgoing edge，要求 exact target，不执行 migration function，不选择 shortest、nearest 或 best-effort path。

## 11. Document migration execution

每一步：

```text
safe cloned JSON object
→ freeze input
→ trusted synchronous migration function
→ require new object
→ reject Promise/async output
→ descriptor-safe clone and resource scan
→ exact target type/schema envelope
→ append report fact only after success
```

Thrown、same-object、Promise、accessor、cycle、custom prototype、resource violation 和错误 envelope 统一转换为带 source/target scalar context 的 `PLOTJSON_MIGRATION_OUTPUT_INVALID`。

Migration function 是应用安装的 trusted synchronous code。文档不能指定模块或可执行代码。函数不得读取 clock、random、network、DOM、MapLibre、Store 或 History。

## 12. Definition migration execution

`definitionTargets` 以 document decode 后的 source plotType 为 key，值为 exact final reference。

当 map 省略时，读取器保留 parser-only 1.0 兼容，不声明 live Registry equality。

当 map 提供时：

- 每个 source plotType 必须有 own target；
- exact source/target 不执行 migration；
- 其他目标必须存在 exact migration chain；
- 每步输入为 frozen cloned feature；
- 每步输出必须是新的同步 JSON object；
- 每步输出重新扫描；
- 每步显式检查 `controlPointsPerFeature`；
- feature id 不变；
- plotType/version 等于 step target；
- 最终 feature decode 必须成功并等于 requested target；
- malformed final feature 归因于 `PLOTJSON_DEFINITION_MIGRATION_OUTPUT_INVALID`。

## 13. 最终整文档语义扫描

独立 feature root 无法推断 `features[i].controlPoints` 角色，也无法累计 document-wide controls。因此 008C 在所有 Definition migrations 后重建并扫描完整 current document。

最终扫描再次执行：

```text
features
controlPointsPerFeature
totalControlPoints
depth
totalNodes
objectKeys
stringLength
```

该步骤是安全与资源语义的一部分，不得因“每个 feature 已扫描”而删除。

## 14. Migration report

报告包含：

```text
source schema version
target schema version
document applied steps
per-feature Definition records
explicit plotType rename facts
1.0 normalization facts
warnings with stable code and JSON path
```

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

报告结构复制并深度冻结，不保留完整文档、业务 metadata 或 migration function。

## 15. 结构化错误

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

稳定代码覆盖 syntax、non-JSON、resource、root/type/version、migration path/output、current schema、duplicate id、Definition lookup/version/migration 和 import transaction 等类别。

## 16. 当前导入限制

当前 `PlotLibre.importDocument()` 仍在 Registry preflight 后执行：

```text
store.clear()
→ repeated store.add(feature)
```

这不能满足所有中途失败下的原子性。

## 17. 008D 原子导入目标

```text
readPlotDocument
→ derive exact final Definition targets from live PlotRegistry
→ require final Definition-version equality
→ canonicalize/generate every feature
→ validate complete ids and order
→ stage one Store document replacement
→ one Store commit / one batch event
→ clear transient state only after success
→ rebuild derived MapLibre state
```

失败时必须保持旧 Store/order、selection/Primary、History 和 active interaction state。

## 18. Runtime 分阶段

```text
008A version / errors / JSON safety / limits — merged
008B migration registry / planner / report records — merged
008C report-bearing reader / execution / compatibility / invariants — merged
008D Registry-aware preparation / atomic Store and MapLibre import — next
008E fixtures / public docs / finalization
```

## 19. 与 007D 的关系

Groups、locks、visibility 和 z-order 是核心持久状态，不能存入 metadata 或只存在于 UI。

007D 必须等 008D/E 完成，并使用真实 production schema migration、引用验证、golden fixtures 和原子 import。

## 20. 非目标

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

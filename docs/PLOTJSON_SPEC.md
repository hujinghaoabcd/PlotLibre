# PlotJSON 1.0 规范与版本策略

状态：

```text
current persisted schema: 1.0.0
current runtime: exact-version parser, no migration registry
Milestone 008: migration/import architecture frozen in design
future schema bump: deferred until a production persisted-state change
```

权威设计：

```text
docs/design/plotjson-migrations.md
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

PlotJSON 不把派生 Polygon、LineString、采样点、选择轮廓、变换框或命中区域作为 canonical authored state。

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
| `features` | 是 | 参数化标绘对象数组，数组顺序是当前文档顺序 |
| `metadata` | 是 | 文档级 JSON 属性，不控制核心运行时行为 |

当前 `PlotLibre.exportDocument()` 还会写入信息性 metadata：

```json
{
  "generator": "PlotLibre",
  "schema": "PlotJSON 1.0.0"
}
```

`metadata.schema` 不是版本权威；读取器只认根级 `schemaVersion`。未来运行时应由统一常量生成该信息，或弃用冗余字段。

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
  "parameters": {
    "tailWidthRatio": 0.08,
    "headLengthRatio": 0.28,
    "headWidthRatio": 2.4,
    "neckWidthRatio": 0.8,
    "minimumWidthMeters": 1,
    "maximumWidthMeters": 100000
  },
  "style": {
    "fillColor": "#d32f2f",
    "fillOpacity": 0.45,
    "lineColor": "#8e0000",
    "lineOpacity": 1,
    "lineWidth": 2
  },
  "metadata": {
    "name": "Main direction"
  },
  "revision": 0
}
```

### 3.1 `id`

文档内必须唯一。稳定 ID 可使用 UUID、ULID 或业务稳定 ID。

重复 ID 必须在 Store 发生任何变化前拒绝。当前解析器尚未执行该文档级检查，Milestone 008 runtime 必须补齐。

### 3.2 `plotType`

注册 Definition 的稳定名称：

```text
category.name
category.family.variant
```

示例：

```text
arrow.straight
arrow.attack.tailed
area.gathering-place
line.circular-arc
```

公开后不能通过 Registry 静默别名改写。重命名必须是显式 Definition migration，并写入 migration report。

### 3.3 `definitionVersion`

Definition 版本与文档 `schemaVersion` 相互独立。

它表示以下语义版本：

- authored control 角色；
- 参数名称、类型、默认值和单位；
- 会影响旧 authored data 含义的几何算法变化；
- Definition 拥有的样式解释。

迁移完成后必须满足：

```text
feature.definitionVersion === registry.get(feature.plotType).version
```

当前 Registry 尚未强制该等式。Milestone 008 runtime 必须在 Registry generation 前完成版本迁移或拒绝。

### 3.4 `controlPoints`

WGS84 经度、纬度数组：

```json
[longitude, latitude]
```

要求：

- 坐标为有限数值；
- 纬度位于 `[-90,90]`；
- 控制点顺序由具体 Definition 规定；
- 不保存派生 Polygon 顶点作为替代；
- 数量和语义必须通过当前 Definition 验证。

### 3.5 `parameters`

可序列化的算法参数。每个 Definition 必须：

- 提供当前默认值；
- 验证类型和范围；
- 说明单位；
- 对不兼容参数变化提供显式 Definition migration；
- 不根据参数名进行隐藏的通用缩放或猜测。

### 3.6 `style`

当前核心字段：

```text
fillColor
fillOpacity
lineColor
lineOpacity
lineWidth
lineDasharray
pointColor
pointRadius
textColor
textSize
```

样式是 authored state。MapLibre 图层表达仍是派生结果。

### 3.7 `metadata`

业务 JSON 属性，不参与核心几何、迁移路径选择、锁定、可见性或 z-order。迁移不得在没有明确步骤的情况下重新解释 metadata。

未来核心持久化状态必须使用 schema-owned 字段，不能藏入 metadata。

### 3.8 `revision`

对象本地修订号。它不是 schema 版本、Definition 版本或分布式协作版本向量。

当前更新路径通常使有效变更 `revision + 1`。导入时迁移保留或显式转换历史 revision；最终值必须是非负安全整数。

## 4. 两类版本的职责

### 4.1 `schemaVersion`

负责：

- 根结构；
- 文档字段；
- feature container；
- 排序和引用；
- 未来 groups/locks/visibility/z-order 的持久结构；
- extension container。

### 4.2 `definitionVersion`

负责：

- 一个 `plotType` 的 authored semantic model；
- 控制点角色；
- 参数语义；
- Definition 生成行为的兼容边界。

### 4.3 迁移顺序

```text
parse raw JSON
→ migrate document schema to current
→ decode current document
→ migrate each feature Definition to registered current version
→ canonicalize and Registry.generate every feature
→ atomically replace Store
```

禁止先按当前结构解释旧文档，再猜测迁移。

## 5. 当前 `1.0.0` 实际兼容行为

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

Milestone 008 runtime 不得在同一个 `1.0.0` 下静默改变这些已接受输入的解释。新的 report-bearing API必须记录默认值和未知字段丢弃。

非 JSON 值、循环引用、非有限数值和资源限制违规不属于兼容承诺，必须拒绝。

## 6. 派生 GeoJSON 与 RenderBundle

PlotJSON 1.0 不保存派生 GeoJSON。渲染时由当前 `PlotDefinition.generate()` 生成。

RenderBundle：

```text
fills
lines
points
labels
hitAreas
```

不是持久化结构。选择、区域选择、平移/旋转/缩放 preview、handles、guides 和 DOM/SVG overlays 也不进入 PlotJSON。

未来若增加 derived cache：

- authored controls 始终权威；
- reader 必须能忽略缓存；
- cache 必须绑定 schema/definition version；
- cache 设计不属于 Milestone 008。

## 7. 验证层次

### 7.1 JSON 安全

接受：

```text
null / string / boolean / finite number / array / plain object
```

拒绝 direct object input 中的：

```text
undefined / NaN / Infinity / BigInt / Symbol / function
Date / Map / Set / typed array / class instance / accessor / cycle
```

### 7.2 结构验证

验证根、版本、字段类型、features 数组、control point shape、revision 和 JSON-safe containers。

### 7.3 文档不变量

验证 feature ID 唯一、文档顺序、资源限制，以及未来引用完整性。

### 7.4 Definition 版本迁移

迁移到注册 Definition 的当前版本；缺失路径或更高未来版本拒绝。

### 7.5 Registry 语义预检

对全部 feature 执行：

```text
canonicalize
→ validate
→ generate
```

任何一个失败都拒绝整份文档。

### 7.6 Store commit

只有全部阶段成功后，才能通过一个原子 document-replacement transaction 修改 Store。

## 8. 迁移注册表

迁移代码独立于 `PlotDefinition`：

```text
PlotJsonMigrationRegistry
├── document migrations
└── Definition migrations keyed by plotType
```

绑定约束：

- source version 只有一条 outgoing step；
- 版本严格递增；
- 禁止环和分支歧义；
- 同步、纯函数、确定性；
- 不读取时钟、随机、网络、DOM、MapLibre、Store；
- 不修改输入；
- 每步输出重新执行 JSON 安全和资源限制扫描；
- 不允许部分结果泄漏。

更完整接口与算法见权威设计文档。

## 9. Migration report

新的 report-bearing read API 应返回：

```text
source schema version
target schema version
document migration steps
feature migration steps
plotType renames
1.0.0 normalizations
warnings with stable code and JSON path
```

现有 `parsePlotDocument()` 保留返回 `PlotDocument` 的兼容表面，并可委托新 reader。

报告默认不复制整份文档或业务 metadata。

## 10. 原子导入

当前 `PlotLibre.importDocument()` 在 Registry 预检后执行：

```text
store.clear()
→ store.add(feature) repeatedly
```

这不能满足重复 ID 等中途失败下的原子性。

Milestone 008 runtime 必须替换为：

```text
prepare complete canonical document in memory
→ stage complete Store replacement
→ validate ids and order
→ one Store commit / one batch event
→ clear selection and History after success
```

失败时必须保持：

```text
old Store
old order
old selection
old History
active interaction state
```

均不变。

## 11. 资源限制

reader 必须支持有限默认值和应用侧收紧：

```text
input bytes
JSON depth
total nodes
object keys
string length
feature count
controls per feature
total control count
```

具体默认值由 runtime PR 在测试与测量后发布。本规范不编造未经验证的性能保证。

## 12. 错误表面

PlotJSON 需要专用结构化错误，而不是所有失败都压缩成 `INVALID_PLOT_FEATURE`。

稳定错误类别包括：

```text
syntax / non-JSON / resource limit
root / type / schema version
missing migration path / invalid migration output
current schema invalid / duplicate feature id
unknown Definition / invalid Definition version
missing Definition migration path / invalid Definition migration output
invalid future reference
atomic import transaction failure
```

绑定代码列表见 `docs/design/plotjson-migrations.md`。

## 13. 未知数据策略

- 未知或未来 schemaVersion：拒绝；
- 未知 plotType：拒绝；
- 未来 definitionVersion：拒绝；
- `1.0.0` 未知结构字段：保持历史行为，丢弃并在新 report 中警告；
- metadata 未知 key：保留 JSON 值；
- 不从 derived geometry 推断 plotType 或控制点；
- unresolved feature 保留模式延期。

未来 schema 应引入显式 `extensions` container，并对未知 schema-owned 字段采取严格策略。

## 14. Golden fixtures

Milestone 008 runtime 至少需要：

```text
current exact round trip
1.0.0 historical defaults
unknown fields normalization
malformed JSON / non-JSON direct object
old/current/future versions
complete/missing document migration chain
complete/missing Definition chain
plotType rename
unknown Definition
duplicate feature ids
resource-limit boundaries
migration output invalid
Registry generation failure
atomic import rollback
exact document order after success
```

所有迁移必须证明确定性、幂等性和不修改输入。

## 15. 与 007D 的关系

Groups、locks、visibility 和 z-order 是核心持久状态，不能存入 metadata 或只存在于 UI。

Milestone 008 runtime 首先建立 migration foundation，并保持 current schema `1.0.0`。之后 007D 才能：

- 冻结真实 `1.1.0` JSON shape；
- 注册生产 `1.0.0 → 1.1.0` document migration；
- 增加 stable group references；
- 明确 feature array 的 bottom-to-top z-order；
- 定义 feature/group lock 与 visibility 合成；
- 添加完整兼容 fixture。

## 16. GeoJSON 互操作

导出普通 GeoJSON 时：

- geometry 使用生成后的派生几何；
- properties 可保留 `plotType`、`plotId` 和业务字段；
- 普通 GIS 可以查看，但不能可靠恢复 semantic authored controls；
- `hitAreas`、handles、guides 和 overlays 不导出。

导入普通 GeoJSON 时默认作为普通几何数据，不伪造 parametric plot。

## 17. 安全约束

- 不执行 metadata 或 migration input 中的代码；
- migration 只来自应用安装的可信 registry；
- 不按文档内容动态加载模块；
- 防止 prototype pollution；
- 限制大小、深度、节点、字符串、feature 和 control 数量；
- 错误信息不输出完整文档或敏感 metadata；
- 外部图片、图标、SVG 和 URL 由独立 I/O 安全策略处理。

## 18. 非目标

Milestone 008 design/runtime 不包含：

```text
schema 1.1.0 production fields
groups/locks/visibility/z-order runtime
downgrade/export-to-old-version
future-version best effort
unresolved feature mode
async/network migration
arbitrary migration DAG
collaboration version vectors
canonical signed JSON
derived geometry cache
```

# PlotJSON 1.0 规范

## 1. 目的

GeoJSON 能表达最终几何，但不能完整表达一个参数化态势标绘对象的控制点语义、生成算法版本和可编辑参数。

PlotJSON 是 PlotLibre 的语义文档格式。它保存足够的信息，使对象能够：

- 在不同时间重新编辑；
- 重新生成派生几何；
- 使用新版算法迁移；
- 在其他地图引擎中渲染；
- 保持业务属性和图层结构。

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

字段：

| 字段 | 必需 | 含义 |
|---|---:|---|
| `type` | 是 | 固定为 `PlotLibreDocument` |
| `schemaVersion` | 是 | 当前固定为 `1.0.0` |
| `id` | 是 | 文档稳定标识符 |
| `name` | 是 | 文档显示名称 |
| `features` | 是 | 参数化标绘对象数组 |
| `metadata` | 是 | 文档级 JSON 属性 |

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

文档内必须唯一。后续协作扩展会要求全局稳定 ID，建议使用 UUID、ULID 或业务稳定 ID。

### 3.2 `plotType`

注册定义的稳定名称。命名规范：

```text
category.name
category.family.variant
```

示例：

```text
arrow.straight
arrow.attack.tailed
area.gathering
flag.swallowtail
```

一旦公开发布，不应随意重命名。重命名必须提供 alias 或迁移。

### 3.3 `definitionVersion`

表示生成该对象的符号定义算法版本。它与 PlotJSON 文档版本不同。

当以下变化会改变既有数据含义时，应提升版本：

- 参数定义变化；
- 控制点语义变化；
- 默认值变化导致旧对象外观改变；
- 几何算法发生不兼容变化。

### 3.4 `controlPoints`

WGS84 经度、纬度数组：

```json
[longitude, latitude]
```

要求：

- 经度为有限数值；
- 纬度位于 `[-90, 90]`；
- 控制点顺序由具体 definition 规定；
- 不保存派生 Polygon 顶点作为替代。

### 3.5 `parameters`

可序列化的算法参数。每个 definition 必须：

- 提供默认值；
- 验证类型和范围；
- 说明单位；
- 保持向后兼容或提供迁移。

### 3.6 `style`

当前核心样式字段：

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

后续可扩展符号、图案、字体、标签位置和分辨率相关样式。

### 3.7 `metadata`

业务属性，不参与几何算法。可存储名称、作者、分类、时间范围、图层 ID 和外部业务 ID。

### 3.8 `revision`

对象本地修订号。当前每次 Store 更新增加 1。它不是分布式协作版本向量。

## 4. 派生 GeoJSON

PlotJSON 1.0 当前不强制保存派生 GeoJSON。渲染时由 `PlotDefinition.generate()` 生成。

未来可允许可选缓存：

```json
{
  "derived": {
    "definitionVersion": "1.0.0",
    "geometry": {}
  }
}
```

读取器必须能够忽略并重新生成缓存。控制点始终具有更高权威性。

## 5. RenderBundle

RenderBundle 不是 PlotJSON 的持久化结构，而是运行时派生结构：

```text
fills
lines
points
labels
hitAreas
```

每个派生 Feature 包含：

```text
plotId
plotType
role
style properties
```

`hitAreas` 默认不导出到普通 GeoJSON，因为它们只服务于交互命中测试。

## 6. 验证

读取文档时至少验证：

- 根对象和版本；
- 文档 ID 和名称；
- features 数组；
- feature ID 和 plotType；
- controlPoints 结构；
- definition 是否注册；
- 控制点数量；
- 参数类型和范围；
- definition 自定义验证。

当前实现已经完成基础结构验证和 Registry 控制点验证。完整 JSON Schema 将在 `0.1.0` 前增加。

## 7. 迁移

计划迁移接口：

```ts
interface PlotDefinition {
  migrate?(feature: unknown, fromVersion: string): PlotFeature;
}
```

文档级迁移流程：

```text
parse raw JSON
→ migrate document schema
→ migrate each feature definition
→ validate
→ load store
```

迁移必须是确定性的，并由固定 fixture 测试。

## 8. GeoJSON 互操作

导出普通 GeoJSON 时：

- geometry 使用生成后的最终几何；
- properties 保留 `plotType`、`plotId` 和必要业务字段；
- 普通 GIS 可以查看，但通常无法继续语义编辑；
- 可选将完整 PlotLibre 数据放入命名空间属性，但需控制文件大小。

导入普通 GeoJSON 时不能可靠推断攻击箭头的原始控制点，因此默认作为普通几何导入，不伪造 parametric plot。

## 9. 安全约束

- 不执行 metadata 中的代码；
- 不允许函数、Symbol、BigInt 或循环引用；
- 对点数、字符串长度和文档大小设置可配置上限；
- 外部图标和图片 URL 需要应用侧安全策略；
- 导入 SVG 时必须清理脚本和危险属性。

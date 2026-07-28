# `arrow.assault-direction` 算法与数据契约

## 1. 设计目标

`arrow.assault-direction` 表示强调力量集中和正面推进的**宽体突击方向箭头**。

它必须与现有符号形成真实区别：

| 类型 | 视觉语义 |
|---|---|
| `arrow.straight` | 通用直向箭头，尾部与颈部比例较均衡 |
| `arrow.fine` | 细长、轻量、渐缩的方向提示 |
| `arrow.fine.tailed` | 带中心燕尾缺口的细长方向提示 |
| `arrow.assault-direction` | 宽体、近恒宽箭身、明显肩部和角度定义箭头的突击方向 |

因此，本类型不能通过注册 `arrow.fine` 并更换一组默认参数实现。

## 2. 公开行为参考与 clean-room 决策

### ol-plot

公开源码将 `AssaultDirection` 描述为“粗单直箭头”，并在 `FineArrow` 分类基础上使用更宽的尾部、颈部、头部以及独立的头角和颈角：

```text
https://github.com/sakitam-fdd/ol-plot/blob/c919e60b4edeaeca53c08f9552f793b2ae9537f0/packages/ol-plot/src/geometry/Arrow/AssaultDirection.ts
```

其 `FineArrow` 公开实现使用两点控制和角度构造左右箭头顶点：

```text
https://github.com/sakitam-fdd/ol-plot/blob/c919e60b4edeaeca53c08f9552f793b2ae9537f0/packages/ol-plot/src/geometry/Arrow/FineArrow.ts
```

PlotLibre 只使用这些公开行为作为分类和视觉语义参考，不复制其类结构、字段值、工具函数或源码表达。

### Mars3D

Mars3D 当前公开 API 目录区分：

- `FineArrow`：2 点直箭头；
- `FineArrowYW`：2 点燕尾直箭头；
- `StraightArrow`：3 点直箭头。

参考：

```text
https://mars3d.cn/docs/guide/api/
```

该目录没有作为本实现算法来源，只用于确认常见产品对两点/三点箭头的分类差异。

### PlotLibre 独立决策

PlotLibre 使用独立数学模型：

```text
broad constant-width shaft
+ angle-defined triangular head
+ explicit shoulder/neck inset
```

这与细箭头的“窄尾部 + 向颈部渐缩 + 宽度倍数头部”模型不同。

代码复用：

```text
none
```

## 3. 语义控制点

```text
controlPoints[0] = assault origin / tail center
controlPoints[1] = assault objective / tip
```

两点共同定义推进轴线。所有 Polygon 顶点均为派生结果。

## 4. 参数

| 参数 | 默认值 | 含义 | 约束 |
|---|---:|---|---|
| `bodyWidthRatio` | `0.18` | 箭身完整宽度相对总长度 | `[0.04, 0.4]` |
| `headLengthRatio` | `0.30` | 箭头纵向长度相对总长度 | `[0.12, 0.55]` |
| `headAngleDegrees` | `42` | 箭翼相对反向轴线的张角 | `[18, 68]` |
| `neckWidthRatio` | `0.72` | 颈部半宽相对箭身半宽 | `[0.35, 1]` |
| `minimumWidthMeters` | `2` | 箭身完整宽度下限 | `> 0` |
| `maximumWidthMeters` | `100000` | 箭身完整宽度上限 | `>= minimum` |

## 5. 局部坐标构造

设：

```text
T = tail center
P = tip
d = normalize(P - T)
n = leftNormal(d)
L = |P - T|
```

箭身完整宽度：

```text
bodyWidth = clamp(L × bodyWidthRatio, minimumWidthMeters, maximumWidthMeters)
bodyHalfWidth = bodyWidth / 2
```

箭头纵向长度：

```text
headLength = min(L × headLengthRatio, 0.7L)
shoulderCenter = P - d × headLength
```

角度定义的箭翼半宽：

```text
headHalfWidth = headLength × tan(headAngleDegrees)
```

为避免极端角度产生过宽 Polygon，再应用动态上限：

```text
headHalfWidth <= 0.65L
```

颈部半宽：

```text
neckHalfWidth = bodyHalfWidth × neckWidthRatio
```

## 6. Ring 拓扑

```text
tailLeft
→ neckLeft
→ headLeft
→ tip
→ headRight
→ neckRight
→ tailRight
→ tailLeft
```

其中：

```text
tailLeft  = T + n × bodyHalfWidth
tailRight = T - n × bodyHalfWidth
neckLeft  = shoulderCenter + n × neckHalfWidth
neckRight = shoulderCenter - n × neckHalfWidth
headLeft  = shoulderCenter + n × headHalfWidth
headRight = shoulderCenter - n × headHalfWidth
```

箭身从尾部到颈部保持接近恒宽；箭头在 shoulderCenter 形成明显肩部。这是与 `arrow.fine` 渐缩箭身的核心结构差异。

## 7. 安全约束

- 控制点必须不同；
- 所有输入必须有限；
- 参数必须位于声明范围；
- `headHalfWidth` 使用动态上限；
- shoulderCenter 必须位于 tail 与 tip 之间；
- 生成 ring 必须闭合；
- 生成 ring 必须通过 `isSimpleRing()`；
- tip 直接恢复为原始第二控制点；
- 极点附近 local projection 明确拒绝。

## 8. PlotJSON

```json
{
  "id": "assault-direction-1",
  "plotType": "arrow.assault-direction",
  "definitionVersion": "1.0.0",
  "controlPoints": [
    [118.78, 32.04],
    [118.86, 32.10]
  ],
  "parameters": {
    "bodyWidthRatio": 0.18,
    "headLengthRatio": 0.30,
    "headAngleDegrees": 42,
    "neckWidthRatio": 0.72,
    "minimumWidthMeters": 2,
    "maximumWidthMeters": 100000
  },
  "style": {},
  "metadata": {},
  "revision": 0
}
```

## 9. 测试计划

必须覆盖：

- 赤道向东黄金坐标；
- ring 闭合和有限值；
- 精确 tip；
- simple ring；
- 宽体契约：默认箭身显著宽于 `arrow.fine`；
- 结构契约：尾部半宽大于或等于颈部半宽；
- 角度参数只改变箭翼宽度，不改变尾部和颈部；
- 参数边界；
- 重合控制点；
- Registry 和 RenderBundle；
- PlotJSON round trip；
- Playground selector；
- TwoPointDrawSession 和 handles；
- MapLibre committed Source；
- Chromium actual rendered feature。

## 10. 后续演化

- screen-size mode；
- geodesic large-range generator；
- body-width parameter handle；
- head-angle parameter handle；
- 截图视觉黄金基线；
- 数据驱动 Symbol Catalog；
- 与未来多点 attack arrow 的术语和使用场景说明。

# `arrow.fine.tailed` 算法与数据契约

## 1. 目的

`arrow.fine.tailed` 是 `arrow.fine` 的燕尾变体。它保持相同的两点语义、细身箭身和箭头比例，只在尾部增加一个沿中心线向前凹入的参数化缺口。

本实现不是复制 `buildFineArrowRing()` 后修改尾部。两种符号共享一个内部 `FineArrowFrame`，燕尾版本只负责额外的尾部拓扑。

## 2. 语义控制点

```text
controlPoints[0] = tail center
controlPoints[1] = tip
```

尾部左右端点和缺口点都不是控制点，而是根据尾中心、方向、宽度和参数生成的派生顶点。

## 3. 共享几何框架

内部文件：

```text
packages/geometry/src/fine-arrow-frame.ts
```

`FineArrowFrame` 统一计算：

```text
local projection
tail center
tip
direction
normal
arrow length
tail half-width
shared arrow head
```

`buildFineArrowRing()` 和 `buildTailedFineArrowRing()` 都消费该 frame。

这样可保证：

- 两种箭头的头部和主体比例一致；
- 对反经线、极点、重合点和宽度约束使用同一处理；
- 后续修改公共几何时不会维护两份近似代码；
- 平尾细箭头的黄金输出继续作为重构回归契约。

## 4. 参数

燕尾版本继承全部 `FineArrowParameters`，并增加：

| 参数 | 默认值 | 含义 | 约束 |
|---|---:|---|---|
| `tailNotchRatio` | `0.9` | 缺口深度相对于完整尾宽的比例 | `[0.05, 4]` |

定义：

```text
fullTailWidth = 2 × tailHalfWidth
notchDepth = fullTailWidth × tailNotchRatio
notch = tailCenter + direction × notchDepth
```

`tailNotchRatio` 相对于尾宽而不是箭头总长度，因而在不同箭头长度下保持相近的燕尾视觉比例。

## 5. Ring 拓扑

```text
tailLeft
→ neckLeft
→ headLeft
→ tip
→ headRight
→ neckRight
→ tailRight
→ notch
→ tailLeft
```

总坐标数为 9，包括闭合点。

与 `arrow.fine` 相比，只有尾部从：

```text
tailRight → tailLeft
```

变为：

```text
tailRight → notch → tailLeft
```

## 6. 几何安全约束

除基础细箭头约束外，还执行：

1. `tailNotchRatio` 必须有限且位于 `[0.05, 4]`；
2. `notchDepth` 必须小于箭身长度的 80%；
3. 缺口必须仍位于颈部中心之后；
4. 生成的局部 Polygon ring 必须通过 `isSimpleRing()`；
5. 箭尖直接恢复为原始第二控制点；
6. 所有输出坐标必须有限。

参数导致缺口过深或 Polygon 自交时明确抛出 `RangeError`，不静默裁剪参数。

## 7. 与 `arrow.fine` 的兼容关系

保持不变：

- 两点控制语义；
- `tailWidthRatio`；
- `headLengthRatio`；
- `headWidthRatio`；
- `neckWidthRatio`；
- 最小/最大宽度；
- DrawSession；
- handles；
- style；
- RenderBundle roles；
- local projection 和反经线处理。

新增：

- `plotType = arrow.fine.tailed`；
- `tailNotchRatio`；
- 第 8 个非闭合顶点 `notch`；
- 独立 Definition、fixture、PlotJSON 和浏览器测试。

## 8. PlotJSON

示例：

```json
{
  "id": "tailed-direction",
  "plotType": "arrow.fine.tailed",
  "definitionVersion": "1.0.0",
  "controlPoints": [
    [118.78, 32.04],
    [118.86, 32.1]
  ],
  "parameters": {
    "tailWidthRatio": 0.055,
    "headLengthRatio": 0.22,
    "headWidthRatio": 1.9,
    "neckWidthRatio": 0.42,
    "minimumWidthMeters": 1,
    "maximumWidthMeters": 100000,
    "tailNotchRatio": 0.9
  },
  "style": {},
  "metadata": {},
  "revision": 0
}
```

## 9. 测试

新增：

```text
tests/fixtures/tailed-fine-arrow.json
tests/tailed-fine-arrow.test.mjs
```

覆盖：

- 赤道向东的确定性黄金坐标；
- 9 点闭合 ring；
- 所有坐标有限；
- 简单 Polygon；
- 精确语义箭尖；
- 缺口位于中心线；
- 改变缺口比例不改变其他顶点；
- 参数边界；
- 过深缺口拒绝；
- Registry；
- fill、outline 和 hit-area；
- PlotJSON round trip。

现有 `tests/fine-arrow.test.mjs` 继续验证共享 frame 重构没有改变 `arrow.fine` 的黄金坐标。

Playwright 覆盖：

- 第三个 selector option；
- 绘制 `arrow.fine.tailed`；
- Store 中保存正确类型和两个控制点；
- 派生 Polygon ring 长度为 9；
- committed Source 和实际 rendered feature 中存在燕尾细箭头；
- 南京示例包含三种箭头。

## 10. 来源与许可

使用通用公共领域数学：

- 二维向量；
- 局部投影；
- 比例宽度；
- 沿方向向量放置中心缺口；
- Polygon ring 自交检测。

代码复用：

```text
none
```

没有复制或翻译 ol-plot、Maptalks、Mars3D、Cesium、Mapbox、tactical-draw 或其他标绘库源码。

## 11. 后续演化

- 参数控制柄可沿中心线拖动缺口；
- screen-size mode；
- geodesic large-range mode；
- 视觉截图黄金基线；
- 数据驱动 Symbol Catalog；
- 统一平尾/燕尾的内部 tail strategy。

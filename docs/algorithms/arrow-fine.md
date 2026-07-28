# `arrow.fine` 算法与数据契约

## 1. 目的

`arrow.fine` 是 PlotLibre 的第一个 Milestone 005 符号。它提供一个两控制点、细身、渐缩的方向箭头，用于比 `arrow.straight` 更轻量的方向、路线或行动趋势表达。

本实现是独立的参数化符号，不是通过修改 `arrow.straight` 的默认样式伪装出的第二个名称。

## 2. 语义控制点

```text
controlPoints[0] = tail center
controlPoints[1] = tip
```

控制点是 PlotJSON 和编辑系统中的原始数据。Polygon 顶点全部是派生结果，不得反向替换控制点。

## 3. 坐标策略

当前实现以箭尾作为局部投影原点：

```text
WGS84 control points
→ local metre coordinates
→ construct polygon
→ WGS84 derived ring
```

局部投影使用 Milestone 004 的最短经差处理，因此接近反经线的小范围箭头不会被错误解释为跨越接近整个地球周长。

极点附近局部投影不稳定时会明确抛出错误。未来大范围符号应根据 `analyzeCoordinateMode()` 切换至 geodesic 构造。

## 4. 参数

| 参数 | 默认值 | 含义 | 约束 |
|---|---:|---|---|
| `tailWidthRatio` | `0.055` | 尾部完整宽度相对总长度的比例 | `[0.005, 0.3]` |
| `headLengthRatio` | `0.22` | 箭头长度相对总长度的比例 | `[0.05, 0.7]` |
| `headWidthRatio` | `1.9` | 箭头半宽相对尾部半宽的倍数 | `[1, 6]` |
| `neckWidthRatio` | `0.42` | 颈部半宽相对尾部半宽的倍数 | `[0.05, 1]` |
| `minimumWidthMeters` | `1` | 尾部完整宽度下限 | `> 0` |
| `maximumWidthMeters` | `100000` | 尾部完整宽度上限 | `>= minimum` |

所有参数都是有限数值、可序列化并进入 PlotJSON。

## 5. 几何构造

设箭尾中心为 `T`，箭尖为 `P`：

1. 计算方向向量 `d = normalize(P - T)`；
2. 计算左法向量 `n`；
3. 由总长度和 `tailWidthRatio` 得到尾部半宽；
4. 由 `headLengthRatio` 确定颈部中心；
5. 使用共享 `buildArrowHead()` 构造颈部、箭翼和箭尖；
6. 由 `T ± n * tailHalfWidth` 构造尾部左右点；
7. 按以下顺序闭合 Polygon：

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

颈部比尾部显著收窄，使箭身形成细长渐缩轮廓。箭尖位置直接使用原始第二控制点，避免局部投影往返造成亚纳度浮点漂移。

## 6. 与 `arrow.straight` 的区别

- 独立的公共类型：`arrow.fine`；
- 独立的参数接口和默认值；
- 更小的尾宽比例；
- 更窄的颈部；
- 更克制的箭翼宽度；
- 独立的黄金样例、数值测试和浏览器测试；
- 可在后续版本独立演化，不改变 `arrow.straight` 的视觉契约。

## 7. 退化与错误策略

- 两个控制点重合：抛出 `RangeError`；
- 非有限坐标：由 local projection 拒绝；
- 纬度超出 WGS84 范围：由 Registry 校验拒绝；
- 参数越界：抛出 `RangeError`；
- 最小宽度非正：抛出 `RangeError`；
- 最大宽度小于最小宽度：抛出 `RangeError`；
- 极点局部投影不稳定：明确要求 geodesic mode。

## 8. 测试

### 数值和黄金样例

```text
tests/fixtures/fine-arrow.json
tests/fine-arrow.test.mjs
```

覆盖：

- 赤道向东箭头的确定性坐标；
- Polygon 闭合；
- 所有坐标有限；
- 语义箭尖精确保留；
- 默认细箭头比默认直箭头窄；
- 参数越界；
- 重合控制点；
- Registry 注册；
- fill、outline、hit-area；
- PlotJSON round trip。

### 浏览器

Playwright 覆盖：

- Playground 符号选择器；
- 两点绘制 `arrow.fine`；
- Store 中保存 `plotType = arrow.fine`；
- 两个语义控制点；
- MapLibre committed fill/line 中实际可查询到细箭头；
- 南京示例同时包含直箭头与细箭头。

## 9. 来源和许可

数学来源为通用公共领域几何：

- 二维向量归一化；
- 左法向量；
- 局部等距近似；
- 按比例构造箭身和箭头；
- Polygon ring 闭合。

代码复用：

```text
none
```

没有复制或翻译 OpenLayers、Maptalks、Mars3D、Cesium、Mapbox、ol-plot、tactical-draw 或其他标绘库源码。参考项目只用于理解公开的符号分类和产品行为。

## 10. 后续演化

未来可在保持 PlotJSON 迁移兼容的前提下评估：

- screen-size mode；
- geodesic large-range mode；
- 参数控制柄；
- 尾部宽度交互；
- 基于角度的箭翼参数；
- SVG/PNG 视觉黄金快照。

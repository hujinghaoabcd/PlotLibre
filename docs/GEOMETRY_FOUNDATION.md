# PlotLibre 箭头公共几何基础

## 1. 目的

Milestone 004 不直接增加大量箭头符号，而是先建立可复用、可测试、与地图引擎无关的二维和测地几何原语。后续 `arrow.fine`、`arrow.attack`、燕尾箭头、双箭头和通道类符号必须复用这些原语，避免每个符号各自复制一套曲线、偏移和环处理代码。

源码位置：

```text
packages/geometry/src/
├── vector.ts
├── polyline.ts
├── curves.ts
├── offset.ts
├── ring.ts
├── geodesic.ts
├── local-projection.ts
├── arrow-components.ts
└── straight-arrow.ts
```

## 2. 坐标分层

公共几何分成两个层次。

### 2.1 平面层

以下算法只接受局部平面米制坐标 `Vec2`：

- 折线清洗和长度；
- 沿线采样和切向量；
- Catmull-Rom 和 Cubic Bezier；
- 变宽偏移；
- Polygon ring 方向和自交；
- 箭头头部构造。

这些函数不允许直接把经纬度当作平面 x/y 使用。

### 2.2 地理层

以下算法接受 WGS84 `Position`：

- 局部投影；
- Haversine 距离；
- 初始方位角；
- 终点推算；
- 大圆路径采样；
- 经度归一化；
- 反经线检测和经度展开；
- local/geodesic 模式分析。

符号 definition 应先根据范围和纬度选择坐标模式，再进入平面构造。

## 3. 折线基础

### 3.1 清洗

`cleanPolyline()` 只移除连续的重复或近重复点，不移除路径后方再次出现的同一位置。这一点很重要，因为闭合或回折路径可能合法地再次经过同一点。

### 3.2 里程

`measurePolyline()` 返回：

```text
cleaned points
segment lengths
cumulative lengths
total length
```

累计长度必须严格递增。少于两个不同点时抛出 `RangeError`。

### 3.3 沿线采样

`sampleMeasuredPolyline()` 根据米制路径距离返回：

- 插值点；
- 单位切向量；
- segment index；
- segment ratio；
- 实际夹紧后的距离。

路径外距离自动夹紧到首尾点。

## 4. 曲线

### 4.1 Cubic Bezier

使用标准三次 Bernstein 基函数：

```text
B(t) = (1-t)^3 P0
     + 3(1-t)^2 t P1
     + 3(1-t)t^2 P2
     + t^3 P3
```

### 4.2 Catmull-Rom

当前使用可调 tension 的 Hermite 表达。端点使用重复控制点策略，保证结果从第一个控制点开始并在最后一个控制点结束。

当前实现属于共享基础，不声明为最终制图曲线风格。后续可增加 centripetal 参数化，但必须保持现有确定性测试和迁移说明。

## 5. 变宽偏移

`offsetPolyline()` 接受：

```text
center points + half-width profile
```

宽度可以是统一数值，也可以逐顶点给出。内部使用相邻线段单位法向量的 miter 构造，并通过 `miterLimit` 限制尖角处的无限延伸。

明确限制：

- 输入不能包含连续重复点；
- 宽度必须有限且非负；
- 180 度回折使用下一段法向量退化；
- 当前函数只生成左右边界，不自动解决偏移后的自交。

后续符号必须调用 `findRingSelfIntersections()` 检查最终环。

## 6. Ring

提供：

- `closeRing()`；
- `signedRingArea()`；
- `ringWinding()`；
- `ensureRingWinding()`；
- `segmentsIntersect()`；
- `findRingSelfIntersections()`；
- `isSimpleRing()`。

PlotLibre 的内部平面 ring 默认建议统一为 counterclockwise，外部 GeoJSON 输出如需其他约定应在导出层转换。

退化零面积环不能强制调整方向，而是抛出错误。

## 7. 测地和反经线

### 7.1 经度

`normalizeLongitude()` 输出范围：

```text
[-180, 180)
```

局部投影的 x 使用 `shortestLongitudeDelta()`，因此 `[179.999, 0]` 到 `[-179.999, 0]` 被解释为约 222.6 米，而不是接近整圈地球。

### 7.2 测地工具

当前使用球形地球、半径 6378137 米：

- Haversine 距离；
- 初始方位角；
- destination point；
- 按距离采样的大圆路径。

这适用于态势图形的中短距离几何。需要厘米级大地测量精度时，应增加椭球算法实现并明确版本。

### 7.3 模式策略

`analyzeCoordinateMode()` 默认在以下任一情况建议 `geodesic`：

- 路径跨越反经线；
- 最大绝对纬度超过 80°；
- 相对起点范围超过 250 km。

阈值可配置，但必须通过显式参数传入，不能在符号内部隐藏魔法值。

## 8. 共享箭头组件

`buildArrowHead()` 根据：

```text
tip + unit direction + head length + head half-width + neck half-width
```

生成：

```text
neckCenter
neckLeft
headLeft
tip
headRight
neckRight
outline
```

`buildStraightArrowRing()` 已重构为使用该组件，证明共享组件可以替代符号内部重复代码。

## 9. 测试策略

### 9.1 黄金样例

```text
tests/fixtures/geometry-foundation.json
```

固定验证：

- 3-4-5 折线路径累计长度；
- 距离 5 的沿线点和切向量；
- 统一半宽 1 的 90°偏移结果。

### 9.2 确定性测试

`tests/geometry-foundation.test.mjs` 覆盖：

- 重复点清洗；
- 端点夹紧；
- Catmull-Rom 和 Bezier 端点；
- 变宽偏移；
- ring 方向；
- bow-tie 自交；
- 箭头头部对称性；
- 测地距离和 destination round trip；
- 反经线路径；
- local/geodesic 策略；
- 局部投影最短经差。

### 9.3 性质测试

使用固定种子的 100 组随机折线验证：

- 总长度为正；
- 累计长度严格递增；
- 沿线采样点有限；
- 切向量长度约为 1；
- 变宽偏移左右边界全部有限。

固定种子使 CI 可重复。后续可以引入专门 property-testing 库，但不能牺牲可复现性。

## 10. 后续使用规则

新增箭头时必须：

1. 将 WGS84 控制点转换到合适坐标模式；
2. 使用 `cleanPolyline()`；
3. 使用共享曲线算法；
4. 使用 `offsetPolyline()` 或更专业的共享偏移器；
5. 使用 `buildArrowHead()`；
6. 闭合并统一 ring 方向；
7. 检查自交；
8. 再投影回 WGS84；
9. 为退化输入定义明确策略；
10. 增加数值、性质、黄金和浏览器测试。

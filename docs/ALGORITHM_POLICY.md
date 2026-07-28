# 算法研究、来源和净室实现政策

## 1. 目的

态势标绘领域存在大量相互移植的 JavaScript 代码，来源和许可证经常不清楚。PlotLibre 必须从项目初期建立可追溯的算法政策，避免未来发布、商业使用或论文引用时产生风险。

## 2. 默认策略

默认采用净室实现：

1. 研究公开 API、截图、演示和数学描述；
2. 写出独立的控制点语义和公式说明；
3. 编写行为测试；
4. 在不复制第三方表达的前提下独立编码；
5. 通过视觉和数值测试比较行为。

## 3. 允许的来源

- 公共领域数学公式；
- 学术论文和标准中公开的几何定义；
- 许可证兼容且保留必要通知的源码；
- 项目作者明确授权的实现；
- 自主推导和原创算法。

## 4. 禁止事项

- 复制许可证不明的博客代码；
- 从闭源平台反编译；
- 复制非开源许可证下的 Mapbox 新代码；
- 删除原作者版权声明；
- 将第三方算法说成完全原创；
- 仅通过改变量名掩盖复制；
- 混用多个来源后无法说明 provenance。

## 5. 算法记录模板

每个复杂符号或共享算法组在实现前创建记录：

```text
Algorithm or symbol type:
Implementation files:
Author:
Date:
Mathematical description:
Reference behavior:
Reference publications:
Reference repositories and revisions:
License review:
Code reuse: none / partial / full
Required notices:
Degenerate input policy:
Coordinate-mode policy:
Tests:
Golden fixtures:
```

后续在 `docs/algorithms/` 下为复杂符号建立独立文件。共享几何原语可以由一份里程碑级记录覆盖，但必须逐项列出数学来源和测试。

## 6. 当前直箭头来源说明

`arrow.straight` 当前实现为独立基础几何实现：

- 输入两个 WGS84 控制点；
- 将终点投影到起点附近的局部米制平面；
- 根据方向向量和法向量构造尾部、颈部、箭头肩部和尖端；
- 宽度和头部长度由显式比例参数控制；
- 输出闭合 Polygon ring；
- 未复制参考库源代码。

Milestone 004 中，直箭头的头部构造已改为调用公共 `buildArrowHead()`，不再在符号算法内部重复维护 head/neck 几何。

其目标是建立架构和测试垂直切片，不代表最终传统标绘直箭头算法已经冻结。

## 7. Milestone 004 公共几何来源记录

### 7.1 范围

实现文件：

```text
packages/geometry/src/vector.ts
packages/geometry/src/polyline.ts
packages/geometry/src/curves.ts
packages/geometry/src/offset.ts
packages/geometry/src/ring.ts
packages/geometry/src/geodesic.ts
packages/geometry/src/local-projection.ts
packages/geometry/src/arrow-components.ts
```

作者：PlotLibre project  
日期：2026-07-28  
代码复用：`none`

### 7.2 数学来源类别

本阶段只使用公共领域基础数学：

- 欧氏向量加减、点积、叉积、单位向量和法向量；
- 线段长度与线性插值；
- 三次 Bernstein/Bezier 基函数；
- Catmull-Rom 通过 cubic Hermite 形式表达；
- 相邻线段法向量的 miter join；
- shoelace polygon signed area；
- 二维 orientation 与 segment intersection；
- spherical Haversine distance；
- spherical initial bearing 和 destination-point 公式；
- 经度模 360 归一化；
- 局部等距圆柱近似。

这些公式是通用计算几何和球面三角学基础，不来自某个标绘插件的具体实现。

### 7.3 参考行为

只参考项目已经确定的公共行为目标：

- 折线长度和里程应单调；
- 曲线保留首尾控制点；
- 偏移应生成有限左右边界；
- polygon ring 应闭合并可统一方向；
- 自交应可检测；
- 反经线应采用最短经差；
- 高纬度、大范围和反经线路径应显式建议 geodesic 模式；
- 箭头头部应由 tip、方向、长度和宽度显式决定。

没有翻译或复制 Leaflet、OpenLayers、Maptalks、Cesium、Mapbox 或其他标绘项目的源代码。

### 7.4 退化输入策略

- 非有限数值：抛出 `RangeError`；
- 少于两个不同折线点：抛出 `RangeError`；
- 连续重复点：清洗函数移除，偏移函数要求调用者先处理；
- 零长度向量：不能 normalize；
- 180°回折 miter：退化到下一段法向量；
- 超长 miter：由 `miterLimit` 限制；
- 少于三个 ring 顶点：抛出 `RangeError`；
- 零面积 ring：不能强制 winding；
- 重合地理点：不能计算初始方位角；
- 地理极点局部投影：拒绝并要求 geodesic 模式。

### 7.5 坐标模式

默认策略：

```text
local:
  extent <= 250 km
  |latitude| <= 80°
  no antimeridian crossing

geodesic:
  any threshold exceeded
```

阈值可由调用者显式配置。

### 7.6 测试和黄金样例

```text
tests/geometry-foundation.test.mjs
tests/fixtures/geometry-foundation.json
```

覆盖确定性数值、退化输入、反经线、黄金样例和固定种子随机性质测试。

## 8. 第三方依赖政策

公共几何层当前不新增运行时第三方几何依赖。以后若评估 Turf、martinez、earcut、robust-predicates、GeographicLib 或 property-testing 库，必须：

1. 记录具体版本；
2. 审核许可证；
3. 说明使用边界；
4. 避免将依赖对象泄漏为稳定公共 API；
5. 增加替换和升级测试。

## 9. 许可证状态

当前仓库尚未选择开源许可证，package manifest 使用 `UNLICENSED`。在选择许可证前：

- 可以继续自主开发；
- 不得引入要求传播特定许可证但未审计的代码；
- 第三方依赖必须记录许可证；
- 发布 npm 包前必须完成许可证决策。

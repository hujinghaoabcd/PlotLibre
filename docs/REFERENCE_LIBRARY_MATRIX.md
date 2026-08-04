# 参考库研究矩阵

## 1. 研究原则

PlotLibre 会系统研究其他标绘库，但不会把多个库直接拼接为运行时，也不会在许可证不清楚时复制源码。

研究分为四类：

1. 公开 API 和用户体验；
2. 符号目录与控制点语义；
3. 架构和状态机思想；
4. 公开数学描述和可验证行为。

任何源码复用都必须先完成许可证和来源审计，见 `ALGORITHM_POLICY.md`。固定 revision、license、研究文件、行为结论与 code-reuse 声明应进入具体算法记录。

## 2. 重点参考项目

| 项目 | 主要研究内容 | PlotLibre 吸收方向 | 不直接照搬内容 |
|---|---|---|---|
| `ol-plot` | 传统箭头、区域、圆弧、控制点编辑 | public behavior、传统名称、控制点约定 | OpenLayers Feature 继承、two-point fallback、源码表达 |
| `maptalks.plot` | 丰富态势符号、旗帜、集结地、圆弧族 | 符号目录、交叉验证、传统中文术语 | Maptalks 对象模型、singular degradation、源码表达 |
| `maptalks.plotsymbol` | 小型箭头符号集合 | 双箭头和燕尾箭头行为比较 | 直接复制几何实现 |
| Mars2D/Mars3D | 完整产品体验、属性面板和示例 | 产品级符号目录、样式能力 | 平台耦合和闭源/不明实现 |
| Terra Draw | Core/Adapter/Mode 分离 | 引擎适配边界、会话生命周期 | 以普通 GeoJSON mode 作为全部核心 |
| MapLibre-Geoman | 专业编辑、吸附、转换、工具栏 | 编辑体验、选择状态和吸附交互 | 直接依赖或编辑派生 Polygon 顶点 |
| Mapbox GL Draw | 自定义 Mode 和 select/direct-select | Mode 生命周期、控制柄表现 | 历史内部 Store 和 Mapbox 耦合 |
| `@mapbox-web/draw` | Mapbox 自定义态势箭头 mode | 箭头目录和 Mapbox 交互经验 | 未经审计的算法实现 |
| `hongtu-draw` | 态势箭头模式 | 兼容性和 API 对比 | 维护不足的运行时依赖 |
| `arrow-graphic` | 引擎无关箭头坐标输出 | 几何内核解耦思路 | 未审计源码 |
| `mil-sym-ts` | MIL-STD-2525D/E、APP-6D | 可选标准军标后端 | 从零重复实现完整标准 |
| `@orbat-mapper/tactical-draw` | 跨引擎控制措施 | Adapter contract、标准军标会话 | 限制 PlotLibre 为军标专用库 |
| MapLibre GL JS | source、layer、feature-state、事件 | 原生渲染和增量更新 | 非开源 Mapbox 后续代码 |

## 3. 固定参考地址与 revisions

### 3.1 通用项目地址

- MapLibre GL JS: <https://github.com/maplibre/maplibre-gl-js>
- Terra Draw: <https://github.com/JamesLMilner/terra-draw>
- MapLibre-Geoman: <https://github.com/geoman-io/maplibre-geoman>
- Mapbox GL Draw: <https://github.com/mapbox/mapbox-gl-draw>
- mil-sym-ts: <https://github.com/missioncommand/mil-sym-ts>
- ol-plot: <https://github.com/sakitam-fdd/ol-plot>
- maptalks.plot: <https://github.com/sakitam-fdd/maptalks.plot>
- maptalks.plotsymbol: <https://github.com/fuzhenn/maptalks.plotsymbol>

地址存在不代表允许复制。每次算法研究必须记录具体 revision 和许可证。

### 3.2 Milestone 006J 圆弧族固定证据

| 项目 | Revision | License | 审阅范围 | Code reuse |
|---|---|---|---|---|
| `sakitam-fdd/ol-plot` | `c919e60b4edeaeca53c08f9552f793b2ae9537f0` | MIT，Copyright 2017 sakitam-fdd | Arc、Sector、Lune、公共圆弧 helper、LICENSE | none |
| `sakitam-fdd/maptalks.plot` | `37dab8d0dd31650540146e1e0f03f54982f01799` | MIT，Copyright 2017 FDD | Arc、Sector、Lune、公共圆弧 helper、LICENSE | none |

研究用途：

- 控制点数量；
- observable output type；
- 传统类型名称与中文描述；
- minor/major sweep 的可观察行为；
- two-point 与 singular fallback 的对比；
- 独立测试预期。

未复用：

- helper 函数；
- 类结构；
- 常量；
- 采样代码；
- 引擎对象模型；
- 退化输入 fallback。

## 4. Milestone 006J 行为矩阵

| 参考名称 | 两库观察 | 精确几何含义 | PlotLibre 设计候选 | 关键差异 |
|---|---|---|---|---|
| `Arc` | 三点 open line；两点时可能回退直线 | 三点定圆的 selected circular arc | `line.circular-arc` | 固定三点；无 two-point fallback；exact through-point |
| `Sector` | centre + radius/start + end direction；Polygon | 一个半径和有向 sweep 的 circular sector | `area.sector` | 第三点明确为 bearing handle；显式 `sweepDirection` |
| `Lune/弓形` | 三点定圆；一条 arc + 一条 chord | circular segment / 圆弓形 | `area.circular-segment` | 不使用误导性 `area.lune` alias；支持 minor/major 且严格拓扑 |
| true lune | 两库该类型未表达 | 两条圆弧围成的月牙区域 | deferred `area.lune` | 需要独立双圆弧控制模型，不属于 006J 1.0 |

## 5. 006J 设计结论

### 5.1 Public identifiers

```text
line.circular-arc@1.0.0
area.sector@1.0.0
area.circular-segment@1.0.0
```

延期：

```text
area.lune
```

### 5.2 Controls

```text
line.circular-arc:
  start / through / end

area.circular-segment:
  arc-chord start / through / arc-chord end

area.sector:
  centre / exact radius-start / end-bearing handle
```

### 5.3 Coordinate and failure policy

- 1.0 为 local-metre only；
- antimeridian、high latitude 和 large extent fail closed；
- three-point frame 拒绝 duplicate、collinear、near-collinear 和 excessive circumradius；
- no silent geodesic fallback；
- no two-point committed fallback；
- no line/triangle degradation；
- no hidden control movement；
- no automatic minor-sweep override。

### 5.4 Direction and output

- through-point 选择 exact minor 或 major directed arc；
- crossing 0° 通过 angle normalization 处理；
- circular arc 输出 LineString；
- circular segment 输出 selected arc + chord Polygon；
- sector 通过显式 clockwise/counterclockwise 参数选择 sweep；
- rendered winding 不重写 canonical controls 或 direction parameter。

详细设计：

```text
docs/design/circular-arc-family.md
docs/algorithms/circular-arc-foundation.md
```

## 6. 统一对比维度

### 6.1 符号能力

- 普通几何；
- 直箭头；
- 攻击箭头；
- 燕尾箭头；
- 双箭头；
- 分队战斗；
- 路线与走廊；
- 闭合曲线与集结地；
- 圆弧、扇形、圆弓形和真正 lune；
- 旗帜；
- MIL-STD/APP-6。

### 6.2 编辑能力

- 控制点编辑；
- 插入/删除点；
- 平移；
- 旋转；
- 缩放；
- 多选；
- 框选/套索；
- 吸附；
- 撤销重做；
- 触摸；
- parameter handles 与 semantic guides。

### 6.3 数据能力

- 是否保留原始控制点；
- 是否只存最终 GeoJSON；
- 是否保存算法参数；
- 是否区分 authored handle 与 rendered endpoint；
- 是否支持版本迁移；
- 是否支持场景恢复；
- 是否支持标准格式。

### 6.4 工程能力

- TypeScript；
- ESM；
- tree shaking；
- 单元测试；
- 浏览器测试；
- 活跃维护；
- 文档质量；
- 许可证清晰度；
- fixed revision 和 provenance 可审计性。

## 7. PlotLibre 的差异化定位

PlotLibre 的竞争优势不能只写成“MapLibre 也能画攻击箭头”。完整差异应为：

1. MapLibre 原生 source/layer 渲染；
2. 几何内核与地图引擎分离；
3. 控制点和参数作为语义源数据；
4. 完整传统态势标绘；
5. 精确区分 legacy 名称与数学几何含义；
6. 专业 GIS 编辑和吸附；
7. PlotJSON 标准和算法版本；
8. 标准军标可选集成；
9. 声明式自定义符号注册；
10. TypeScript、测试、性能基准和完整文档；
11. 可扩展到 React、Vue、协作和其他地图适配器。

## 8. 后续研究任务

- 为每个新 family 固定参考 commit SHA；
- 为每个符号建立 control-role 行为表；
- 记录 degenerate input 和 fallback 行为；
- 生成独立数学 fixtures 与视觉对比样例；
- 扩展许可证矩阵；
- 明确哪些算法独立推导、哪些可合法复用、哪些只做行为参考；
- 对 true lune、annular sector、geodesic small circle 单独建立未来研究项。

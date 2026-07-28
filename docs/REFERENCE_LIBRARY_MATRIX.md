# 参考库研究矩阵

## 1. 研究原则

PlotLibre 会系统研究其他标绘库，但不会把多个库直接拼接为运行时，也不会在许可证不清楚时复制源码。

研究分为四类：

1. 公开 API 和用户体验；
2. 符号目录与控制点语义；
3. 架构和状态机思想；
4. 公开数学描述和可验证行为。

任何源码复用都必须先完成许可证和来源审计，见 `ALGORITHM_POLICY.md`。

## 2. 重点参考项目

| 项目 | 主要研究内容 | PlotLibre 吸收方向 | 不直接照搬内容 |
|---|---|---|---|
| `ol-plot` | 传统箭头、控制点编辑、符号分类 | 箭头行为、参数结构、场景恢复 | OpenLayers Feature 继承和引擎耦合 |
| `maptalks.plot` | 丰富态势符号、旗帜、集结地 | 符号目录、传统名称和控制点约定 | 老旧构建和 Maptalks 对象模型 |
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

## 3. 官方参考地址

- MapLibre GL JS: <https://github.com/maplibre/maplibre-gl-js>
- Terra Draw: <https://github.com/JamesLMilner/terra-draw>
- MapLibre-Geoman: <https://github.com/geoman-io/maplibre-geoman>
- Mapbox GL Draw: <https://github.com/mapbox/mapbox-gl-draw>
- mil-sym-ts: <https://github.com/missioncommand/mil-sym-ts>
- ol-plot: <https://github.com/sakitam-fdd/ol-plot>
- maptalks.plot: <https://github.com/sakitam-fdd/maptalks.plot>
- maptalks.plotsymbol: <https://github.com/fuzhenn/maptalks.plotsymbol>

地址存在不代表允许复制。每次算法研究必须记录具体 revision 和许可证。

## 4. 对比维度

每个参考库都应按以下统一维度记录：

### 4.1 符号能力

- 普通几何；
- 直箭头；
- 攻击箭头；
- 燕尾箭头；
- 双箭头；
- 分队战斗；
- 曲线、扇形和集结地；
- 旗帜；
- MIL-STD/APP-6。

### 4.2 编辑能力

- 控制点编辑；
- 插入/删除点；
- 平移；
- 旋转；
- 缩放；
- 多选；
- 框选/套索；
- 吸附；
- 撤销重做；
- 触摸。

### 4.3 数据能力

- 是否保留原始控制点；
- 是否只存最终 GeoJSON；
- 是否保存算法参数；
- 是否支持版本迁移；
- 是否支持场景恢复；
- 是否支持标准格式。

### 4.4 工程能力

- TypeScript；
- ESM；
- tree shaking；
- 单元测试；
- 浏览器测试；
- 活跃维护；
- 文档质量；
- 许可证清晰度。

## 5. PlotLibre 的差异化定位

PlotLibre 的竞争优势不能只写成“MapLibre 也能画攻击箭头”。完整差异应为：

1. MapLibre 原生 source/layer 渲染；
2. 几何内核与地图引擎分离；
3. 控制点和参数作为语义源数据；
4. 完整传统态势标绘；
5. 专业 GIS 编辑和吸附；
6. PlotJSON 标准和算法版本；
7. 标准军标可选集成；
8. 声明式自定义符号注册；
9. TypeScript、测试、性能基准和完整文档；
10. 可扩展到 React、Vue、协作和其他地图适配器。

## 6. 后续研究任务

- 固定参考项目 commit SHA；
- 为每种 Arrow 建立控制点行为表；
- 记录退化输入行为；
- 生成视觉对比样例；
- 完成许可证矩阵；
- 明确哪些算法独立推导、哪些可合法复用、哪些只做行为参考。

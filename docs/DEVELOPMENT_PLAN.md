# PlotLibre 开发路线图

## 总体策略

采用“纵向切片优先”：每个阶段先完成一个从语义数据、算法、渲染、交互到测试的完整符号，再扩展符号数量。避免先复制几十种算法而没有统一编辑和数据模型。

## Milestone 001：工程和最小纵向切片

状态：已完成。

完成：

- TypeScript workspace；
- core/geometry/symbols/maplibre 四个包；
- PlotFeature、PlotDefinition、RenderBundle；
- Registry、Store、CommandHistory；
- PlotJSON 1.0；
- local projection；
- `arrow.straight`；
- MapLibre committed renderer；
- Node 测试；
- CI 和交接制度。

## Milestone 002：可交互直箭头

目标：在真实 MapLibre 页面中通过两次点击绘制直箭头，并可重新编辑两个控制点。

任务：

1. 增加 `plotlibre-draft` source 和 draft layers；
2. 定义 `MapEventAdapter`；
3. 建立通用 `DrawSession` 接口；
4. 实现 two-point drawing session；
5. pointer move 动态预览；
6. Enter/第二次点击完成；
7. Escape 取消；
8. handles source/layers；
9. 选择对象并拖动两个控制点；
10. 浏览器 playground；
11. Playwright 测试；
12. style reload 恢复。

验收：

- 用户能够绘制、取消、选择和编辑；
- 完成后只产生一条创建命令；
- 拖动一个控制点只产生一条替换命令；
- `setStyle()` 后对象恢复；
- Chromium E2E 通过。

## Milestone 003：箭头公共几何基础

目标：建立后续 Arrow 系列共享的中心线、平滑曲线、偏移线和头尾构造。

任务：

- polyline length；
- point along line；
- segment bearing；
- Catmull-Rom/Bezier 插值；
- variable-width offset；
- self-intersection 检测；
- ring winding；
- geodesic path；
- antimeridian normalization；
- property-based tests。

## Milestone 004：第一组传统箭头

符号：

- `arrow.fine`；
- `arrow.fine.tailed`；
- `arrow.assault-direction`；
- `arrow.curved`；
- `arrow.attack`；
- `arrow.attack.tailed`。

每种符号必须同时完成：

- definition；
- 参数文档；
- 几何测试；
- 视觉 fixture；
- 控制点 handles；
- 交互测试；
- PlotJSON round trip。

## Milestone 005：双箭头和复杂箭头

符号：

- `arrow.double`；
- `arrow.pincer`；
- `arrow.squad-combat`；
- `arrow.squad-combat.tailed`；
- route/corridor arrows。

重点解决：

- 控制点方向自动纠正；
- 左右分支拓扑；
- 中心连接平滑；
- 自交和退化情况。

## Milestone 006：专业选择和编辑

- 多选；
- 框选；
- 套索；
- 移动；
- 旋转；
- 缩放；
- 复制；
- 分组和锁定；
- 选择样式；
- 键盘快捷键；
- 触摸交互。

## Milestone 007：吸附与约束

- RBush 候选索引；
- 顶点/线段/中点/交点吸附；
- 网格、角度、方位、平行、垂直约束；
- 外部 MapLibre source/layer 吸附；
- guides 渲染；
- 性能测试。

## Milestone 008：曲线、区域、旗帜和注记

- arc、sector、lune；
- closed curve、gathering place；
- triangle/rectangle/curve/swallowtail flags；
- callout、leader label；
- image/SVG symbol；
- text layout。

## Milestone 009：IO 和工程管理

- 完整 PlotJSON JSON Schema；
- GeoJSON 导入导出；
- SVG/PNG 输出；
- 图层、分组、z-order；
- 锁定和可见性；
- 自动保存；
- 数据迁移；
- 大文件 streaming 评估。

## Milestone 010：MIL-STD/APP-6

- `@plotlibre/milstd`；
- `mil-sym-ts` 可选后端；
- SIDC 浏览和搜索；
- modifier panel；
- 单点军标；
- 多点控制措施；
- 标准版本选择；
- worker 和性能优化。

## Milestone 011：框架和协作

- React hooks/components；
- Vue composables/components；
- Web Component 评估；
- CRDT/协作扩展；
- 服务端持久化 adapter；
- 审计日志。

## Milestone 012：1.0 发布

必须具备：

- 稳定 API；
- 完整迁移指南；
- 50 种以上原生参数化符号；
- 完整编辑和吸附；
- MapLibre 5/6 浏览器矩阵；
- 文档站和 Playground；
- 性能基准；
- 无障碍工具栏；
- npm 发布流程；
- 许可证和第三方通知；
- 安全政策和贡献指南。

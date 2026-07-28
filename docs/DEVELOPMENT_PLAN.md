# PlotLibre 开发路线图

## 总体策略

采用“纵向切片优先”：每个阶段先完成一个从语义数据、算法、渲染、交互到测试的完整能力，再扩展符号数量。避免先复制几十种算法，而没有统一数据模型、编辑行为和测试体系。

所有里程碑必须同步：

- 源码；
- 自动化测试；
- 架构文档；
- README/API 示例；
- `docs/handover/LATEST.md`；
- 日期化不可变交接文件。

## Milestone 001：工程和最小纵向切片

状态：**已完成**。

完成：

- TypeScript workspace；
- core/geometry/symbols/maplibre 四个包；
- PlotFeature、PlotDefinition、RenderBundle；
- Registry、Store、CommandHistory；
- PlotJSON 1.0；
- local projection；
- `arrow.straight`；
- MapLibre committed renderer；
- 8 项 Node 测试；
- CI 和交接制度。

## Milestone 002：交互式直箭头内核

状态：**已完成**。

完成：

1. 新增 `@plotlibre/interaction`；
2. 定义 engine-independent `DrawSession`；
3. 实现 `TwoPointDrawSession`；
4. 增加 `plotlibre-draft` Source 和 draft layers；
5. 增加 `plotlibre-handles` Source 和 handle layer；
6. MapLibre click + pointermove 动态预览；
7. 第二次点击或 Enter 完成；
8. Escape 取消；
9. Backspace/Delete 重置起点；
10. 点击 committed fill/line 选择对象；
11. 拖动两个语义控制点；
12. 一次拖动只生成一个 ReplacePlotCommand；
13. undo/redo 后 handles 同步；
14. `style.load` 后恢复 Sources、Layers、数据、draft 和 handles；
15. 测试扩展至 15 项全部通过。

## Milestone 003：浏览器 Playground 与 GitHub Pages

状态：**代码完成，等待 PR CI 和合并部署**。

完成：

1. 创建 `apps/playground` workspace；
2. 使用 Vite 8 和 MapLibre GL JS 6 ESM；
3. 生产页面使用公开 demonstration style；
4. E2E 使用无网络空白 Style；
5. 工具栏支持绘制、取消、撤销、重做、删除、清空；
6. 内置南京三箭头示例；
7. 属性面板支持填充颜色、透明度、边线颜色和宽度；
8. PlotJSON 文件导入和下载导出；
9. 响应式桌面/移动端界面；
10. Vite `/PlotLibre/` project-site base 构建；
11. Playwright Chromium E2E；
12. 测试 Pages 子路径、绘制、撤销重做、样式、删除和 PlotJSON；
13. CI 增加 Node 20.19/22 构建矩阵和 browser job；
14. GitHub Pages 官方 artifact/deploy workflow；
15. 新增 `docs/PLAYGROUND.md`。

合并后的首次发布要求：

- 仓库 `Settings → Pages → Build and deployment → Source` 选择 `GitHub Actions`；
- 检查 Pages workflow 成功；
- 验证 `https://hujinghaoabcd.github.io/PlotLibre/`；
- 若 Pages 环境已有保护规则，批准首次部署。

## Milestone 004：箭头公共几何基础

状态：**下一步**。

目标：建立后续 Arrow 系列共享的中心线、平滑曲线、偏移线、头尾构造和退化输入策略。

任务：

- polyline length；
- cumulative distances；
- point/tangent along line；
- segment bearing；
- Catmull-Rom/Bezier 插值；
- variable-width offset；
- left/right side generation；
- ring winding normalization；
- self-intersection 检测；
- duplicate/near-coincident point cleaning；
- geodesic path abstraction；
- antimeridian normalization；
- high-latitude policy；
- property-based tests；
- geometry golden fixtures；
- worker-ready pure functions；
- provenance records for every mathematical source。

验收：

- 公共算法不依赖具体箭头类型和 MapLibre；
- 随机输入不产生 NaN/Infinity；
- 所有 Polygon ring 闭合且方向一致；
- 退化输入具有明确错误或降级策略；
- 为 Milestone 005 的六类箭头提供足够构件。

## Milestone 005：第一组传统箭头

符号：

- `arrow.fine`；
- `arrow.fine.tailed`；
- `arrow.assault-direction`；
- `arrow.curved`；
- `arrow.attack`；
- `arrow.attack.tailed`。

每种符号必须同时完成：

- definition；
- 控制点语义；
- 参数文档和单位；
- 几何测试；
- 视觉 fixture；
- 多点 DrawSession；
- 控制点 handles；
- Playground catalog 入口；
- 交互 E2E；
- PlotJSON round trip；
- provenance 记录。

## Milestone 006：双箭头和复杂箭头

符号：

- `arrow.double`；
- `arrow.pincer`；
- `arrow.squad-combat`；
- `arrow.squad-combat.tailed`；
- `arrow.route`；
- `arrow.corridor`；
- `arrow.multi-head`。

重点解决：

- 控制点方向自动纠正；
- 左右分支拓扑；
- 中心连接平滑；
- 自交和退化情况；
- 控制点插入/删除；
- 参数控制柄。

## Milestone 007：专业选择和编辑

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
- 触摸交互；
- 多对象事务。

## Milestone 008：吸附与约束

- RBush 候选索引；
- 顶点/线段/中点/交点吸附；
- 网格、角度、方位、平行、垂直约束；
- 外部 MapLibre source/layer 吸附；
- guides Source 和图层；
- 临时禁用吸附；
- 优先级和冲突处理；
- 性能测试。

## Milestone 009：曲线、区域、旗帜和注记

- arc、sector、lune；
- closed curve、gathering place；
- triangle/rectangle/curve/swallowtail flags；
- callout、leader label；
- image/SVG symbol；
- text layout；
- 区域控制措施。

## Milestone 010：IO 和工程管理

- 完整 PlotJSON JSON Schema；
- definition migration；
- GeoJSON 导入导出；
- SVG/PNG 输出；
- 图层、分组、z-order；
- 锁定和可见性；
- 自动保存；
- 大文件 streaming 评估；
- 项目模板。

## Milestone 011：MIL-STD/APP-6

- `@plotlibre/milstd`；
- `mil-sym-ts` 可选后端；
- SIDC 浏览和搜索；
- modifier panel；
- 单点军标；
- 多点控制措施；
- 标准版本选择；
- worker 和性能优化；
- 标准兼容性 fixture。

## Milestone 012：框架和协作

- React hooks/components；
- Vue composables/components；
- Web Component 评估；
- CRDT/协作扩展；
- 服务端持久化 adapter；
- 审计日志；
- 权限和锁定策略。

## Milestone 013：1.0 发布

必须具备：

- 稳定 API；
- 完整迁移指南；
- 50 种以上原生参数化符号；
- 完整编辑和吸附；
- MapLibre 5/6 浏览器矩阵；
- 文档站、Playground 和 Symbol Gallery；
- 性能基准；
- 无障碍工具栏；
- npm 发布流程；
- 许可证和第三方通知；
- 安全政策和贡献指南；
- 长期维护和版本支持政策。

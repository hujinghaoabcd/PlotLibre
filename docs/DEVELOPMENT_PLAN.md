# PlotLibre 开发路线图

## 总体策略

采用“纵向切片优先”：每个阶段先完成一个从语义数据、算法、渲染、交互到测试的完整能力，再扩展符号数量。避免先复制几十种算法，而没有统一数据模型、编辑行为和测试体系。

所有里程碑必须同步：

- 源码；
- 自动化测试；
- 架构或算法文档；
- README/API 示例；
- Playground 可视化入口；
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

状态：**已完成并合并**。

完成：

- `apps/playground` Vite workspace；
- MapLibre GL JS 6 ESM 与 WebGL2；
- 本地 bootstrap style；
- 可选在线 raster 底图；
- `?basemap=none` 离线模式；
- 绘制、取消、撤销、重做、删除和清空；
- 南京示例；
- 样式编辑；
- PlotJSON 文件导入和下载导出；
- 响应式桌面/移动端界面；
- `/PlotLibre/` project-site base；
- Playwright Chromium E2E；
- Node 20.19/22 CI 矩阵；
- GitHub Pages artifact/deploy workflow；
- 在线底图不能阻塞标绘初始化；
- MapLibre Worker entry/shared 模块显式打包；
- Worker MIME、Source Feature 和实际 rendered-feature 测试。

关键合并提交：

```text
a68cdd659861c6ee3d5523baca637958e8730def
c00f589078c8ae5ac2d01bc02441619004a413a6
```

## Milestone 004：箭头公共几何基础

状态：**已完成并通过 PR #6 集成到最新主线**。

合并提交：

```text
06e392aaec42bd89ee4856244be49df7a9d934ba
```

完成：

- 有限 `Vec2` 运算、点积、叉积、距离和法向量；
- `cleanPolyline()`；
- segment/cumulative/total length；
- 沿距离和比例采样；
- 按数量重采样；
- Cubic Bezier；
- Catmull-Rom/Hermite；
- variable-width offset；
- miter join 与 `miterLimit`；
- ring 闭合、signed area 和 winding；
- winding normalization；
- segment/ring self-intersection；
- Haversine distance；
- initial bearing；
- destination point；
- geodesic path；
- longitude normalization；
- antimeridian detection 与 unwrap；
- local/geodesic coordinate-mode analysis；
- 高纬度和大范围默认策略；
- 共享 `buildArrowHead()`；
- `arrow.straight` 重构；
- 精确保留语义箭尖；
- 黄金样例、退化测试和 100 组固定种子性质测试；
- `docs/GEOMETRY_FOUNDATION.md`；
- clean-room provenance。

验收：

- 27 项 Node 测试通过；
- Node 20.19/22 通过；
- Chromium Worker 与真实渲染回归通过；
- 公共算法不依赖 MapLibre、DOM、Store 或 UI。

## Milestone 005A：`arrow.fine` 完整纵向切片

状态：**实现与首轮 CI 已完成，等待最终交接和合并**。

目标：只完成一个新的传统箭头，从几何到 GitHub Pages 形成完整可复用模板。

完成：

- `FineArrowParameters` 与解析校验；
- `buildFineArrowRing()`；
- 尾中心与箭尖两点语义；
- 细身渐缩轮廓；
- 共享 `buildArrowHead()`；
- 最短反经线经差；
- 精确保留语义箭尖；
- 独立 `arrow.fine` PlotDefinition；
- built-in catalog 注册；
- fill、outline 和 hit-area；
- PlotJSON round trip；
- 赤道方向黄金坐标；
- 参数、退化、有限性和闭合测试；
- 默认细箭头比默认直箭头更窄的契约测试；
- 复用 `TwoPointDrawSession`；
- 复用两个语义控制点 handles；
- Playground 符号选择器；
- 直箭头/细箭头混合南京示例；
- Chromium 实际 `arrow.fine` rendered-feature 测试；
- `docs/algorithms/arrow-fine.md`；
- workspace `0.0.5`。

首轮 CI：

```text
Run ID: 30387914395
Node tests: 33 passed
validate 20.19: success
validate 22: success
browser: success
```

## Milestone 005B：`arrow.fine.tailed`

状态：**下一步**。

目标：在保持两点语义和细箭头主体契约的基础上增加参数化燕尾，不复制 `arrow.fine` 整个实现。

任务：

1. 提取可复用的两点窄箭身构造结果；
2. 定义 `tailNotchRatio` 或等价的燕尾深度参数；
3. 实现 `buildTailedFineArrowRing()`；
4. 保证尾缺口不会越过箭身或造成自交；
5. 定义 `arrow.fine.tailed`；
6. 参数和退化测试；
7. 黄金 fixture；
8. PlotJSON round trip；
9. Playground selector 入口；
10. 两点绘制和 handles 回归；
11. Chromium 实际渲染测试；
12. 算法来源与交接文件。

## Milestone 005C：`arrow.assault-direction`

- 明确与 `arrow.fine` 的视觉和语义差异；
- 独立参数契约；
- geometry、definition、fixture、PlotJSON、Playground 和 E2E。

## Milestone 005D：`arrow.curved`

- 多点控制语义；
- centerline 清洗和曲线采样；
- variable-width offset；
- 多点 DrawSession；
- 控制点插入/删除策略；
- 自交和退化处理。

## Milestone 005E：`arrow.attack`

- 多点攻击方向中心线；
- 参数化头部和箭身；
- 曲线与偏移复用；
- 多点完成规则；
- Golden、property 和 browser tests。

## Milestone 005F：`arrow.attack.tailed`

- 在 `arrow.attack` 公共构造上增加尾部语义；
- 不复制完整算法；
- 明确燕尾与平尾迁移兼容。

每种新符号必须同时完成：

- definition；
- 控制点语义；
- 参数文档和单位；
- 几何测试；
- 黄金 fixture；
- DrawSession；
- handles；
- Playground catalog 入口；
- 交互 E2E；
- PlotJSON round trip；
- provenance；
- 不可变交接文件。

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

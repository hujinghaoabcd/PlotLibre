# PlotLibre 开发路线图

## 总体策略

采用“纵向切片优先”：每个阶段完成一个从语义数据、算法、渲染、交互、Playground 到浏览器测试的完整能力，再扩展符号数量。

所有里程碑必须同步：

- 源码；
- 自动化测试；
- 算法或架构文档；
- README/API 示例；
- Playground 可视化入口；
- `docs/handover/LATEST.md`；
- 日期化不可变交接文件。

## Milestone 001：工程和最小纵向切片

状态：**已完成**。

完成：TypeScript workspace、Core/Geometry/Symbols/MapLibre、Registry、Store、History、PlotJSON、local projection、`arrow.straight`、committed renderer、CI 和交接制度。

## Milestone 002：交互式直箭头内核

状态：**已完成**。

完成：`@plotlibre/interaction`、`TwoPointDrawSession`、draft/handles Sources、动态预览、Enter/Escape、选择、两个语义控制点编辑、事务化拖动、undo/redo 和 style reload 恢复。

## Milestone 003：Playground 与 GitHub Pages

状态：**已完成并合并**。

完成：

- Vite/MapLibre GL JS 6 Playground；
- 本地 bootstrap style 与可选 raster 底图；
- `?basemap=none`；
- PlotJSON 文件导入导出；
- Node 20.19/22 CI；
- Playwright Chromium；
- GitHub Pages workflow；
- `/PlotLibre/` base；
- Worker entry/shared 模块显式打包；
- committed Source 和实际 rendered-feature 测试。

关键提交：

```text
a68cdd659861c6ee3d5523baca637958e8730def
c00f589078c8ae5ac2d01bc02441619004a413a6
```

## Milestone 004：箭头公共几何基础

状态：**已完成并合并**。

合并提交：

```text
06e392aaec42bd89ee4856244be49df7a9d934ba
```

完成：

- `Vec2`；
- polyline 清洗、测量、采样和重采样；
- Bezier 与 Catmull-Rom/Hermite；
- variable-width offset 与 miter limit；
- ring closure、winding、自交检测；
- Haversine、bearing、destination、geodesic path；
- longitude normalization、antimeridian、local/geodesic policy；
- 共享 `buildArrowHead()`；
- `arrow.straight` 重构；
- 黄金、退化和固定种子性质测试；
- clean-room provenance。

验收：27 项 Node 测试、Node 20.19/22、Pages 和 Chromium 全部通过。

## Milestone 005A：`arrow.fine`

状态：**已完成并合并**。

合并提交：

```text
c738d72b0ccf49f3487697791083ba0d15286a75
```

完成：

- 独立 `FineArrowParameters`；
- `buildFineArrowRing()`；
- 细身渐缩轮廓；
- 两点语义；
- `arrow.fine` Definition；
- PlotJSON round trip；
- 黄金坐标与参数测试；
- Playground selector；
- 南京示例；
- Chromium 实际 `arrow.fine` 渲染测试；
- `docs/algorithms/arrow-fine.md`；
- workspace `0.0.5`。

最终 CI：

```text
30389045339
33 Node tests
validate 20.19: success
validate 22: success
browser: success
```

## Milestone 005B：`arrow.fine.tailed`

状态：**实现与首轮 CI 已完成，等待最终交接和合并**。

目标：在不复制 `arrow.fine` 完整生成器的前提下增加参数化燕尾。

完成：

- 内部 `FineArrowFrame`；
- 平尾细箭头改为消费共享 frame；
- 既有 `arrow.fine` 黄金契约保持不变；
- `TailedFineArrowParameters`；
- `tailNotchRatio = 0.9`；
- `buildTailedFineArrowRing()`；
- 9 点闭合 Polygon；
- 缺口深度、颈部位置和自交验证；
- `arrow.fine.tailed` Definition；
- built-in catalog 注册；
- fill、outline、hit-area；
- PlotJSON round trip；
- 黄金 fixture；
- 参数和过深缺口测试；
- 简单 ring 验证；
- Playground 第三个 selector option；
- 直箭头/细箭头/燕尾细箭头混合南京示例；
- TwoPointDrawSession 和两个 handles 复用；
- Chromium 实际 `arrow.fine.tailed` rendered-feature；
- `docs/algorithms/arrow-fine-tailed.md`；
- workspace `0.0.6`。

首轮 CI：

```text
Run ID: 30389925716
validate 20.19: success
validate 22: success
browser: success
```

## Milestone 005C：`arrow.assault-direction`

状态：**下一步**。

先决设计问题：

1. 明确它与 `arrow.fine` 的视觉、语义和使用场景差异；
2. 决定是否仍为两点符号；
3. 定义独立宽度、头部和尾部参数；
4. 避免仅用另一组默认值制造伪新类型；
5. 评估是否需要新的 body strategy，而不是复制 fine frame。

任务：

- `docs/algorithms/arrow-assault-direction.md`；
- geometry pure function；
- Definition；
- 参数和退化策略；
- 黄金 fixture；
- PlotJSON round trip；
- DrawSession/handles；
- selector 和示例；
- Chromium rendered-feature；
- 交接文件。

## Milestone 005D：`arrow.curved`

- 多点控制语义；
- centerline 清洗和曲线采样；
- variable-width offset；
- 多点 DrawSession；
- 控制点插入/删除；
- 自交和退化策略。

## Milestone 005E：`arrow.attack`

- 多点攻击方向中心线；
- 参数化头部和箭身；
- 曲线与偏移复用；
- 多点完成规则；
- Golden、property 和 browser tests。

## Milestone 005F：`arrow.attack.tailed`

- 复用攻击箭头公共 frame/body；
- 增加尾部 strategy；
- 明确平尾/燕尾迁移兼容。

每种新符号必须同时完成：

- definition；
- 控制点语义；
- 参数文档与单位；
- 几何和黄金测试；
- DrawSession 与 handles；
- Playground 入口；
- Chromium 实际渲染；
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

重点：方向自动纠正、左右分支拓扑、中心连接平滑、自交、控制点增删和参数 handles。

## Milestone 007：专业选择和编辑

- 多选、框选、套索；
- 移动、旋转、缩放；
- 复制、分组、锁定；
- 选择样式；
- 键盘、触摸和多对象事务。

## Milestone 008：吸附与约束

- RBush；
- 顶点/线段/中点/交点吸附；
- 网格、角度、方位、平行、垂直；
- 外部 Source 吸附；
- guides；
- 优先级和性能测试。

## Milestone 009：曲线、区域、旗帜和注记

- arc、sector、lune；
- closed curve、gathering place；
- flags；
- callout、leader label；
- image/SVG；
- text layout；
- 区域控制措施。

## Milestone 010：IO 和工程管理

- 完整 PlotJSON Schema 和 migrations；
- GeoJSON；
- SVG/PNG；
- 图层、分组、z-order；
- 锁定、可见性、自动保存；
- 大文件与项目模板。

## Milestone 011：MIL-STD/APP-6

- `@plotlibre/milstd`；
- `mil-sym-ts` 可选后端；
- SIDC 搜索；
- modifier panel；
- 单点和多点控制措施；
- 标准版本、worker、性能和兼容性 fixture。

## Milestone 012：框架和协作

- React、Vue；
- Web Component 评估；
- CRDT；
- 持久化 adapter；
- 审计日志；
- 权限和锁定。

## Milestone 013：1.0 发布

必须具备：

- 稳定 API 和迁移指南；
- 50 种以上原生参数化符号；
- 完整编辑和吸附；
- MapLibre 5/6 浏览器矩阵；
- 文档站、Playground 和 Symbol Gallery；
- 性能基准；
- 无障碍；
- npm 发布流程；
- 许可证和第三方通知；
- 安全、贡献和长期支持政策。

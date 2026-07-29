# PlotLibre Development Handover — Milestone 006F Route and Corridor Draft

日期：2026-07-30  
仓库：`hujinghaoabcd/PlotLibre`  
分支：`agent/route-corridor-symbol-group`  
状态：核心几何、Definition、Registry 与 Node tests 已提交；Playground、浏览器矩阵、正式文档和最终交接待同一 PR 完成

## Completed in this milestone

- 新增共享 `PathRibbonFrame` 纯几何基础；
- 新增 `arrow.route` 有方向路径箭头；
- 新增 `arrow.corridor` 无方向平头走廊；
- 两者共享投影、采样、宽度派生和 offset/miter，但保持独立闭合结构；
- 新增公共 Definition、Registry 和 PlotJSON 覆盖；
- 新增 10 个 Node tests；
- 钳形箭头细节加固仍冻结。

## Next tasks

1. 运行首次 CI 并修正类型或拓扑问题；
2. 接入 Playground 两个选项和南京示例；
3. 扩展 12 类型真实渲染矩阵；
4. 更新 workspace 版本、README、AGENTS、路线图和 LATEST；
5. 全绿后在同一 PR 合并。

## Risks and decisions

- route/corridor 是一组相关符号，不允许复制整套生成器；
- route 末端必须保留 exact tip；
- corridor 不得通过隐藏箭头头部实现；
- 所有 sampled/offset/head vertices 都是派生数据；
- 对急转和过宽路径继续严格拒绝自相交，不为显示而删除拓扑校验。

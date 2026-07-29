# PlotLibre Development Handover — Milestones 006F–006G Route and Corridor

日期：2026-07-30  
仓库：`hujinghaoabcd/PlotLibre`  
分支：`agent/route-corridor-symbol-group`  
PR：`#28 Add route and corridor symbol group`  
Workspace：`0.0.17`  
Definitions：`arrow.route@1.0.0`、`arrow.corridor@1.0.0`  
状态：两个相关符号的完整实现与兼容性修复完成；145 Node / 20 Chromium 全绿；等待本交接文档进入最终 docs-inclusive CI

## Current state

```text
PathRibbonFrame
├── arrow.route
│   ├── directed centre path
│   ├── derived constant-width shaft
│   ├── derived neck plane
│   └── exact authored terminal tip
└── arrow.corridor
    ├── undirected centre path
    ├── derived constant-width ribbon
    ├── flat start cap
    └── flat end cap
```

两个符号均保存用户创作的中心路径。局部投影、Catmull–Rom 采样、路径长度、左右 offset、宽度、neck、head 和 Polygon vertices 均为派生数据，不进入 Store、handles、History 或 PlotJSON。

权威记录：

```text
docs/design/route-corridor-group.md
docs/algorithms/arrow-route-corridor.md
docs/handover/2026-07-30-milestone-006f-006g-route-corridor.md
PR #28
```

## Completed in this milestone

- 新增共享纯几何 `PathRibbonFrame`；
- 新增 `arrow.route@1.0.0`；
- 新增 `arrow.corridor@1.0.0`；
- route 和 corridor 均支持两点直线形态及可选中间路径点；
- route 使用派生 neck plane 和 exact-tip arrow head；
- corridor 使用独立无方向平头闭合，不以隐藏箭头模拟；
- 两个 Definition 均提供独立参数、验证代码和 RenderBundle；
- Registry 公共符号数升至 12；
- PlotJSON 仅保存 authored centre-path controls；
- 新增 10 个 Node tests，基线升至 145；
- 新增 route/corridor Playground selector、中文提示和南京示例；
- 十二类型 visibility matrix 验证实际 draft/committed MapLibre rendering；
- 新增 path-symbol browser test，Chromium 基线升至 20；
- workspace/demo 升至 `0.0.17`；
- 生产默认公开 12 个符号；扩展 E2E 使用 `?e2e=1&squad=1&paths=1`；
- 点击“加载示例”生成完整 12 类示例；
- 页面初始化的旧九示例兼容基线保持不变；
- README、AGENTS、DEVELOPMENT_PLAN、算法与设计记录已更新；
- 项目策略正式允许 2–3 个真实共享数学内核的相关符号成组开发；
- 钳形箭头细节加固继续冻结。

## Validation

```text
Core/Playground implementation CI: 30478662756
Compatibility-fix CI:             30479120532
Node 20.19:                        success
Node 22:                           success
Node tests:                        145 passed / 0 failed
Chromium tests:                    20 passed / 0 failed
Typecheck:                         success
Package build:                     success
Playground typecheck/build:        success
Handover contract:                 success
Final docs-inclusive CI:           pending
```

首次浏览器运行发现旧测试预期页面初始化为九示例，而生产自动扩展为十二示例。修复没有改变新几何：生产仍提供十二个 selector，点击“加载示例”后得到完整十二类；默认初始化恢复旧九示例。修复后 20 个 Chromium tests 全部通过。

## Next tasks

1. 完成本交接与 LATEST 的 docs-inclusive CI；
2. 检查 PR #28 unresolved review threads；
3. 更新 PR #28 最终描述；
4. 标记 Ready；
5. squash merge 并确认 merge SHA；
6. compare merge SHA 与 `main` identical；
7. 核对 Pages 顶部 `v0.0.17 demo` 和两个新 selector；
8. 下一组进入 multi-head path extensions；
9. 在实现前冻结该组的公共标识符、分叉点和目标点语义；
10. 不返回 pincer 细节加固。

## Risks and decisions

- 相关符号成组开发只适用于共享真实数学基础的 2–3 个符号；
- route 与 corridor 共享 `PathRibbonFrame`，但闭合结构独立；
- corridor 不能用隐藏、零宽或退化 head 实现；
- route 的最后 authored control 必须是 exact rendered tip；
- `widthPathRatio` 是路径长度比例，因此极长或急转路径可能触发最大宽度或 simple-ring 拒绝；
- 自相交校验不为提高显示率而删除；
- 默认页面初始化保持九示例是兼容策略，不代表公共符号仍只有九类；
- 完整十二类示例通过显式“加载示例”动作生成；
- 当前工具不能可靠直接确认 GitHub Pages 缓存刷新；
- packages 仍为 `UNLICENSED`。

Continuation：继续 PR #28。最终文档 CI 全绿后检查 review threads、标记 Ready、squash merge，并确认 merge SHA 与 main identical。下一相关符号组为 multi-head path extensions，具体公共类型在实现前冻结。

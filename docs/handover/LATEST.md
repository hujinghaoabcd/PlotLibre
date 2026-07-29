# PlotLibre Development Handover — Milestone 005F Finalization

日期：2026-07-29  
仓库：`hujinghaoabcd/PlotLibre`  
目标分支：`main`  
开发分支：`agent/attack-arrow-vertical-slice`  
PR：`#12 Add attack arrow vertical slice`  
Workspace：`0.0.10`

## Current state

Milestone 005F 已完成 `arrow.attack` 的完整代码、几何、交互、Playground、浏览器验证、算法记录和不可变详细交接。

详细记录：

```text
docs/handover/2026-07-29-milestone-005f-attack-arrow.md
```

最终权威同步状态：

```text
Head before final handover sync: c3d229ef0507b56dd51c6225c396aedc309ce547
Run ID: 30413156622
Node 20.19: success
Node 22: success
Node tests: 78 passed
Chromium: 12 passed
Pages build: success
handover contract: success
```

PR #12 在最终文档同步 CI 再次全绿后即可标记 Ready 并合并。

## Completed in this milestone

### Public symbol

```text
arrow.attack
```

语义控制点：

```text
0 + 1   = exact tail edges
2..n-2  = attack-spine controls
n-1     = exact objective/tip
```

已完成：

- 独立于 `arrow.curved` 的攻击箭头语义；
- exact semantic tail width；
- reusable `AttackArrowFrame`；
- Catmull–Rom/Hermite spine；
- broad body + body bulge + neck narrowing；
- terminal-tangent head；
- exact tail vertices and exact tip；
- finite/closed/CCW/simple-ring validation；
- explicit self-intersection rejection；
- PlotDefinition、Registry、RenderBundle 和 PlotJSON；
- clean-room provenance。

### Interaction and transaction safety

已完成：

- Definition-driven `MultiPointDrawSession`；
- tail-edge/spine draft；
- double-click/Enter completion；
- Backspace/Delete/Escape；
- all semantic handles；
- tail/spine drag；
- one valid drag = one `ReplacePlotCommand`；
- undo restore；
- invalid geometry preview rejected before Store mutation；
- Definition-level renderability validation；
- deferred double-click zoom restoration，防止完成时相机 2× 跳变。

### Playground

已完成：

- 第六个 selector option；
- 六类南京示例；
- 攻击箭头四点真实绘制；
- committed Source 和 actual rendered-feature 检查；
- tail-edge edit/history/undo 浏览器回归；
- Worker 和 `/PlotLibre/` Pages build 回归。

### Real issues fixed

1. 测试尾缘与进攻方向近平行，正确几何验证拒绝 draft；
2. `dblclick` 事件栈内过早恢复 zoom 导致地图默认处理器缩放；
3. 尾缘拖动可生成自交 Polygon；
4. 仅轻量验证会让无效 preview 在渲染阶段才失败；
5. Store 更新后 listener 抛错可能导致 History 未入栈；
6. 完整 Definition 几何预检将失败前移到语义写入之前。

## Validation

最终代码与文档同步前的权威绿色运行：

```text
30413156622
```

矩阵：

- Node.js 20.19：success；
- Node.js 22：success；
- TypeScript/workspace：success；
- 78 Node tests：success；
- Playground typecheck/build：success；
- handover contract：success；
- 12 Chromium tests：success；
- six-symbol committed/rendered Source：success；
- attack draft/double-click/camera stability：success；
- tail semantic handle edit/history/undo：success。

## Architectural decisions

1. 攻击箭头的前两个控制点是精确尾缘，距离定义尾宽。
2. 采样点、offset 顶点和 Polygon 顶点均为派生数据。
3. `AttackArrowFrame` 是平尾与燕尾攻击箭头的共享边界。
4. topology-sensitive Definition 必须验证完整可生成性。
5. invalid previews 不得进入 Store 或 History。
6. double-click zoom 只在原生事件结束后恢复。
7. 不放宽 simple-ring 或 tail-cross-direction 验证来迁就测试。

## Known limitations

- 最小点数前无独立 centerline guide；
- UI 尚未显示详细 validation issue；
- 已提交图形暂不支持插入/删除 spine controls；
- 无 touch completion、snapping 或 constraints；
- 无参数 handles；
- 浏览器矩阵仅 Chromium；
- Core Store listener exception 的通用事务回滚尚未重构。

## Next tasks

1. 等待最终文档同步 CI 全绿；
2. 将 PR #12 标记 Ready；
3. 合并 PR #12 到 `main`；
4. 验证 `main` CI 和 GitHub Pages 六符号部署；
5. 从最新 `main` 创建 Milestone 005G 分支；
6. 实现 `arrow.attack.tailed`；
7. 复用 `AttackArrowFrame`，只新增独立燕尾 closing strategy；
8. 完成参数、golden、Definition、PlotJSON、Playground、Chromium 和交接；
9. 不并行开发 double、pincer、route 或 corridor。

## Risks and decisions

### Tailed attack structure

`arrow.attack.tailed` 必须保留两个精确尾缘控制点，并在共享 frame 上增加 inward swallowtail notch。它不能是平尾攻击箭头的默认参数别名，也不能复制整个 generator。

### Topology

燕尾 notch 可能与 body 自交。必须限制 notch 参数并继续执行 simple-ring validation。

### Transaction scope

005G 不主动进行大规模 Store/History 重构；符号通过 Definition renderability validation 保证写入前有效。通用事务原子性另设独立阶段评估。

### Deployment

只有 `main` Pages workflow 成功且在线页面实际出现 `arrow.attack` 后，才宣布六符号部署完成。

## Continuation instructions

后续开发者或对话应：

1. 阅读 `AGENTS.md`；
2. 阅读 `docs/algorithms/arrow-attack.md`；
3. 阅读 005F 详细交接；
4. 确认 PR #12、主线 CI 和 Pages；
5. 从最新 `main` 开始 005G；
6. 保留 78 Node 和 12 Chromium 回归；
7. 使用 `AttackArrowFrame`，禁止复制平尾 generator；
8. 完成后新增 005G 不可变 handover 并更新本文件。

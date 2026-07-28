# PlotLibre Development Handover — Milestone 005E Finalization

日期：2026-07-29  
仓库：`hujinghaoabcd/PlotLibre`  
目标分支：`main`  
开发分支：`agent/curved-arrow-vertical-slice`  
PR：`#11 Add curved arrow vertical slice`  
最终分支提交：`610605ad0bbea7be90ed469487590fb32d470169`  
Workspace：`0.0.9`

## Current state

Milestone 005E 已完成全部代码、几何修复、浏览器集成、对外文档、不可变详细交接和最终同步验证。

当前状态：**PR #11 可以标记 Ready 并合并。**

详细实现记录：

```text
docs/handover/2026-07-29-milestone-005e-curved-arrow.md
```

最终权威 CI：

```text
Run ID: 30398656193
validate Node 20.19: success
validate Node 22: success
Node tests: 65 passed
Playwright: 13 passed
Pages build: success
handover contract: success
```

## Completed in this milestone

### Public symbol

```text
arrow.curved
```

已完成：

- 3–64 个语义控制点；
- tail、path controls、exact tip 语义；
- Catmull–Rom/Hermite centerline；
- cumulative arc-length width model；
- variable-width tapered shaft；
- terminal-tangent head；
- exact semantic tip restoration；
- closed/finite/CCW/simple-ring validation；
- explicit self-intersection rejection；
- 56-coordinate golden fixture；
- PlotDefinition、Registry、RenderBundle 和 PlotJSON；
- clean-room algorithm record。

### Multi-point MapLibre interaction

已完成：

- Definition-driven Session selection；
- `dblclick → DrawSession.doubleClick()`；
- double-click default suppression；
- zoom disable/restore；
- third-candidate draft；
- Enter、Escape、Backspace/Delete；
- all semantic handles；
- interior handle drag；
- one ReplacePlotCommand；
- undo restore。

### Playground

已完成：

- 第五个 selector option；
- 五类南京示例；
- 多点操作说明；
- 曲线箭头实际绘制和渲染；
- 中间控制点真实拖动；
- Worker 与 Pages 回归。

### Real issues fixed

1. head trim 与 neck center 同时存在导致短反向折线和自交；
2. 过紧 S 形路径应明确拒绝而非静默输出；
3. E2E 初始轨迹过紧，无法生成合法 draft；
4. readonly PlotLibre Position 与 MapLibre mutable tuple 类型边界；
5. `querySourceFeatures()` tile duplicate 导致 raw handle count 假失败。

### Documentation

已同步：

```text
README.md
AGENTS.md
docs/INTERACTION_MODEL.md
docs/PLAYGROUND.md
docs/DEVELOPMENT_PLAN.md
docs/algorithms/arrow-curved.md
docs/handover/2026-07-29-milestone-005e-curved-arrow.md
docs/handover/2026-07-29-milestone-005e-curved-arrow-final.md
docs/handover/LATEST.md
```

## Validation

完整绿色运行：

```text
30398030416  first complete green code/browser run
30398656193  final documentation and handover synchronization
```

最终矩阵：

- Node.js 20.19：success；
- Node.js 22：success；
- TypeScript/workspace：success；
- 65 Node tests：success；
- Playground typecheck：success；
- `/PlotLibre/` build：success；
- handover contract：success；
- 13 Chromium tests：success；
- Worker entry/shared：success；
- five-symbol committed/rendered Source：success；
- curved draft/double-click/zoom：success；
- interior semantic handle edit/undo：success。

## Architectural decisions

1. 曲线控制点是 canonical semantic source，采样点与 Polygon 顶点是派生数据。
2. width/head placement 基于累计弧长和末端切向。
3. 自交输出严格拒绝，不移除 topology safety。
4. Session 类型来自 Definition point constraints，不来自 symbol ID。
5. 多点绘制期间管理 double-click zoom 生命周期。
6. 每个 semantic path control 都可编辑。
7. MapLibre Source 查询结果按 semantic identity 去重，而非 raw Feature count。

## Known limitations

- 第三个候选点前没有可见 centerline guide；
- UI 尚未显示详细 self-intersection validation message；
- 已提交 Feature 暂不支持插入或删除控制点；
- 无 touch-specific completion；
- 无 snapping/constraints；
- local projection 不适合超大跨国箭头；
- 无 tension/width/head parameter handles；
- 浏览器矩阵目前只有 Chromium。

## Next tasks

1. 将 PR #11 标记 Ready；
2. 合并 PR #11 到 `main`；
3. 验证 GitHub Pages 五符号部署；
4. 从最新 `main` 创建新分支；
5. 开始 Milestone 005F `arrow.attack`；
6. 先写 clean-room provenance 和独立结构设计；
7. 不并行实现 tailed attack、double、pincer、route 或 corridor。

## Risks and decisions

### Attack-arrow component sharing

`arrow.attack` 可以复用 curve sampling、offset、head components 和 MultiPointDrawSession，但不能成为 `arrow.curved` 的参数别名。若抽取共享 multi-point frame，必须保持 `arrow.curved` 的 golden contract 不变。

### Self-intersection UX

Geometry 保持严格拒绝。下一阶段可改善可见错误反馈，但不能用 UI 容错掩盖无效 Polygon。

### Public deployment

合并会触发 Pages 重建。只有部署完成并实际访问后，才应宣布 `0.0.9` Playground 已公开更新。

## Continuation instructions

新的开发者或对话应：

1. 阅读 `AGENTS.md`；
2. 阅读 `docs/algorithms/arrow-curved.md`；
3. 阅读详细 Milestone 005E 交接；
4. 确认 PR #11 合并和 Pages 状态；
5. 从最新 `main` 开始 attack arrow；
6. 保留全部 65 Node 和 13 Chromium 回归；
7. 完成后追加新的不可变 handover 并更新 `LATEST.md`。

# PlotLibre Development Handover — Milestone 005F Attack Arrow

日期：2026-07-29  
仓库：`hujinghaoabcd/PlotLibre`  
目标分支：`main`  
开发分支：`agent/attack-arrow-vertical-slice`  
PR：`#12 Add attack arrow vertical slice`  
Workspace：`0.0.10`

## Current state

Milestone 005F 已完成 `arrow.attack` 的完整单符号纵向切片：语义模型、纯几何、Definition、PlotJSON、MapLibre 多点绘制与编辑、Playground、真实 Chromium 测试、算法来源记录和文档均已完成。

最终权威同步提交：

```text
c3d229ef0507b56dd51c6225c396aedc309ce547
```

最终权威 CI：

```text
Run ID: 30413156622
validate Node 20.19: success
validate Node 22: success
Node tests: 78 passed
Playwright Chromium: 12 passed
Pages build: success
handover contract: success
```

PR #12 当前满足 Ready 和合并条件。合并后应验证 `main` CI 与 GitHub Pages 六符号部署。

## Completed in this milestone

### Public symbol and semantic model

新增：

```text
arrow.attack
```

控制点语义：

```text
controlPoints[0]       = exact tail edge A
controlPoints[1]       = exact tail edge B
controlPoints[2..n-2]  = attack-spine controls
controlPoints[n-1]     = exact objective/tip
minimum points         = 3
maximum points         = 64
```

与 `arrow.curved` 的关键结构差异：

- `arrow.curved` 从单一 tail center 和路径长度推导宽度；
- `arrow.attack` 的前两个控制点是精确尾缘，二者距离直接定义语义尾宽；
- 攻击箭头使用更宽的 body、可配置中段鼓出、neck narrowing 和受尾宽约束的 head；
- `arrow.attack` 不是 `arrow.curved` 的默认参数别名。

### Geometry and reusable structure

新增或完成：

- `AttackArrowParameters`；
- `DEFAULT_ATTACK_ARROW_PARAMETERS`；
- `resolveAttackArrowParameters()`；
- `buildAttackArrowFrame()`；
- `buildAttackArrowRing()`；
- `unprojectAttackArrowRing()`；
- reusable `AttackArrowFrame`；
- local metre projection around tail midpoint；
- input-order-independent left/right tail resolution；
- exact semantic tail width；
- Catmull–Rom/Hermite attack spine；
- cumulative arc-length measurement；
- broad body with configurable bulge；
- neck narrowing；
- terminal-tangent reusable arrow head；
- exact tail vertices and exact semantic tip restoration；
- finite/closed/counterclockwise/simple-ring guarantees；
- explicit self-intersection rejection；
- duplicate-spine cleanup；
- antimeridian-safe tail midpoint。

`AttackArrowFrame` 将 body/head 构造与尾部闭合策略分离，为下一阶段 `arrow.attack.tailed` 提供共享结构，禁止复制整套攻击箭头生成器。

### Definition, Registry and PlotJSON

新增：

- `ATTACK_ARROW_TYPE = "arrow.attack"`；
- `attackArrowDefinition` version `1.0.0`；
- built-in symbol catalog registration；
- fill、outline、hit-area RenderBundle；
- full semantic-path PlotJSON round trip；
- workspace baseline `0.0.10`。

重要契约修复：`attackArrowDefinition.validate()` 现在包含完整几何可生成性验证。自交或不可生成的攻击箭头会在 Store 写入前返回 `INVALID_ATTACK_ARROW_GEOMETRY`，而不是等渲染订阅者抛错后形成部分提交。

### MapLibre interaction

攻击箭头复用 Definition-driven `MultiPointDrawSession`：

- 第一个点击定义尾缘 A；
- 第二个点击定义尾缘 B；
- 第三个候选点开始产生合法 draft；
- 后续点击增加 spine controls；
- 双击或 Enter 完成；
- Backspace/Delete 逐点退回；
- Escape 取消；
- 所有 tail/spine 语义控制点均生成 handles；
- 一次合法 handle drag 只产生一个 `ReplacePlotCommand`；
- undo 恢复原始尾缘或 spine control；
- 无效几何 preview 被拒绝，不进入 Store 或 History。

### Double-click camera lifecycle fix

真实 Chromium trace 发现：完成多点图形时若在同一个 `dblclick` 事件栈内立即重新启用 MapLibre double-click zoom，地图默认处理器仍会执行一次 2× 缩放，导致刚完成图形的尾缘从视口中跳出。

修复：

- completion 仍立即创建和选择图形；
- double-click zoom 的恢复延迟到当前浏览器事件结束后的下一任务；
- 恢复前再次开始绘制时不会错误启用 zoom；
- cancel/destroy 仍正确恢复原状态；
- Node 回归模拟后注册的地图默认处理器；
- Chromium 真实绘制验证相机不跳变。

### Playground and Pages

Playground 现在包含六种箭头：

```text
arrow.straight
arrow.fine
arrow.fine.tailed
arrow.assault-direction
arrow.curved
arrow.attack
```

新增：

- 第六个 selector option：攻击箭头；
- 第六个南京示例；
- 尾缘 A/B + spine + objective 操作说明；
- 四点攻击箭头真实绘制；
- double-click completion；
- exact semantic handles；
- 合法尾缘编辑和单步 undo；
- committed Source 与 actual rendered-feature 检查；
- 无底图模式继续支持真实 MapLibre Worker。

### Tests

新增或扩展测试覆盖：

- deterministic 56-coordinate golden fixture；
- exact two tail controls and exact tip；
- tail input-order invariance；
- finite/closed/CCW/simple ring；
- wider tail produces larger body；
- interior spine influence；
- minimum three-control case；
- duplicate-spine cleanup；
- invalid tail semantics and parameter rejection；
- tight self-intersection rejection；
- Definition-level invalid-geometry validation；
- Registry/render roles；
- PlotJSON round trip；
- real Chromium draft/completion/rendering；
- camera stability after double-click；
- tail-handle drag, revision, history depth and undo；
- Worker entry/shared serving。

### Clean-room provenance

算法记录：

```text
docs/algorithms/arrow-attack.md
```

公开行为研究基于 ol-plot AttackArrow/TailedAttackArrow revision：

```text
c919e60b4edeaeca53c08f9552f793b2ae9537f0
```

仅参考公开行为和术语。未复制参考代码、常量、helper layout 或公式。

### Files and areas changed

核心区域：

```text
packages/geometry/src/attack-arrow.ts
packages/geometry/src/attack-arrow-frame.ts
packages/symbols/src/attack-arrow.ts
packages/maplibre/src/interaction.ts
apps/playground/src/main.ts
apps/playground/e2e/playground.spec.ts
tests/attack-arrow.test.mjs
tests/attack-arrow-validation.test.mjs
tests/maplibre.test.mjs
docs/algorithms/arrow-attack.md
README.md
```

## Validation

最终权威矩阵：

```text
Run ID: 30413156622
Head: c3d229ef0507b56dd51c6225c396aedc309ce547
Node 20.19: success
Node 22: success
TypeScript/workspace: success
Node tests: 78 passed, 0 failed
Playground typecheck: success
/PlotLibre/ production build: success
handover contract: success
Chromium: 12 passed
```

开发过程中 CI/trace 实际发现并修复：

1. 原 E2E 尾缘与初始进攻方向近乎平行，正确几何验证拒绝 draft；
2. 完成多点图形时过早恢复 double-click zoom 导致相机跳变；
3. 尾缘拖动可能生成自交 Polygon；
4. 仅调用轻量 `validate()` 会让无效 preview 在渲染阶段才失败；
5. Store 已更新而 History 尚未入栈时出现部分提交风险；
6. Definition-level renderability validation 将失败前移到 Store mutation 之前。

## Architectural decisions

1. 攻击箭头 canonical state 仅包含语义 tail/spine controls、parameters、style 和 metadata。
2. 曲线采样点、offset 顶点和 Polygon 顶点均为派生数据，不进入 PlotJSON。
3. 尾宽是两个精确尾缘控制点的距离，不由全路径长度替代。
4. tail input order 不影响最终几何左右语义。
5. `AttackArrowFrame` 是 flat-tail 与 tailed variant 的共享构造边界。
6. topology-sensitive symbols 的 Definition 验证必须覆盖完整可生成性。
7. invalid previews 不进入 Store；不能依赖渲染异常回滚语义状态。
8. 多点完成后 zoom 恢复必须晚于原生 `dblclick` 事件栈。
9. 不为通过测试放宽 simple-ring 或尾缘跨向验证。

## Known limitations

- 第三个候选点前仍没有独立 centerline guide；
- Playground 尚未显示详细 validation issue；
- 已提交图形暂不支持插入或删除 spine controls；
- 无 touch-specific completion；
- 无 snapping、角度或平行/垂直约束；
- local projection 不适合超大跨国箭头；
- 无 body width、head、neck、tension 参数 handles；
- 浏览器矩阵目前仅 Chromium；
- `PlotStore` listener exception 的通用事务回滚尚未在 Core 层实现，当前通过 Definition 预检避免本符号触发该路径。

## Next tasks

1. 将 PR #12 标记 Ready；
2. 合并 PR #12 到 `main`；
3. 验证 `main` CI；
4. 验证 GitHub Pages 已显示六种符号；
5. 从最新 `main` 创建 `arrow.attack.tailed` 单独分支；
6. 开始 Milestone 005G；
7. 复用 `AttackArrowFrame`，只新增独立燕尾闭合策略；
8. 为燕尾深度/宽度建立参数契约和 golden fixture；
9. 同阶段完成 Definition、PlotJSON、Playground、Chromium 和不可变交接；
10. 在 005G 完成前不实现 double、pincer、route、corridor 或其他复杂箭头。

## Risks and decisions

### Tailed attack must be structurally distinct

`arrow.attack.tailed` 不能只是把平尾攻击箭头换一组默认参数。它必须在相同 `AttackArrowFrame` 上使用独立燕尾 closing strategy，并保留两个语义尾缘控制点。

### Avoid generator duplication

禁止复制 `buildAttackArrowRing()` 后修改尾部。应从 frame 中取得 `tailLeft`、`tailRight`、`tailCenter`、body interiors 和 head，再增加可验证的 inward notch。

### Topology risk

燕尾 notch 可能与 body interior 自交。参数验证必须限制 notch depth/width，并继续使用 simple-ring policy。不得通过移除 topology validation 让极端参数通过。

### History consistency

后续应评估 Core `CommandHistory.execute()` 与 Store listener 异常的原子性设计，但不要在 005G 同时进行大规模 Store/History 重构，除非新符号无法在现有 Definition 预检下安全实现。

### Public deployment

只有 `main` Pages workflow 成功且在线页面实际包含 `arrow.attack` 后，才能宣布六符号公开部署完成。

## Continuation instructions

新的开发者或对话应：

1. 阅读 `AGENTS.md`；
2. 阅读 `docs/algorithms/arrow-attack.md`；
3. 阅读本交接和 `docs/handover/LATEST.md`；
4. 确认 PR #12、`main` CI 和 Pages 状态；
5. 从最新 `main` 创建 005G 分支；
6. 保留全部 78 Node 和 12 Chromium 回归；
7. 使用 `AttackArrowFrame` 实现燕尾，不复制平尾 generator；
8. 完成后新增 `docs/handover/2026-07-29-milestone-005g-tailed-attack-arrow.md` 并更新 `LATEST.md`。

# PlotLibre Development Handover — Milestone 005G Tailed Attack Arrow

日期：2026-07-29  
仓库：`hujinghaoabcd/PlotLibre`  
目标分支：`main`  
开发分支：`agent/tailed-attack-arrow-vertical-slice`  
PR：`#13 Add tailed attack arrow vertical slice`  
Workspace：`0.0.11`

## Current state

Milestone 005G 已完成 `arrow.attack.tailed` 的完整单符号纵向切片：共享语义模型、纯几何、Definition、PlotJSON、MapLibre 多点绘制与编辑、七符号 Playground、真实 Chromium 回归、clean-room 算法记录和公开文档均已完成。

第一轮完整权威 CI：

```text
Head: f9c7418d8588ea30ba3521af7558dbda1c07b624
Run ID: 30419114264
Node 20.19: success
Node 22: success
Node tests: 90 passed
Chromium: 12 passed
/PlotLibre/ build: success
handover contract: success
```

最终文档同步头将在本文件和 `LATEST.md` 写入后重新运行同一矩阵。PR #13 当前为 Draft、mergeable。

## Completed in this milestone

### Public symbol and semantic model

新增：

```text
arrow.attack.tailed
```

控制点语义与 `arrow.attack` 完全一致：

```text
controlPoints[0]       = exact tail edge A
controlPoints[1]       = exact tail edge B
controlPoints[2..n-2]  = attack-spine controls
controlPoints[n-1]     = exact objective/tip
minimum points         = 3
maximum points         = 64
```

燕尾根点和内凹点是派生几何，不进入 PlotJSON，也不生成 semantic handles。

### Shared geometry boundary

005G 没有复制平尾攻击箭头 generator。

共享：

```text
AttackArrowFrame
```

共享 frame 负责：

- local projection；
- exact semantic tail-edge resolution；
- input-order-independent left/right identity；
- semantic tail width；
- sampled attack spine；
- body offset interiors；
- neck/head geometry；
- exact semantic tip restoration。

燕尾变体只负责独立 closing strategy。

### New geometry API

新增：

- `TailedAttackArrowParameters`；
- `ResolvedTailedAttackArrowParameters`；
- `DEFAULT_TAILED_ATTACK_ARROW_PARAMETERS`；
- `resolveTailedAttackArrowParameters()`；
- `buildTailedAttackArrowRing()`。

新增参数：

```text
tailNotchDepthRatio
    inward notch depth / full semantic tail width

tailNotchWidthRatio
    notch opening width / full semantic tail width
```

默认：

```text
tailNotchDepthRatio = 0.75
tailNotchWidthRatio = 0.65
```

参数范围：

```text
0.05 <= tailNotchDepthRatio <= 2.5
0.10 <= tailNotchWidthRatio <= 0.95
```

### Independent tail closing

派生尾部路径：

```text
right tail edge
→ right notch root
→ inward notch tip
→ left notch root
→ left tail edge
```

notch tip 沿初始 normalized spine direction 向 body 内部移动。notch roots 位于两个精确尾缘之间。

### Topology and validation

保证：

- finite；
- closed；
- counterclockwise；
- simple ring；
- exact semantic tail edges；
- exact semantic objective；
- tail input-order invariance。

拒绝：

- invalid tail semantics；
- invalid notch ratios；
- notch reaching too far toward neck；
- notch passing neck plane；
- self-intersecting body or notch。

`tailedAttackArrowDefinition.validate()` 执行完整可生成性验证，并返回：

```text
INVALID_TAILED_ATTACK_ARROW_GEOMETRY
```

无效 preview 在 Store mutation 和 History 更新前被拒绝。

### Relational golden contract

005G golden 不复制完整平尾 Polygon 快照，而是证明：

```text
tailed body/head coordinates
= flat attack golden coordinates
```

燕尾 ring 仅增加三个独立 notch vertices，平尾攻击箭头 body/head 的逐坐标结果保持不变。

这同时验证：

- `AttackArrowFrame` 真实复用；
- 未复制平尾 generator；
- flat attack golden 无回归；
- notch 构造确定性。

### Definition, Registry and PlotJSON

新增：

- `TAILED_ATTACK_ARROW_TYPE = "arrow.attack.tailed"`；
- `tailedAttackArrowDefinition` version `1.0.0`；
- built-in catalog registration；
- fill、outline、hit-area RenderBundle；
- full semantic-path PlotJSON round trip；
- notch parameters round trip；
- workspace baseline `0.0.11`。

### MapLibre interaction

燕尾攻击箭头复用 Definition-driven `MultiPointDrawSession`：

- first two clicks define exact tail edges；
- third candidate produces the first valid draft；
- later clicks add attack-spine controls；
- double-click or Enter completes；
- Backspace/Delete removes one uncommitted point；
- Escape cancels；
- all tail/spine semantic controls render handles；
- notch vertices do not render handles；
- one valid handle drag creates one `ReplacePlotCommand`；
- undo restores original control；
- deferred double-click zoom restoration keeps camera stable。

### Playground and Pages candidate

Playground 现在包含七种箭头：

```text
arrow.straight
arrow.fine
arrow.fine.tailed
arrow.assault-direction
arrow.curved
arrow.attack
arrow.attack.tailed
```

新增：

- seventh selector option；
- seventh Nanjing sample；
- tailed attack instructions；
- real four-point flat and tailed attack drawing；
- exact semantic handles；
- notch default checks；
- committed Source and actual rendered-feature checks；
- tailed tail-edge edit、revision、history and undo；
- Worker and `/PlotLibre/` build regression。

### Tests

新增 12 个 Node tests，使总数由 78 增至 90：

- shared flat-body/head golden contract；
- exact tails and exact tip；
- input-order invariance；
- finite/closed/CCW/simple ring；
- notch-depth isolation；
- notch-width isolation；
- minimum three-control case；
- invalid parameter and excessive-depth rejection；
- tight self-intersection rejection；
- Registry/render roles；
- Definition invalid-geometry validation；
- PlotJSON round trip。

Chromium 继续保持 12 个场景，并扩展为七符号：

- selector and seven Nanjing samples；
- seven committed plot types；
- actual rendered feature；
- both attack variants draw/complete/render；
- camera stability；
- notch parameters；
- tailed tail-handle edit/history/undo；
- style/delete/import/export/Worker regressions。

### Clean-room provenance

算法记录：

```text
docs/algorithms/arrow-attack-tailed.md
```

公开行为与术语研究沿用 flat attack 记录的 ol-plot AttackArrow/TailedAttackArrow revision：

```text
c919e60b4edeaeca53c08f9552f793b2ae9537f0
```

未复制参考源代码、常量、helper layout、参数名、类结构或公式。

### Core files changed

```text
packages/geometry/src/tailed-attack-arrow.ts
packages/geometry/src/index.ts
packages/symbols/src/tailed-attack-arrow.ts
packages/symbols/src/catalog.ts
packages/symbols/src/index.ts
tests/fixtures/tailed-attack-arrow.json
tests/tailed-attack-arrow.test.mjs
apps/playground/src/template.ts
apps/playground/src/playground-app.ts
apps/playground/e2e/playground.spec.ts
docs/algorithms/arrow-attack-tailed.md
README.md
AGENTS.md
docs/DEVELOPMENT_PLAN.md
docs/PLAYGROUND.md
docs/INTERACTION_MODEL.md
package.json
```

## Validation

第一轮权威矩阵：

```text
Run ID: 30419114264
Head: f9c7418d8588ea30ba3521af7558dbda1c07b624
Node 20.19: success
Node 22: success
TypeScript/workspace: success
Node tests: 90 passed, 0 failed
Playground typecheck: success
/PlotLibre/ production build: success
handover contract: success
Chromium: 12 passed
```

最终文档同步 CI 必须重复同一矩阵后才能 Ready 和合并。

## Architectural decisions

1. 平尾与燕尾攻击箭头拥有同一 canonical semantic control model。
2. notch roots/tip 是派生几何，不是控制点。
3. `AttackArrowFrame` 是 body/head 共享边界。
4. 变体只拥有 closing strategy 和 variant parameters。
5. 关系型 golden 证明共享部分逐坐标不变。
6. notch depth 和 opening width 独立，不合并为一个模糊参数。
7. notch 必须留在 neck 后方。
8. topology-sensitive Definition 在命令执行前验证完整可生成性。
9. 不为通过极端参数测试放宽 simple-ring policy。
10. MapLibre interaction remains Definition-driven，无 tailed symbol ID 特判。

## Known limitations

- notch 参数尚无 UI controls 或 parameter handles；
- Playground 尚未显示详细 validation issue；
- committed spine controls 暂不支持插入/删除；
- no touch-specific completion；
- no snapping or geometric constraints；
- local projection 不适合超大跨国符号；
- browser matrix 仅 Chromium；
- Core Store-listener exception 仍无通用事务回滚；
- online Pages 七符号部署需 PR #13 合并后验证；
- 当前执行环境 DNS 无法直接访问 GitHub Pages，因此未在本地网络路径验证线上 HTML。

## Next tasks

1. 更新 `docs/handover/LATEST.md`；
2. 等待最终文档同步 CI 全绿；
3. 更新 PR #13 最终说明；
4. 检查 review threads；
5. 将 PR #13 标记 Ready；
6. squash merge 到 `main`；
7. 验证 `main` CI；
8. 验证 GitHub Pages 在线页面包含七种符号；
9. 从最新 `main` 创建 Milestone 005H 分支；
10. 先完成 `arrow.double` 语义设计，再编码；
11. 不并行实现 pincer、route、corridor 或 squad-combat。

## Risks and decisions

### Double arrow is not two independent arrows

下一阶段 `arrow.double` 必须拥有共享 branch/body 的单一 semantic object。不能简单把两个现有箭头放入一个数组并称为新符号。

### Canonical controls are unresolved

双箭头开始编码前必须明确：共享尾部、左右 objectives、中心连接/分叉控制、handedness、最小点数和完成规则。

### Topology risk

双头、共享 body、中心连接可能形成多个自交区域。005H 必须先定义 topology policy，再写 generator。

### Scope control

005H 只实现 `arrow.double`。不得同时实现 pincer、route、corridor 或其他复杂箭头。

### Deployment verification

七符号公开部署只能在 PR #13 合并、Pages workflow 成功且在线页面实际包含 `arrow.attack.tailed` 后宣布完成。

## Continuation instructions

新的开发者或对话应：

1. 阅读 `AGENTS.md`；
2. 阅读 `docs/algorithms/arrow-attack.md`；
3. 阅读 `docs/algorithms/arrow-attack-tailed.md`；
4. 阅读本交接和 `docs/handover/LATEST.md`；
5. 确认 PR #13、最终 CI、main CI 和 Pages 状态；
6. 从最新 `main` 创建 005H 分支；
7. 保留全部 90 Node 和 12 Chromium 回归；
8. 先写双箭头语义设计和 clean-room 记录；
9. 完成后新增 005H immutable handover 并更新 `LATEST.md`。

# PlotLibre Development Handover — Milestone 006E Squad Combat Arrow

日期：2026-07-30  
仓库：`hujinghaoabcd/PlotLibre`  
分支：`agent/squad-combat-arrow`  
PR：`#27 Add squad combat arrow`  
Workspace：`0.0.16`  
Definition：`arrow.squad-combat@1.0.0`  
状态：完整纵向切片已实现；135 Node / 19 Chromium 已通过；等待最终 docs-inclusive CI、Ready 和 squash merge

## Current state

新增第十个公共箭头：

```text
arrow.squad-combat
```

canonical controls 是中心行动路径：

```text
0      tail centre
1..n-2 optional path controls
n-1    exact objective/tip
```

最少两个控制点即可生成直线形态；增加中间点可形成曲线路径。左右尾缘与尾宽由路径在局部米制坐标中派生，只作为攻击箭头 frame 的临时输入，不进入 Store、handles、History 或 PlotJSON。

## Completed in this milestone

- 新增 `packages/geometry/src/squad-combat.ts`；
- 新增独立 center-path → temporary tail-edge derivation；
- 复用已验证的 AttackArrow body/head construction；
- 尾宽由 sampled path length 与 `tailWidthPathRatio` 派生；
- 默认 `tailWidthPathRatio = 0.04`，有效范围 `[0.01, 0.15]`；
- 保留 finite、closed、counterclockwise、simple-ring 校验；
- 新增 `arrow.squad-combat@1.0.0` Definition；
- control schema 为 `minPoints=2, maxPoints=64, completeOnDoubleClick=true`；
- MultiPointDrawSession 支持显式 `2..N` variable schema，不添加符号 ID 分支；
- Registry、RenderBundle、PlotJSON 与 invalid-before-Store 覆盖；
- workspace/demo 升至 `0.0.16`；
- production Playground 增加“分队战斗箭头”选项；
- Load Sample 生成十类南京示例；
- 十类型 draft/committed `queryRenderedFeatures()` 矩阵；
- 单独 E2E 验证 selector 与十示例；
- 新增 clean-room algorithm record；
- README、AGENTS 和 DEVELOPMENT_PLAN 已更新；
- pincer hardening 明确冻结；
- 下一符号确定为 `arrow.route`；
- 本里程碑只使用一个实施 PR，不创建设计 PR 或 finalization PR。

## Validation

```text
Implementation CI run: 30475433907
Node 20.19: success
Node 22: success
Node tests: 135 passed / 0 failed
Chromium tests: 19 passed / 0 failed
Typecheck: success
Package build: success
Playground typecheck/build: success
Handover contract: success
Final docs-inclusive CI: pending at handover creation
```

Clean-room reference：

```text
repository: sakitam-fdd/ol-plot
revision: c919e60b4edeaeca53c08f9552f793b2ae9537f0
observed file: packages/ol-plot/src/geometry/Arrow/SquadCombat.ts
license: MIT
usage: observable semantics only; no code copied
```

## Next tasks

1. 完成最终 docs-inclusive CI；
2. 检查 unresolved review threads；
3. 更新 PR #27 描述为最终验证结果；
4. 将 PR #27 标记 Ready；
5. squash merge，expected head SHA 必须匹配；
6. 验证 merge SHA 与 `main` identical；
7. 核对 Pages badge `v0.0.16 demo`；
8. 下一开发切片直接进入 `arrow.route`；
9. 不返回 pincer 边界加固；
10. route 仍采用单实施 PR。

## Risks and decisions

- `arrow.squad-combat` 与 `arrow.attack` 共享 body/head 构件，但持久化语义不同；
- derived tail edges 禁止写入任何 canonical state；
- tail width 根据完整 sampled path length 派生，急转路径仍可能因自交被严格拒绝；
- 不通过删除 simple-ring 检查来接受急转路径；
- production 总是启用第十符号；E2E 使用 `?e2e=1&squad=1` 扩展新符号，保留旧九符号基础套件不变；
- initial automatic sample 仍由旧 installer 顺序生成九类；点击 Load Sample 时 wrapper 生成完整十类示例；
- Definition defaults 属于 1.0.0 视觉合同，后续调整需评估版本；
- 当前 packages 仍为 `UNLICENSED`；
- 当前工具无法直接可靠读取 GitHub Pages 缓存，线上 badge/绘制需用户或可用浏览器环境核对。

Continuation：从 PR #27 和本文件继续。先查看最终 CI。若全绿，直接 Ready、检查 review threads、squash merge 并 compare main；不要创建第二个 finalization PR。下一任务是 `arrow.route`，先冻结其语义控制点与宽度模型，再在一个 PR 中完成完整纵向切片。

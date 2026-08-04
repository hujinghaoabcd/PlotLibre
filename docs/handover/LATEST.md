# PlotLibre Development Handover — Milestone 006H Finalized / Milestone 006I Ready

日期：2026-08-04  
仓库：`hujinghaoabcd/PlotLibre`  
基线分支：`main`  
接手分支：`agent/006i-handover-baseline`  
006H PR：`#29 Add route multi-head symbol group`  
006H merge SHA：`e799b3263bc36410c4195225faad5d2fc36f494f`  
Workspace：`0.0.18`  
状态：006H 已合并；十四个公共箭头已进入 `main`；下一开发阶段为 006I 闭合行动区域组

## Current baseline

```text
workspace:          0.0.18
MapLibre GL JS:     6.0.0
Node.js:            20.19+
public Arrow types: 14
Node tests:         154
Chromium tests:     20
main SHA:           e799b3263bc36410c4195225faad5d2fc36f494f
```

当前公共 Arrow Definitions：

```text
arrow.straight
arrow.fine
arrow.fine.tailed
arrow.assault-direction
arrow.curved
arrow.attack
arrow.attack.tailed
arrow.double
arrow.pincer
arrow.squad-combat
arrow.route
arrow.corridor
arrow.route.bidirectional
arrow.route.double-head
```

当前架构边界：

```text
core <- geometry <- symbols
core <- interaction
core + interaction <- maplibre
public packages <- playground
```

Canonical state 始终是：

```text
plot definition + authored control points + parameters + style + metadata
```

Rendered GeoJSON、曲线采样点、offset、neck、head、notch、bridge 和 Polygon 顶点均为派生数据。

## Completed in this milestone

- `arrow.route.bidirectional@1.0.0` 已进入 `main`；
- `arrow.route.double-head@1.0.0` 已进入 `main`；
- 两者共享纯 `PathRibbonFrame` 与 route/head 构造，同时保持独立方向拓扑；
- bidirectional route 保留两个 exact authored tips，并输出一个 closed simple Polygon；
- double-head route 保留 exact primary tip，并增加 derived secondary emphasis-head Polygon；
- 两点直线和多点曲线路径均支持；
- Registry 公共符号总数为 14；
- PlotJSON 仅保存 authored centre paths；
- Playground 提供十四个 selector 和十四类样例；
- 十四类型 draft/committed 实际渲染矩阵已通过；
- Node baseline 为 154；
- Chromium baseline 为 20；
- PR #29 已于 2026-07-30 合并到 `main`；
- 006H 后不再增加路线头部变体；
- pincer hardening 继续冻结；
- 项目接手基线已转向 Milestone 006I。

## Validation

006H 最终实现与交接记录中的验证基线：

```text
Authoritative current-head run: 30510846019
Node 20.19:                  success
Node 22:                     success
Node tests:                  154 passed / 0 failed
Chromium tests:              20 passed / 0 failed
14-type render matrix:       success
Typecheck/build:             success
Playground build:            success
Handover contract:           success
Unresolved review threads:   0
```

本接手分支首先处理文档状态同步，不改变运行时 API、geometry、PlotJSON 或公共 Definition。

## Next tasks

1. 完成 006H 合并后的 immutable finalization handover；
2. 同步 `AGENTS.md`、`DEVELOPMENT_PLAN.md`、`PLAYGROUND.md`、`INTERACTION_MODEL.md` 和设计索引；
3. 清除仍把 PR #29 写成待合并的状态描述；
4. 冻结 Milestone 006I 的公共标识符和范围；
5. 为闭合行动区域组建立独立语义设计；
6. 优先评估 `area.closed-curve` 与 `area.gathering-place`，谨慎处理 `area.route-loop` 的方向含义；
7. 明确每个区域符号的 canonical controls、自动闭合规则、输出拓扑和完成方式；
8. 提取纯 closed-area geometry frame，不复制完整生成器；
9. 同阶段完成 Definition、Registry、PlotJSON、Playground、Node、Chromium 和 handover；
10. 暂不进入专业编辑、吸附、MIL-STD 或框架封装。

## Risks and decisions

- `docs/PLAYGROUND.md`、`docs/ARCHITECTURE.md` 和部分交互文档存在明显历史状态漂移，不能继续作为单独权威来源；
- `docs/handover/LATEST.md`、`main` 源码、最新合并 PR 和 CI 基线应共同确定当前状态；
- workspace 为 `0.0.18`，但公共 packages 仍为 `0.0.2`，版本发布策略尚未建立；
- packages 仍为 `UNLICENSED`，正式 npm 发布前必须完成许可证决策；
- PlotJSON 1.0 尚缺正式 JSON Schema 与 migration framework；
- Store/History 仍是内存与单命令基础实现，没有多对象事务和持久化；
- 当前 built-in catalog 仍只有 Arrow family，006I 是项目第一次进入区域类符号；
- 闭合曲线不得退化为普通自由手绘 GeoJSON，canonical controls 必须保持可编辑、可迁移和可重建；
- 新区域符号仍必须执行 full renderability preflight，不能为提高成功率移除 simple-ring validation；
- 006I 的第一步是语义设计，不在标识符、控制点角色和拓扑未冻结前直接写 geometry。

Continuation：以 `agent/006i-handover-baseline` 为接手分支。先完成文档与 immutable handover 同步，再为 006I 创建闭合行动区域语义设计。不要返回 pincer hardening，也不要继续增加 route head variants。

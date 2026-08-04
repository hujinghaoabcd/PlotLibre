# PlotLibre Design Notes

本目录保存公共符号或专业编辑能力在 runtime 实现前冻结的语义设计，以及多个相关功能共享状态或数学基础时的组设计。

设计文档应回答：

- public identifiers、versions 或 interaction modes；
- authored controls、selection state 或 transaction ownership；
- 顺序、交换、canonicalization 与 mutation 不变量；
- derived geometry、overlay 和 transient guide 边界；
- completion、validation、rollback 和 degenerate-input policy；
- PlotJSON/migration boundary；
- shared frame/state model 与独立 public semantics；
- clean-room references、licenses 和 code-reuse declaration；
- deterministic test plan and non-goals。

## 当前设计文档

| 文档 | 范围 | 当前状态 |
|---|---|---|
| `arrow-double-semantic-design.md` | 四控制双箭头 | 已实现，`arrow.double@1.0.0` |
| `arrow-pincer-semantic-design.md` | 五控制钳形箭头 | 已实现，`arrow.pincer@1.1.0` |
| `route-corridor-group.md` | route + flat-cap corridor | 已实现并合并 |
| `route-multihead-group.md` | bidirectional + derived secondary-head route | 已实现并合并 |
| `closed-action-area-group.md` | closed curve + gathering place | 已实现并通过 PR #31 合并 |
| `circular-arc-family.md` | circular arc + sector + circular segment | 设计 PR #33、实现 PR #34 均已合并 |

## Milestone 006J 最终状态

公共范围：

```text
line.circular-arc@1.0.0
area.circular-segment@1.0.0
area.sector@1.0.0
```

延期：

```text
area.lune
```

关键决策：

- open arc 使用 output/category 一致的 `line.circular-arc`；
- legacy `Lune/弓形` 的 arc+chord geometry 精确命名为 `area.circular-segment`；
- true two-arc lune 需要未来独立设计；
- circular arc/segment controls 为 exact `start / through / end`；
- through-point 选择 minor/major directed sweep；
- sector controls 为 `center / exact radius-start / end-bearing handle`；
- sector 第三点只定义 bearing，距离不定义第二半径；
- `sweepDirection` 显式区分 clockwise/counterclockwise；
- 三者 fixed-three，第三个有效点击自动完成；
- 1.0 local-metre only；
- duplicate、collinear、unstable、excessive-radius、unsupported extent 和 invalid topology fail closed；
- no two-point fallback、hidden control movement、singular degradation 或 silent geodesic switch；
- `segmentsPerCircle` 只影响采样密度；
- exact authored controls survive PlotJSON；
- centers、radii、sweeps、samples、derived endpoints 和 closing coordinates 均为派生状态。

### Sector semantic-guide extension

006J 增加通用 Definition hook：

```text
deriveSemanticGuidePaths(feature)
```

Sector 声明 `center → end-bearing handle`。MapLibre 在 complete draft、selection 和 handle drag 中渲染虚线，但 guide 不进入 committed RenderBundle、Store、History 或 PlotJSON。

该能力是通用语义机制，不是 MapLibre 层的 `area.sector` 特判。

### Merge evidence

```text
workspace:        0.0.20
symbols:          19 (14 Arrow + 1 Line + 4 Area)
Node:             184 passed
Chromium:         28 passed
implementation:   PR #34
squash merge SHA: 297d0a644eaa3427f8fd59b82b7bc3582221d49e
```

详细语义见 `circular-arc-family.md`，数学与 provenance 见 `../algorithms/circular-arc-foundation.md`。

## Milestone 007 设计入口

下一阶段是专业编辑语义设计，而不是继续增加符号。拟新增设计文档应覆盖：

```text
multi-selection
box/lasso selection
whole-object translation
rotation and scale
groups, locks and z-order
multi-object commands and atomic rollback
keyboard, pointer and touch behavior
performance and browser fixtures
```

核心原则：

- selection overlay 和 transform handles 是 transient UI state；
- object transforms 修改 authored controls，不修改 rendered Polygon vertices；
- multi-object mutation 必须先对全部 affected features 完成 Registry preflight；
- 任一 feature 无效时整批不 mutation；
- one gesture = one history entry；
- group/lock/z-order 进入 canonical document 前必须明确 PlotJSON schema 和 migration；
- design PR 合并前不得编写 Milestone 007 runtime。

## 状态说明

历史设计文档可能保留设计当时的状态，不应被重写以伪造历史。当前事实以以下入口共同确定：

```text
main source
README.md
AGENTS.md
docs/DEVELOPMENT_PLAN.md
docs/handover/LATEST.md
latest active/merged PR
```

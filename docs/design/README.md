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
| `professional-editing.md` | multi-selection、batch transaction、translation、box/lasso、rotation/scale、groups | Milestone 007 设计冻结候选，尚无 runtime |

## Milestone 006J 最终状态

```text
workspace:        0.0.20
symbols:          19 (14 Arrow + 1 Line + 4 Area)
Node:             184 passed
Chromium:         28 passed
implementation:   PR #34
finalization:     PR #35
final main SHA:   4ce59d189b65c8257bf49beabc308a4020249cd0
```

Circular family public范围：

```text
line.circular-arc@1.0.0
area.circular-segment@1.0.0
area.sector@1.0.0
```

`area.lune` 继续延期。详细语义见 `circular-arc-family.md`，数学与 provenance 见 `../algorithms/circular-arc-foundation.md`。

## Milestone 007 设计冻结候选

`professional-editing.md` 将专业编辑拆为四个实施切片：

```text
007A selection + atomic batch commands + local translation
007B box/lasso selection
007C rotation + positive uniform scale
007D canonical groups/locks/visibility/z-order after PlotJSON migration design
```

### Selection

- transient engine-independent state；
- ordered `selectedIds` + one `primaryId`；
- primary 必须是 selection order 的最后一个 id；
- selection 不进入 PlotJSON；
- replace/add/subtract/toggle/clear/reconcile 每次最多一个 event；
- Store remove/clear 自动 reconcile surviving ids；
- secondary features 显示 lightweight overlay；
- only primary feature 显示 authored handles 与 Definition guides。

### Atomic transaction

```text
build every candidate
→ Registry canonicalize/generate all
→ any invalid: reject entire edit
→ all valid: one PlotStore transaction
→ one batch event
→ one history entry
```

Store listeners 在 commit 后出错不能回滚已经被其他 listeners 观察的状态，也不能让 history 漏记 command。错误必须被收集并交给 error handler。

### Translation

007A 只支持 local-metre whole-object translation：

- one shared projection and meter delta；
- transform authored controls only；
- parameters/style/metadata unchanged；
- all selected features preview together；
- any invalid member prevents all mutation；
- one pointer gesture = one `BatchEditCommand`；
- Escape cancellation and zero-movement no-op。

### Later slices

- 007B default box/lasso policy is intersection, candidate ids ordered by Store order；
- 007C uses selection authored-control bounds center as deterministic pivot；
- scale is positive uniform only；
- group/lock/z-order cannot be hidden in free-form metadata and requires formal PlotJSON schema/migration。

### Reference boundary

Fixed behavior references：

```text
JamesLMilner/terra-draw@26d7ec91f071ab5d2bdeab774d14763746cd798b — MIT
geoman-io/maplibre-geoman@b177748cac826fc820ff7ea068186f8eb6e0fc3c — MIT
mapbox/mapbox-gl-draw@cb0ca464872d8468f0b912a2321f2e0503718c52 — ISC-style
```

Code reuse：`none`。只研究 selection lifecycle、direct/whole-feature editing、drag/rotate/scale mode separation、keyboard configuration 和 test organization。

详细事务算法见 `../algorithms/batch-edit-transaction.md`。

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

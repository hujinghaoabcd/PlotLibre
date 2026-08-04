# PlotLibre Playground 与 GitHub Pages

## 1. 入口与职责

```text
https://hujinghaoabcd.github.io/PlotLibre/
```

`apps/playground` 同时承担真实 MapLibre 应用、人工验收入口、Playwright 测试目标、GitHub Pages 站点和公共 API 示例。它只能通过公开 PlotLibre packages 工作，不得绕过 Store、Registry、CommandHistory、SelectionController 或公开 renderer API。

## 2. 当前合并基线

```text
workspace:          0.0.21
MapLibre GL JS:     6.0.0
Vite:               8.1.5
Playwright:         1.61.1
Node.js:            20.19+
Pages base:         /PlotLibre/
Node tests:         219
Chromium tests:     30
public symbols:     19 (14 Arrow + 1 Line + 4 Area)
MapLibre Sources:   4
MapLibre Layers:    10
merged PR:          #38
main SHA:           04dca0b120b1440afb49a300eeee92faf6644a7d
```

公共 packages 仍使用开发期独立版本。根 workspace `0.0.21` 是里程碑基线，不代表统一 npm release。

## 3. 公共符号目录

```text
arrow.straight              直箭头
arrow.fine                  细箭头
arrow.fine.tailed           燕尾细箭头
arrow.assault-direction     突击方向
arrow.curved                曲线箭头
arrow.attack                攻击箭头
arrow.attack.tailed         燕尾攻击箭头
arrow.double                双箭头
arrow.pincer                钳形箭头
arrow.squad-combat          分队战斗箭头
arrow.route                 路线箭头
arrow.corridor              走廊
arrow.route.bidirectional   双向路线箭头
arrow.route.double-head     双头路线箭头
line.circular-arc           三点圆弧
area.closed-curve           闭合曲线区域
area.gathering-place        集结地
area.circular-segment       圆弓形区域
area.sector                 扇形区域
```

## 4. 绘制模式

- exact two-point：straight、fine、tailed-fine、assault-direction；
- variable multi-point：curved、attack、squad、route/corridor、closed curve；
- fixed four/five：double、pincer；
- fixed three：gathering place、circular arc、circular segment、sector。

Variable multi-point uses double-click or Enter to complete, Backspace/Delete to remove the latest control and Escape to cancel. Invalid fixed-count completion keeps the session active with structured rejection.

Circular authored roles：

```text
line.circular-arc:
  start / through / end

area.circular-segment:
  arc-chord start / through / arc-chord end

area.sector:
  center / exact radius-start / end-bearing handle
```

Sector control `2` defines bearing only; its distance does not change radius.

## 5. Selection 与 Primary

Playground directly displays `plot.selectedIds` and `plot.selectedId`：

- selection count reflects the complete ordered selection；
- `selectedId` is Primary；
- only Primary shows authored handles and Definition guides；
- only Primary accepts style-panel editing；
- secondary selected objects show lightweight derived overlays；
- selection is excluded from PlotJSON and feature revision。

Input：

```text
plain click       replace / make-primary
Shift + click     add
Ctrl/Cmd + click  toggle
Alt + click       subtract
empty plain click clear
Escape            clear when no higher-priority operation is active
```

PlotLibre records, disables and restores MapLibre box zoom so Shift can be reserved for additive selection.

## 6. Batch delete

The Playground “批量删除选中” action and Delete/Backspace use `plot.removeSelected()`：

```text
ordered selected ids
→ one BatchEditCommand
→ one Store transaction
→ after selection empty
→ one History entry
```

Undo restores exact feature values, document order, selection order and Primary. Redo restores exact after-state and revisions.

## 7. Whole-selection translation

Dragging the body of any selected plot：

```text
capture exact selected features
→ one shared local projection
→ one common metre delta
→ transient selection preview
→ Store remains unchanged
→ full Registry preflight
→ pointer up commits one BatchEditCommand
```

- handle drag has priority；
- active translation temporarily disables dragPan；
- Escape cancels；
- sub-threshold/zero movement creates no command；
- one invalid member rejects the complete batch；
- parameters/style/metadata remain unchanged；
- one completed gesture creates one History entry。

Status text reports selection count, Primary, translation preview, commit, cancellation and rejection.

## 8. Draft、Guide 与 Rejection

PlotLibre distinguishes complete draft, last-valid draft, incomplete guide, Definition semantic guide, selection overlay, translation preview and structured rejection.

Sector semantic guide：

```text
PlotDefinition.deriveSemanticGuidePaths(feature)
center → end-bearing handle
```

It never enters committed geometry, Store, History or PlotJSON.

## 9. Atomic mutation flow

Single draw completion：

```text
candidate
→ canonical authored controls
→ Registry validation
→ full generation preflight
→ valid: one command + Store
→ invalid: active session + rejection, no mutation
```

Batch edit：

```text
capture exact before state
→ stage all features and order
→ validate complete staged state
→ any error: no mutation
→ commit once
→ explicit final selection
→ one History entry
```

## 10. Production and E2E modes

Production and `?basemap=none` load 19 samples.

```text
?e2e=1
```

starts with empty Store and exposes `window.__plotlibrePlayground` for real integration tests.

```text
?e2e=1&squad=1&paths=1&areas=1&circular=1
```

enables the complete selector/sample groups. Basemap state must not alter semantic behavior.

## 11. MapLibre resources

Sources：

```text
plotlibre-committed
plotlibre-selection
plotlibre-draft
plotlibre-handles
```

Layers：

```text
plotlibre-fill
plotlibre-line
plotlibre-point
plotlibre-selection-line
plotlibre-selection-point
plotlibre-draft-fill
plotlibre-draft-line
plotlibre-draft-point
plotlibre-handle-guide
plotlibre-handle
```

`style.load` idempotently restores Sources, Layers, committed features, selection overlays, active translation preview, draft, Primary handles and guides.

`querySourceFeatures()` can contain tile duplicates. Store controls remain authoritative; handles are de-duplicated by `plotId + handleIndex`.

## 12. Validation

```text
validated head:     2d499a1cb122abbf6fce7548ec32f1b0031dd8f2
CI:                 #409 / 30906467230
Node 20.19:         success
Node 22:            success
Node tests:         219 passed
Chromium tests:     30 passed
Playground build:   success
handover contract:  success
unresolved threads: 0
squash SHA:         04dca0b120b1440afb49a300eeee92faf6644a7d
```

30 Chromium tests cover actual rendering, all symbol completion modes, style reload, editing, PlotJSON, Worker packaging, rendered-feature Shift selection, body translation, unchanged Store during preview, exact undo/redo, Escape rollback and batch Delete restoration.

The documentation-only post-merge finalization must independently pass the unchanged 219/30 baseline.

## 13. Pages deployment

`.github/workflows/pages.yml` deploys `apps/playground/dist` from `main` only.

Always distinguish：

```text
source/build ready
workflow deployed
live page manually verified
```

Do not claim live cache verification from source or CI alone.

## 14. Constraints

- Playground does not directly edit Sources；
- rendered geometry, selection overlays and previews are not canonical data；
- UI does not duplicate geometry/transaction validation；
- basemap failure does not block PlotLibre；
- semantic guides and translation previews remain transient；
- invalid previews never enter Store/History；
- Primary-only edit semantics must remain intact；
- batch mutation is all-or-nothing；
- dev、preview、E2E and Pages use `/PlotLibre/` consistently。

## 15. Next

After the 007A post-merge finalization, start 007B box/lasso design from the latest `main`. Keep rotation/scale, groups/locks, snapping and new symbols outside 007B.

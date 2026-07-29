# `arrow.attack.tailed` Algorithm Record

日期：2026-07-29  
Milestone：005G  
状态：clean-room implementation candidate

## 1. Purpose

`arrow.attack.tailed` is a structurally distinct tail-closing variant of `arrow.attack`.

It preserves the same canonical semantic controls:

```text
controlPoints[0]       = exact tail edge A
controlPoints[1]       = exact tail edge B
controlPoints[2..n-2]  = attack-spine controls
controlPoints[n-1]     = exact objective/tip
```

The variant does not introduce derived notch points into PlotJSON. The notch is regenerated from parameters and the shared attack-arrow frame.

## 2. Public behavior research

Public terminology and high-level behavior were reviewed against the same ol-plot AttackArrow/TailedAttackArrow family revision recorded for the flat attack arrow:

```text
revision: c919e60b4edeaeca53c08f9552f793b2ae9537f0
```

The implementation uses only public behavioral concepts:

- a broad multi-point attack body;
- two semantic tail edges;
- an inward swallowtail opening;
- a shared attack spine and objective.

No reference source code, helper layout, formulas, constants, parameter names or class structure were copied.

## 3. Structural sharing boundary

The variant reuses:

```text
AttackArrowFrame
```

The frame owns:

- local projection;
- exact semantic tail-edge resolution;
- input-order-independent left/right tail identity;
- semantic tail width;
- sampled spine;
- body offset interiors;
- neck/head geometry;
- exact semantic tip restoration.

The tailed variant owns only the closing strategy behind the body.

This avoids copying `buildAttackArrowRing()` and preserves the flat attack golden contract.

## 4. Parameters

Additional parameters:

```text
tailNotchDepthRatio
    inward notch depth / full semantic tail width

tailNotchWidthRatio
    notch opening width / full semantic tail width
```

Defaults:

```text
tailNotchDepthRatio = 0.75
tailNotchWidthRatio = 0.65
```

Validation ranges:

```text
0.05 <= tailNotchDepthRatio <= 2.5
0.10 <= tailNotchWidthRatio <= 0.95
```

Dynamic validation also requires the notch to remain safely behind the arrow neck.

## 5. Tail construction

Let:

```text
C = tail center
L = exact semantic left tail edge
R = exact semantic right tail edge
D = initial normalized spine direction
W = semantic tail width
```

Derived notch points:

```text
leftRoot  = C + normalize(L - C) * W * tailNotchWidthRatio / 2
rightRoot = C + normalize(R - C) * W * tailNotchWidthRatio / 2
notchTip  = C + D * W * tailNotchDepthRatio
```

The local polygon closes through:

```text
... right body
→ R
→ rightRoot
→ notchTip
→ leftRoot
→ L
→ left body ...
```

Ring orientation is normalized to counterclockwise.

## 6. Exact semantic guarantees

The derived ring must contain exactly:

- the resolved semantic left tail edge;
- the resolved semantic right tail edge;
- the exact semantic objective/tip.

Swapping the first two input controls does not change the geometric result.

## 7. Topology policy

The output must be:

- finite;
- closed;
- counterclockwise;
- simple.

The generator rejects:

- invalid tail width;
- a tail baseline that does not cross the initial spine direction;
- invalid notch ratios;
- a notch that reaches too far toward the neck;
- a notch that passes the neck plane;
- self-intersecting body or notch geometry.

`tailedAttackArrowDefinition.validate()` performs complete renderability validation before Store mutation.

## 8. Golden contract

The golden test is intentionally relational:

```text
tailed body/head coordinates
= flat attack golden coordinates
```

The tailed ring adds exactly three unique notch vertices before the unchanged flat attack body/head sequence and then closes back to the first notch root.

This simultaneously verifies:

- shared frame reuse;
- no flat generator duplication;
- no regression to the flat attack body/head;
- deterministic notch construction.

## 9. Interaction

The Definition uses the existing `MultiPointDrawSession` contract:

- first two clicks define tail edges;
- third candidate produces the first valid draft;
- later clicks add spine controls;
- double-click or Enter completes;
- Backspace/Delete removes one uncommitted point;
- Escape cancels;
- all semantic tail/spine controls are editable;
- one valid drag produces one undoable replace command.

Notch roots and notch tip are derived vertices and are not handles.

## 10. PlotJSON

PlotJSON stores:

```text
plotType = arrow.attack.tailed
controlPoints
flat attack parameters
tailNotchDepthRatio
tailNotchWidthRatio
style
metadata
revision
```

It does not store sampled spine points, offset vertices, head vertices or notch vertices.

## 11. Scope exclusions

Milestone 005G does not implement:

- double arrows;
- pincer arrows;
- route or corridor symbols;
- parameter handles;
- committed control-point insertion/removal;
- snapping or constraints;
- a general Store/History transaction rewrite.

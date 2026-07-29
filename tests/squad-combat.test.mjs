import assert from "node:assert/strict";
import test from "node:test";
import {
  createPlotDocument,
  createPlotFeature,
  parsePlotDocument,
  PlotRegistry,
  serializePlotDocument,
} from "@plotlibre/core";
import {
  buildSquadCombatRing,
  createLocalProjection,
  deriveSquadCombatAttackControls,
  isSimpleRing,
  resolveSquadCombatParameters,
  ringWinding,
  signedRingArea,
} from "@plotlibre/geometry";
import { MultiPointDrawSession } from "@plotlibre/interaction";
import {
  builtInSymbols,
  SQUAD_COMBAT_ARROW_TYPE,
  squadCombatArrowDefinition,
} from "@plotlibre/symbols";

const controls = [
  [118.75, 32.03],
  [118.775, 32.065],
  [118.82, 32.105],
];

test("squad combat derives symmetric tail edges from the semantic path", () => {
  const attackControls = deriveSquadCombatAttackControls(controls);
  assert.equal(attackControls.length, controls.length + 1);
  assert.deepEqual(attackControls.slice(2), controls.slice(1));

  const projection = createLocalProjection(controls[0]);
  const center = projection.project(controls[0]);
  const left = projection.project(attackControls[0]);
  const right = projection.project(attackControls[1]);
  assert.ok(Math.abs((left.x + right.x) / 2 - center.x) < 1e-6);
  assert.ok(Math.abs((left.y + right.y) / 2 - center.y) < 1e-6);
});

test("squad combat supports the minimum two-control straight path", () => {
  const minimum = [
    [118.75, 32.03],
    [118.84, 32.1],
  ];
  const ring = buildSquadCombatRing(minimum);
  assert.ok(ring.length > 10);
  assert.deepEqual(ring[0], ring.at(-1));
  assert.ok(
    ring.some(
      (point) => point[0] === minimum[1][0] && point[1] === minimum[1][1],
    ),
  );
});

test("squad combat produces a finite counterclockwise simple polygon", () => {
  const ring = buildSquadCombatRing(controls);
  const projection = createLocalProjection(controls[0]);
  const local = ring.map((position) => projection.project(position));
  assert.deepEqual(ring[0], ring.at(-1));
  assert.equal(ringWinding(local), "counterclockwise");
  assert.equal(isSimpleRing(local, 1e-6), true);
  for (const coordinate of ring) {
    assert.equal(Number.isFinite(coordinate[0]), true);
    assert.equal(Number.isFinite(coordinate[1]), true);
  }
});

test("squad combat responds to path shape and derived-width ratio", () => {
  const straight = buildSquadCombatRing([
    [0, 0],
    [0, 0.01],
  ]);
  const curved = buildSquadCombatRing([
    [0, 0],
    [0.0015, 0.005],
    [0, 0.01],
  ]);
  assert.notDeepEqual(straight, curved);

  const projection = createLocalProjection(controls[0]);
  const narrow = buildSquadCombatRing(controls, {
    tailWidthPathRatio: 0.02,
  }).map((point) => projection.project(point));
  const wide = buildSquadCombatRing(controls, {
    tailWidthPathRatio: 0.05,
  }).map((point) => projection.project(point));
  assert.ok(Math.abs(signedRingArea(wide)) > Math.abs(signedRingArea(narrow)));
});

test("squad combat rejects degenerate paths and invalid width ratios", () => {
  assert.throws(
    () => buildSquadCombatRing([[0, 0]]),
    /at least two control points/,
  );
  assert.throws(
    () => buildSquadCombatRing([[0, 0], [0, 0]]),
    /distinct direction/,
  );
  assert.throws(
    () => resolveSquadCombatParameters({ tailWidthPathRatio: 0.5 }),
    /tailWidthPathRatio must be between/,
  );
});

test("squad combat is registered with center-path semantics", () => {
  const registry = new PlotRegistry().registerMany(builtInSymbols);
  assert.equal(registry.has(SQUAD_COMBAT_ARROW_TYPE), true);
  assert.deepEqual(squadCombatArrowDefinition.controlSchema, {
    minPoints: 2,
    maxPoints: 64,
    completeOnDoubleClick: true,
    allowPointInsertion: true,
    allowPointRemoval: true,
  });

  const feature = createPlotFeature({
    id: "squad-combat-1",
    plotType: SQUAD_COMBAT_ARROW_TYPE,
    definitionVersion: squadCombatArrowDefinition.version,
    controlPoints: controls,
    parameters: squadCombatArrowDefinition.defaultParameters,
  });
  const bundle = registry.generate(feature);
  assert.equal(bundle.fills.length, 1);
  assert.equal(bundle.lines.length, 1);
  assert.equal(bundle.hitAreas.length, 1);
  assert.equal(bundle.fills[0]?.properties.plotType, SQUAD_COMBAT_ARROW_TYPE);
});

test("PlotJSON preserves the authored center path without derived tails", () => {
  const feature = createPlotFeature({
    id: "squad-combat-json",
    plotType: SQUAD_COMBAT_ARROW_TYPE,
    definitionVersion: squadCombatArrowDefinition.version,
    controlPoints: controls,
    parameters: squadCombatArrowDefinition.defaultParameters,
  });
  const document = createPlotDocument({
    id: "squad-combat-document",
    name: "Squad Combat Arrow",
    features: [feature],
  });
  const parsed = parsePlotDocument(serializePlotDocument(document));
  assert.deepEqual(parsed, document);
  assert.deepEqual(parsed.features[0]?.controlPoints, controls);
});

test("variable two-point path sessions preview and complete without a symbol branch", () => {
  const session = new MultiPointDrawSession({
    id: "squad-combat-session",
    plotType: SQUAD_COMBAT_ARROW_TYPE,
    minimumPoints: 2,
    maximumPoints: 64,
    completeAtMaximum: false,
  });
  session.click([0, 0]);
  const preview = session.pointerMove([1, 1]);
  assert.deepEqual(preview.draft?.controlPoints, [
    [0, 0],
    [1, 1],
  ]);
  const completed = session.doubleClick([1, 1]);
  assert.equal(completed.status, "completed");
  assert.deepEqual(completed.completed?.controlPoints, [
    [0, 0],
    [1, 1],
  ]);
});

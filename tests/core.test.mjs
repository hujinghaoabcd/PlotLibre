import assert from "node:assert/strict";
import test from "node:test";
import {
  CommandHistory,
  CreatePlotCommand,
  createPlotDocument,
  createPlotFeature,
  parsePlotDocument,
  PlotRegistry,
  PlotStore,
  serializePlotDocument,
} from "@plotlibre/core";

const definition = {
  type: "test.two-point",
  title: "Test",
  category: "test",
  version: "1.0.0",
  controlSchema: { minPoints: 2, maxPoints: 2 },
  defaultParameters: {},
  defaultStyle: {},
  generate: () => ({
    fills: [],
    lines: [],
    points: [],
    labels: [],
    hitAreas: [],
  }),
};

test("registry validates point counts and prevents duplicate definitions", () => {
  const registry = new PlotRegistry().register(definition);
  assert.equal(registry.has(definition.type), true);
  assert.throws(() => registry.register(definition), /already registered/);

  const invalid = createPlotFeature({
    id: "one",
    plotType: definition.type,
    controlPoints: [[0, 0]],
  });
  const result = registry.validate(invalid);
  assert.equal(result.valid, false);
  assert.equal(result.issues[0]?.code, "TOO_FEW_CONTROL_POINTS");
});

test("store and history support reversible creation", () => {
  const store = new PlotStore();
  const history = new CommandHistory();
  const feature = createPlotFeature({
    id: "arrow-1",
    plotType: definition.type,
    controlPoints: [
      [0, 0],
      [1, 1],
    ],
  });

  history.execute(new CreatePlotCommand(store, feature));
  assert.equal(store.size, 1);
  assert.equal(history.undo(), true);
  assert.equal(store.size, 0);
  assert.equal(history.redo(), true);
  assert.equal(store.get("arrow-1").plotType, definition.type);
});

test("PlotJSON round-trips semantic control points", () => {
  const feature = createPlotFeature({
    id: "arrow-1",
    plotType: definition.type,
    controlPoints: [
      [118.7, 32.0],
      [118.9, 32.2],
    ],
    parameters: { width: 0.1 },
  });
  const document = createPlotDocument({
    id: "document-1",
    name: "Example",
    features: [feature],
  });
  const parsed = parsePlotDocument(serializePlotDocument(document));
  assert.deepEqual(parsed, document);
});

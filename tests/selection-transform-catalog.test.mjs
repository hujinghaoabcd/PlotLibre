import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  createPlotFeature,
  PlotRegistry,
} from "@plotlibre/core";
import { createLocalProjection } from "@plotlibre/geometry";
import { SelectionTransformSession } from "@plotlibre/interaction";
import { builtInSymbols } from "@plotlibre/symbols";

const ORIGIN = [118.8, 32.06];
const AUTHORITATIVE_FIXTURE_BY_TYPE = Object.freeze({
  "arrow.attack": loadFixture("attack-arrow.json"),
  "arrow.attack.tailed": loadFixture("tailed-attack-arrow.json"),
  "arrow.double": loadFixture("double-arrow.json"),
  "arrow.pincer": loadFixture("pincer-arrow.json"),
});

function loadFixture(filename) {
  return JSON.parse(
    readFileSync(new URL(`./fixtures/${filename}`, import.meta.url), "utf8"),
  );
}

function localPosition(x, y) {
  return createLocalProjection(ORIGIN).unproject({ x, y });
}

function genericControlFixture(count) {
  const fixed = [
    [-160, -45],
    [-95, 55],
    [-20, 105],
    [65, 70],
    [145, -10],
    [80, -90],
    [-25, -115],
    [-120, -80],
  ];
  return Array.from({ length: count }, (_, index) => {
    const point = fixed[index];
    if (point) return localPosition(point[0], point[1]);
    const angle = index * 0.72;
    const radius = 120 + index * 12;
    return localPosition(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
    );
  });
}

function pointAt(frame, x, y) {
  return {
    x: frame.pivotMeters.x + x,
    y: frame.pivotMeters.y + y,
  };
}

function buildFeature(registry, definition) {
  const fixture = AUTHORITATIVE_FIXTURE_BY_TYPE[definition.type];
  const controlPoints = fixture?.controlPoints ??
    genericControlFixture(definition.controlSchema.minPoints);
  const parameters = {
    ...definition.defaultParameters,
    ...(fixture?.parameters ?? {}),
  };
  const feature = registry.canonicalize(
    createPlotFeature({
      id: `catalog-${definition.type}`,
      plotType: definition.type,
      definitionVersion: definition.version,
      controlPoints,
      parameters,
      style: { ...definition.defaultStyle },
      metadata: { catalogSmoke: true },
    }),
  );
  registry.generate(feature);
  return feature;
}

test("all public Definitions rotate through complete Registry preflight", () => {
  assert.equal(builtInSymbols.length, 19);
  const registry = new PlotRegistry().registerMany(builtInSymbols);

  for (const definition of builtInSymbols) {
    const original = buildFeature(registry, definition);
    const session = new SelectionTransformSession(
      "rotate",
      [original],
      registry,
    );
    session.pointerDown(pointAt(session.frame, 0, 300));
    const completion = session.pointerUp(pointAt(session.frame, 300, 0));

    assert.equal(
      completion.completed,
      true,
      `${definition.type} should complete clockwise rotation`,
    );
    assert.equal(completion.transformed.length, 1);
    assert.equal(completion.transformed[0].id, original.id);
    assert.equal(completion.transformed[0].revision, original.revision + 1);
    assert.deepEqual(completion.transformed[0].parameters, original.parameters);
    assert.deepEqual(completion.transformed[0].style, original.style);
    assert.deepEqual(completion.transformed[0].metadata, original.metadata);
  }
});

test("all public Definitions accept a modest positive uniform-scale smoke", () => {
  const registry = new PlotRegistry().registerMany(builtInSymbols);

  for (const definition of builtInSymbols) {
    const original = buildFeature(registry, definition);
    const session = new SelectionTransformSession(
      "scale",
      [original],
      registry,
    );
    session.pointerDown(pointAt(session.frame, 250, 0));
    const completion = session.pointerUp(pointAt(session.frame, 300, 0));

    assert.equal(
      completion.completed,
      true,
      `${definition.type} should complete positive uniform scale`,
    );
    assert.equal(completion.transformed[0].revision, original.revision + 1);
    assert.deepEqual(completion.transformed[0].parameters, original.parameters);
    assert.deepEqual(completion.transformed[0].style, original.style);
    assert.deepEqual(completion.transformed[0].metadata, original.metadata);
  }
});

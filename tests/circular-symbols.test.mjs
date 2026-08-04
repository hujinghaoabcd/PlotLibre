import assert from "node:assert/strict";
import test from "node:test";
import {
  createPlotDocument,
  createPlotFeature,
  parsePlotDocument,
  PlotRegistry,
  serializePlotDocument,
} from "@plotlibre/core";
import { createLocalProjection } from "@plotlibre/geometry";
import {
  areaSymbols,
  arrowSymbols,
  builtInSymbols,
  CIRCULAR_ARC_TYPE,
  circularArcDefinition,
  CIRCULAR_SEGMENT_TYPE,
  circularSegmentDefinition,
  lineSymbols,
  SECTOR_TYPE,
  sectorDefinition,
} from "@plotlibre/symbols";

const projection = createLocalProjection([118.8, 32.0]);
const position = (x, y) => projection.unproject({ x, y });
const pointOnCircle = (radius, degrees) => {
  const radians = (degrees * Math.PI) / 180;
  return position(radius * Math.cos(radians), radius * Math.sin(radians));
};

const arcControls = [
  pointOnCircle(1_000, 0),
  pointOnCircle(1_000, 45),
  pointOnCircle(1_000, 90),
];
const segmentControls = [
  pointOnCircle(1_200, 0),
  pointOnCircle(1_200, 240),
  pointOnCircle(1_200, 90),
];
const sectorControls = [
  position(0, 0),
  position(1_000, 0),
  position(0, -2_500),
];

function createFeature(definition, id, controlPoints, parameters = {}) {
  return createPlotFeature({
    id,
    plotType: definition.type,
    definitionVersion: definition.version,
    controlPoints,
    parameters: {
      ...definition.defaultParameters,
      ...parameters,
    },
  });
}

test("circular family extends the built-in catalog without changing arrow symbols", () => {
  assert.equal(arrowSymbols.length, 14);
  assert.equal(lineSymbols.length, 1);
  assert.equal(areaSymbols.length, 4);
  assert.equal(builtInSymbols.length, 19);
  assert.deepEqual(lineSymbols.map((definition) => definition.type), [
    CIRCULAR_ARC_TYPE,
  ]);
  assert.equal(areaSymbols.some((definition) => definition.type === CIRCULAR_SEGMENT_TYPE), true);
  assert.equal(areaSymbols.some((definition) => definition.type === SECTOR_TYPE), true);
});

test("circular arc Definition emits only line and hit-area roles", () => {
  const registry = new PlotRegistry().registerMany(builtInSymbols);
  const feature = createFeature(
    circularArcDefinition,
    "circular-arc-1",
    arcControls,
  );
  const bundle = registry.generate(feature);

  assert.equal(bundle.fills.length, 0);
  assert.equal(bundle.lines.length, 1);
  assert.equal(bundle.hitAreas.length, 1);
  assert.equal(bundle.lines[0]?.geometry.type, "LineString");
  assert.equal(bundle.lines[0]?.properties.plotType, CIRCULAR_ARC_TYPE);
  assert.equal(bundle.lines[0]?.properties.role, "line");
  assert.equal(bundle.hitAreas[0]?.properties.role, "hit-area");
});

test("circular segment and sector emit independent Polygon bundles", () => {
  const registry = new PlotRegistry().registerMany(builtInSymbols);
  const cases = [
    [circularSegmentDefinition, "segment-1", segmentControls],
    [sectorDefinition, "sector-1", sectorControls],
  ];

  for (const [definition, id, controls] of cases) {
    const feature = createFeature(definition, id, controls);
    const bundle = registry.generate(feature);
    assert.equal(bundle.fills.length, 1);
    assert.equal(bundle.lines.length, 1);
    assert.equal(bundle.hitAreas.length, 1);
    assert.equal(bundle.fills[0]?.geometry.type, "Polygon");
    assert.equal(bundle.fills[0]?.properties.plotType, definition.type);
    assert.equal(bundle.lines[0]?.properties.role, "outline");
  }
});

test("sector direction parameter changes derived geometry without moving controls", () => {
  const registry = new PlotRegistry().registerMany(builtInSymbols);
  const clockwise = createFeature(
    sectorDefinition,
    "sector-clockwise",
    sectorControls,
    { sweepDirection: "clockwise" },
  );
  const counterclockwise = createFeature(
    sectorDefinition,
    "sector-counterclockwise",
    sectorControls,
    { sweepDirection: "counterclockwise" },
  );
  const clockwiseBundle = registry.generate(clockwise);
  const counterclockwiseBundle = registry.generate(counterclockwise);

  assert.deepEqual(clockwise.controlPoints, sectorControls);
  assert.deepEqual(counterclockwise.controlPoints, sectorControls);
  assert.notDeepEqual(
    clockwiseBundle.fills[0]?.geometry,
    counterclockwiseBundle.fills[0]?.geometry,
  );
});

test("PlotJSON preserves only authored circular controls and parameters", () => {
  const features = [
    createFeature(circularArcDefinition, "arc-json", arcControls),
    createFeature(circularSegmentDefinition, "segment-json", segmentControls),
    createFeature(sectorDefinition, "sector-json", sectorControls, {
      sweepDirection: "counterclockwise",
    }),
  ];
  const document = createPlotDocument({
    id: "circular-document",
    name: "Circular Family",
    features,
  });
  const parsed = parsePlotDocument(serializePlotDocument(document));

  assert.deepEqual(parsed, document);
  assert.deepEqual(parsed.features[0]?.controlPoints, arcControls);
  assert.deepEqual(parsed.features[1]?.controlPoints, segmentControls);
  assert.deepEqual(parsed.features[2]?.controlPoints, sectorControls);
  assert.equal(
    parsed.features[2]?.parameters.sweepDirection,
    "counterclockwise",
  );
  assert.equal(parsed.features[2]?.controlPoints.length, 3);
});

test("Registry preflight rejects invalid circular geometry and parameters", () => {
  const registry = new PlotRegistry().registerMany(builtInSymbols);
  const collinear = createFeature(circularArcDefinition, "invalid-arc", [
    position(-1_000, 0),
    position(0, 0),
    position(1_000, 0),
  ]);
  assert.throws(
    () => registry.generate(collinear),
    /collinear or numerically unstable/,
  );

  const zeroSweep = createFeature(sectorDefinition, "invalid-sector", [
    position(0, 0),
    position(1_000, 0),
    position(2_000, 0),
  ]);
  assert.throws(
    () => registry.generate(zeroSweep),
    /greater than zero and less than 360/,
  );

  const invalidDirection = createFeature(
    sectorDefinition,
    "invalid-sector-direction",
    sectorControls,
    { sweepDirection: "sideways" },
  );
  assert.throws(
    () => registry.generate(invalidDirection),
    /clockwise.*counterclockwise/,
  );
});

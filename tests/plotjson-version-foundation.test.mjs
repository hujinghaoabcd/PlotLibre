import assert from "node:assert/strict";
import test from "node:test";
import {
  comparePlotJsonVersions,
  CURRENT_PLOTJSON_SCHEMA_VERSION,
  isCanonicalPlotJsonVersion,
  parsePlotJsonVersion,
  PLOTJSON_DOCUMENT_TYPE,
  PlotJsonError,
  PlotLibreError,
} from "@plotlibre/core";

test("PlotJSON constants preserve the current public envelope", () => {
  assert.equal(PLOTJSON_DOCUMENT_TYPE, "PlotLibreDocument");
  assert.equal(CURRENT_PLOTJSON_SCHEMA_VERSION, "1.0.0");
});

test("canonical numeric triples parse into immutable numeric versions", () => {
  for (const [source, expected] of [
    ["0.0.0", { major: 0, minor: 0, patch: 0, value: "0.0.0" }],
    ["1.0.0", { major: 1, minor: 0, patch: 0, value: "1.0.0" }],
    [
      `${Number.MAX_SAFE_INTEGER}.2.3`,
      {
        major: Number.MAX_SAFE_INTEGER,
        minor: 2,
        patch: 3,
        value: `${Number.MAX_SAFE_INTEGER}.2.3`,
      },
    ],
  ]) {
    const parsed = parsePlotJsonVersion(source);
    assert.deepEqual(parsed, expected);
    assert.equal(Object.isFrozen(parsed), true);
    assert.equal(isCanonicalPlotJsonVersion(source), true);
  }
});

test("malformed or unsafe persisted versions fail with one stable code", () => {
  const invalid = [
    undefined,
    null,
    1,
    "",
    "v1.0.0",
    "1.0",
    "1.0.0.0",
    "01.0.0",
    "1.00.0",
    "1.0.00",
    "-1.0.0",
    "1.-1.0",
    "1.0.-1",
    "1.2.3-beta.1",
    "1.2.3+build",
    "1.2.3 ",
    " 1.2.3",
    "1.2.3\n",
    "1.2.3e0",
    "1.2.3.4",
    `${Number.MAX_SAFE_INTEGER + 1}.0.0`,
  ];

  for (const source of invalid) {
    assert.equal(isCanonicalPlotJsonVersion(source), false);
    assert.throws(
      () => parsePlotJsonVersion(source),
      (error) => {
        assert.ok(error instanceof PlotJsonError);
        assert.ok(error instanceof PlotLibreError);
        assert.equal(error.code, "PLOTJSON_SCHEMA_VERSION_INVALID");
        return true;
      },
    );
  }
});

test("version comparison is numeric rather than lexical", () => {
  assert.equal(comparePlotJsonVersions("1.2.9", "1.10.0"), -1);
  assert.equal(comparePlotJsonVersions("10.0.0", "2.99.99"), 1);
  assert.equal(comparePlotJsonVersions("2.3.4", "2.3.4"), 0);
  assert.equal(comparePlotJsonVersions("2.3.5", "2.3.4"), 1);
  assert.equal(
    comparePlotJsonVersions(
      parsePlotJsonVersion("3.0.0"),
      parsePlotJsonVersion("3.0.1"),
    ),
    -1,
  );
});

test("comparison rejects forged parsed-version records", () => {
  assert.throws(
    () =>
      comparePlotJsonVersions(
        { major: 2, minor: 0, patch: 0, value: "1.0.0" },
        "1.0.0",
      ),
    (error) => {
      assert.equal(error.code, "PLOTJSON_SCHEMA_VERSION_INVALID");
      return true;
    },
  );
});

test("PlotJsonError exposes scalar context without retaining documents", () => {
  const cause = new Error("internal");
  const error = new PlotJsonError(
    "PLOTJSON_RESOURCE_LIMIT_EXCEEDED",
    "A limit was exceeded.",
    {
      path: "$.features[4]",
      featureId: "feature-4",
      plotType: "arrow.straight",
      sourceVersion: "0.9.0",
      targetVersion: "1.0.0",
      limitName: "features",
      limit: 4,
      actual: 5,
      cause,
    },
  );

  assert.ok(error instanceof PlotJsonError);
  assert.ok(error instanceof PlotLibreError);
  assert.ok(error instanceof Error);
  assert.equal(error.name, "PlotJsonError");
  assert.equal(error.code, "PLOTJSON_RESOURCE_LIMIT_EXCEEDED");
  assert.equal(error.path, "$.features[4]");
  assert.equal(error.featureId, "feature-4");
  assert.equal(error.plotType, "arrow.straight");
  assert.equal(error.sourceVersion, "0.9.0");
  assert.equal(error.targetVersion, "1.0.0");
  assert.equal(error.limitName, "features");
  assert.equal(error.limit, 4);
  assert.equal(error.actual, 5);
  assert.equal(error.cause, cause);
  assert.equal("document" in error, false);
});

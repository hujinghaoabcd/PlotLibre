import assert from "node:assert/strict";
import test from "node:test";
import {
  clonePlotJsonValue,
  parsePlotJsonVersion,
  PlotJsonError,
  scanPlotJsonValue,
} from "@plotlibre/core";

function expectFailure(operation, code, path) {
  assert.throws(operation, (error) => {
    assert.ok(error instanceof PlotJsonError);
    assert.equal(error.code, code);
    if (path !== undefined) assert.equal(error.path, path);
    return true;
  });
}

test("object keys participate in the string-length guard and statistics", () => {
  const value = { abcde: "x" };
  const statistics = scanPlotJsonValue(value, {
    limits: { stringLength: 5 },
  });
  assert.equal(statistics.maximumStringLength, 5);

  expectFailure(
    () => clonePlotJsonValue(value, { limits: { stringLength: 4 } }),
    "PLOTJSON_RESOURCE_LIMIT_EXCEEDED",
    "$",
  );
});

test("lexicographic key traversal produces deterministic first-error paths", () => {
  const first = {};
  first.z = undefined;
  first.a = undefined;

  const second = {};
  second.a = undefined;
  second.z = undefined;

  for (const value of [first, second]) {
    expectFailure(
      () => clonePlotJsonValue(value),
      "PLOTJSON_VALUE_NOT_JSON",
      "$.a",
    );
  }
});

test("array accessors and symbol properties reject without getter invocation", () => {
  let getterCalls = 0;
  const accessor = [0];
  Object.defineProperty(accessor, "0", {
    enumerable: true,
    configurable: true,
    get() {
      getterCalls += 1;
      return 4;
    },
  });
  expectFailure(
    () => clonePlotJsonValue(accessor),
    "PLOTJSON_VALUE_NOT_JSON",
    "$[0]",
  );
  assert.equal(getterCalls, 0);

  const symbol = [1];
  symbol[Symbol("hidden")] = 2;
  expectFailure(
    () => clonePlotJsonValue(symbol),
    "PLOTJSON_VALUE_NOT_JSON",
    "$",
  );
});

test("malformed version errors do not echo the untrusted version payload", () => {
  const payload = `1.0.${"9".repeat(10_000)}-invalid`;
  assert.throws(
    () => parsePlotJsonVersion(payload),
    (error) => {
      assert.equal(error.code, "PLOTJSON_SCHEMA_VERSION_INVALID");
      assert.equal(error.message.includes(payload), false);
      assert.ok(error.message.length < 256);
      return true;
    },
  );
});

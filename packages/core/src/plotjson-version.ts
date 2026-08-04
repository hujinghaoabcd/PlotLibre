import { PlotJsonError } from "./plotjson-error.js";

export const PLOTJSON_DOCUMENT_TYPE = "PlotLibreDocument" as const;
export const CURRENT_PLOTJSON_SCHEMA_VERSION = "1.0.0" as const;

export interface PlotJsonVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly value: string;
}

const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

/** Parses one canonical numeric MAJOR.MINOR.PATCH PlotJSON version. */
export function parsePlotJsonVersion(value: unknown): PlotJsonVersion {
  if (typeof value !== "string") {
    throw invalidVersion(value);
  }
  const match = VERSION_PATTERN.exec(value);
  if (!match) throw invalidVersion(value);

  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  if (
    !Number.isSafeInteger(major) ||
    !Number.isSafeInteger(minor) ||
    !Number.isSafeInteger(patch)
  ) {
    throw invalidVersion(value);
  }

  return Object.freeze({ major, minor, patch, value });
}

/** Compares versions numerically and returns -1, 0 or 1. */
export function comparePlotJsonVersions(
  left: string | PlotJsonVersion,
  right: string | PlotJsonVersion,
): -1 | 0 | 1 {
  const leftVersion = typeof left === "string"
    ? parsePlotJsonVersion(left)
    : validateParsedVersion(left);
  const rightVersion = typeof right === "string"
    ? parsePlotJsonVersion(right)
    : validateParsedVersion(right);

  if (leftVersion.major !== rightVersion.major) {
    return leftVersion.major < rightVersion.major ? -1 : 1;
  }
  if (leftVersion.minor !== rightVersion.minor) {
    return leftVersion.minor < rightVersion.minor ? -1 : 1;
  }
  if (leftVersion.patch !== rightVersion.patch) {
    return leftVersion.patch < rightVersion.patch ? -1 : 1;
  }
  return 0;
}

export function isCanonicalPlotJsonVersion(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    parsePlotJsonVersion(value);
    return true;
  } catch {
    return false;
  }
}

function validateParsedVersion(value: PlotJsonVersion): PlotJsonVersion {
  const parsed = parsePlotJsonVersion(value.value);
  if (
    parsed.major !== value.major ||
    parsed.minor !== value.minor ||
    parsed.patch !== value.patch
  ) {
    throw invalidVersion(value.value);
  }
  return parsed;
}

function invalidVersion(value: unknown): PlotJsonError {
  const display = typeof value === "string" ? `"${value}"` : typeof value;
  return new PlotJsonError(
    "PLOTJSON_SCHEMA_VERSION_INVALID",
    `PlotJSON version ${display} must be a canonical numeric MAJOR.MINOR.PATCH triple.`,
  );
}

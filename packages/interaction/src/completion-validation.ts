import type {
  PlotFeatureInput,
  ValidationIssue,
} from "@plotlibre/core";
import type {
  DrawCompletionValidationResult,
  DrawSessionFeatureOptions,
  DrawSessionRejection,
} from "./types.js";

export type CompletionEvaluation =
  | { readonly valid: true }
  | { readonly valid: false; readonly rejection: DrawSessionRejection };

const GENERIC_REJECTION: ValidationIssue = {
  code: "DRAW_COMPLETION_REJECTED",
  message: "The current control points do not produce renderable geometry.",
  severity: "error",
};

export function evaluateCompletion(
  validate: DrawSessionFeatureOptions["validateCompletion"],
  candidate: PlotFeatureInput,
): CompletionEvaluation {
  if (!validate) return { valid: true };

  try {
    const result: DrawCompletionValidationResult = validate(candidate);
    if (typeof result === "boolean") {
      return result
        ? { valid: true }
        : rejectionFromIssues([GENERIC_REJECTION]);
    }
    if (result.valid) return { valid: true };
    return rejectionFromIssues(
      result.issues.length > 0 ? result.issues : [GENERIC_REJECTION],
    );
  } catch (error) {
    return rejectionFromIssues([
      {
        code: "DRAW_COMPLETION_VALIDATION_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Draw completion validation failed.",
        severity: "error",
      },
    ]);
  }
}

function rejectionFromIssues(
  issues: readonly ValidationIssue[],
): CompletionEvaluation {
  return {
    valid: false,
    rejection: {
      kind: "completion-validation",
      issues: issues.map((issue) => ({ ...issue })),
    },
  };
}

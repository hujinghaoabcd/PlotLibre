import {
  type Command,
  type PlotFeature,
  type PlotStore,
} from "@plotlibre/core";
import { BatchEditCommand } from "./batch-edit-command.js";
import {
  type SelectionSnapshot,
  SelectionController,
} from "./selection-controller.js";
import type {
  CompletedSelectionTransform,
  SelectionTransformKind,
  SelectionTransformRejectionCode,
} from "./selection-transform-session.js";

export class SelectionTransformCommandError extends Error {
  public readonly code:
    | "SELECTION_TRANSFORM_FEATURE_MISSING"
    | "SELECTION_TRANSFORM_TRANSACTION_INVALID";
  public readonly featureIds: readonly string[];
  public readonly cause: unknown;

  public constructor(
    code:
      | "SELECTION_TRANSFORM_FEATURE_MISSING"
      | "SELECTION_TRANSFORM_TRANSACTION_INVALID",
    message: string,
    options: {
      readonly featureIds?: readonly string[];
      readonly cause?: unknown;
    } = {},
  ) {
    super(message);
    this.name = "SelectionTransformCommandError";
    this.code = code;
    this.featureIds = Object.freeze([...(options.featureIds ?? [])]);
    this.cause = options.cause;
  }
}

export interface CreateSelectionTransformCommandOptions {
  readonly completion: CompletedSelectionTransform;
  readonly selectionSnapshot: SelectionSnapshot;
}

/**
 * Builds one stale-safe atomic command from a preflighted transform completion.
 *
 * The returned command revalidates exact expected feature values, document
 * order and semantic selection before execute/redo and before undo. It cannot
 * overwrite a Store state that changed after the interactive preview.
 */
export function createSelectionTransformCommand(
  store: PlotStore,
  selection: SelectionController,
  options: CreateSelectionTransformCommandOptions,
): Command | undefined {
  const originals = options.completion.originals;
  const transformed = options.completion.transformed;
  validateCompletionPair(options.completion.kind, originals, transformed);
  validateSelectionMembership(options.selectionSnapshot, originals);

  const replacements: PlotFeature[] = [];
  const undoReplacements: PlotFeature[] = [];
  for (const [index, original] of originals.entries()) {
    const next = transformed[index]!;
    if (sameControlPoints(original, next)) continue;
    replacements.push(next);
    undoReplacements.push(original);
  }
  if (replacements.length === 0) return undefined;

  const orderedIds = Object.freeze(store.list().map((feature) => feature.id));
  const inner = new BatchEditCommand(store, selection, {
    label: options.completion.kind === "rotate"
      ? "rotate-selection"
      : "scale-selection",
    execute: {
      replace: replacements,
      orderedIds,
    },
    undo: {
      replace: undoReplacements,
      orderedIds,
    },
    beforeSelection: options.selectionSnapshot,
    afterSelection: options.selectionSnapshot,
  });

  return new ValidatedSelectionTransformCommand(
    store,
    selection,
    inner,
    options.completion.kind,
    originals,
    transformed,
    orderedIds,
    options.selectionSnapshot,
  );
}

class ValidatedSelectionTransformCommand implements Command {
  public readonly label: string;
  readonly #store: PlotStore;
  readonly #selection: SelectionController;
  readonly #inner: BatchEditCommand;
  readonly #kind: SelectionTransformKind;
  readonly #originals: readonly PlotFeature[];
  readonly #transformed: readonly PlotFeature[];
  readonly #orderedIds: readonly string[];
  readonly #selectionSnapshot: SelectionSnapshot;

  public constructor(
    store: PlotStore,
    selection: SelectionController,
    inner: BatchEditCommand,
    kind: SelectionTransformKind,
    originals: readonly PlotFeature[],
    transformed: readonly PlotFeature[],
    orderedIds: readonly string[],
    selectionSnapshot: SelectionSnapshot,
  ) {
    this.label = inner.label;
    this.#store = store;
    this.#selection = selection;
    this.#inner = inner;
    this.#kind = kind;
    this.#originals = originals;
    this.#transformed = transformed;
    this.#orderedIds = orderedIds;
    this.#selectionSnapshot = selectionSnapshot;
  }

  public execute(): void {
    this.#assertExpectedState(this.#originals, "execute");
    this.#inner.execute();
  }

  public undo(): void {
    this.#assertExpectedState(this.#transformed, "undo");
    this.#inner.undo();
  }

  #assertExpectedState(
    expectedFeatures: readonly PlotFeature[],
    operation: "execute" | "undo",
  ): void {
    const currentOrder = this.#store.list().map((feature) => feature.id);
    if (!sameIds(currentOrder, this.#orderedIds)) {
      throw new SelectionTransformCommandError(
        "SELECTION_TRANSFORM_TRANSACTION_INVALID",
        `Cannot ${operation} ${this.#kind} transform because Store document order changed.`,
        { featureIds: expectedFeatures.map((feature) => feature.id) },
      );
    }

    assertSelectionSemantics(
      this.#selection.snapshot(),
      this.#selectionSnapshot,
      this.#kind,
      operation,
    );

    for (const expected of expectedFeatures) {
      const current = this.#store.find(expected.id);
      if (current === undefined) {
        throw new SelectionTransformCommandError(
          "SELECTION_TRANSFORM_FEATURE_MISSING",
          `Cannot ${operation} ${this.#kind} transform because feature "${expected.id}" is missing.`,
          { featureIds: [expected.id] },
        );
      }
      if (!sameFeature(current, expected)) {
        throw new SelectionTransformCommandError(
          "SELECTION_TRANSFORM_TRANSACTION_INVALID",
          `Cannot ${operation} ${this.#kind} transform because feature "${expected.id}" changed after preview.`,
          { featureIds: [expected.id] },
        );
      }
    }
  }
}

function validateCompletionPair(
  kind: SelectionTransformKind,
  originals: readonly PlotFeature[],
  transformed: readonly PlotFeature[],
): void {
  if (originals.length === 0 || originals.length !== transformed.length) {
    throw new SelectionTransformCommandError(
      "SELECTION_TRANSFORM_TRANSACTION_INVALID",
      `${kind} transform completion must contain matching non-empty before/after feature sets.`,
      { featureIds: originals.map((feature) => feature.id) },
    );
  }

  for (const [index, original] of originals.entries()) {
    const next = transformed[index]!;
    if (next.id !== original.id) {
      throw new SelectionTransformCommandError(
        "SELECTION_TRANSFORM_TRANSACTION_INVALID",
        `${kind} transform cannot change feature ids or feature ordering.`,
        { featureIds: [original.id, next.id] },
      );
    }
    if (
      next.plotType !== original.plotType ||
      next.definitionVersion !== original.definitionVersion ||
      next.revision !== original.revision + 1 ||
      !sameJson(next.parameters, original.parameters) ||
      !sameJson(next.style, original.style) ||
      !sameJson(next.metadata, original.metadata)
    ) {
      throw new SelectionTransformCommandError(
        "SELECTION_TRANSFORM_TRANSACTION_INVALID",
        `${kind} transform may change only authored controls and increment revision exactly once.`,
        { featureIds: [original.id] },
      );
    }
  }
}

function validateSelectionMembership(
  snapshot: SelectionSnapshot,
  originals: readonly PlotFeature[],
): void {
  const featureIds = new Set(originals.map((feature) => feature.id));
  if (
    featureIds.size !== originals.length ||
    snapshot.selectedIds.length !== originals.length ||
    snapshot.selectedIds.some((id) => !featureIds.has(id))
  ) {
    throw new SelectionTransformCommandError(
      "SELECTION_TRANSFORM_TRANSACTION_INVALID",
      "Selection transform completion must cover the complete captured selection.",
      { featureIds: originals.map((feature) => feature.id) },
    );
  }
}

function assertSelectionSemantics(
  current: SelectionSnapshot,
  expected: SelectionSnapshot,
  kind: SelectionTransformKind,
  operation: "execute" | "undo",
): void {
  if (
    !sameIds(current.selectedIds, expected.selectedIds) ||
    current.primaryId !== expected.primaryId
  ) {
    throw new SelectionTransformCommandError(
      "SELECTION_TRANSFORM_TRANSACTION_INVALID",
      `Cannot ${operation} ${kind} transform because selection membership or Primary changed.`,
      { featureIds: expected.selectedIds },
    );
  }
}

function sameFeature(left: PlotFeature, right: PlotFeature): boolean {
  return (
    left.id === right.id &&
    left.plotType === right.plotType &&
    left.definitionVersion === right.definitionVersion &&
    left.revision === right.revision &&
    sameControlPoints(left, right) &&
    sameJson(left.parameters, right.parameters) &&
    sameJson(left.style, right.style) &&
    sameJson(left.metadata, right.metadata)
  );
}

function sameControlPoints(left: PlotFeature, right: PlotFeature): boolean {
  return (
    left.controlPoints.length === right.controlPoints.length &&
    left.controlPoints.every((position, index) => {
      const candidate = right.controlPoints[index];
      return (
        candidate !== undefined &&
        candidate[0] === position[0] &&
        candidate[1] === position[1]
      );
    })
  );
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return (
    left.length === right.length &&
    left.every((id, index) => id === right[index])
  );
}

export type { SelectionTransformRejectionCode };

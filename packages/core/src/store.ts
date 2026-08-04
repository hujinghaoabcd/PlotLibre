import {
  DuplicatePlotFeatureError,
  PlotFeatureNotFoundError,
} from "./errors.js";
import {
  clonePlotFeature,
  createPlotFeature,
  type PlotFeature,
  type PlotFeatureInput,
} from "./types.js";

export type PlotStoreSingleChangeType = "add" | "update" | "remove" | "clear";
export type PlotStoreChangeType = PlotStoreSingleChangeType | "batch";

export interface PlotStoreSingleChange {
  readonly type: PlotStoreSingleChangeType;
  readonly ids: readonly string[];
}

export interface PlotStoreBatchChange {
  readonly type: "batch";
  readonly ids: readonly string[];
  readonly addedIds: readonly string[];
  readonly updatedIds: readonly string[];
  readonly removedIds: readonly string[];
}

export type PlotStoreChange = PlotStoreSingleChange | PlotStoreBatchChange;
export type PlotStoreListener = (change: PlotStoreChange) => void;
export type PlotStoreListenerErrorHandler = (
  errors: readonly unknown[],
  change: PlotStoreChange,
) => void;

export interface PlotStoreOptions {
  readonly onListenerError?: PlotStoreListenerErrorHandler;
}

export interface PlotStoreTransaction {
  readonly add?: readonly (PlotFeatureInput | PlotFeature)[];
  readonly replace?: readonly PlotFeature[];
  readonly remove?: readonly string[];
  /**
   * Optional complete post-transaction document order. Every staged feature id
   * must appear exactly once. This is used by undo paths that must restore
   * removed features to their original positions.
   */
  readonly orderedIds?: readonly string[];
}

export class PlotStore {
  readonly #features = new Map<string, PlotFeature>();
  readonly #listeners = new Set<PlotStoreListener>();
  readonly #onListenerError: PlotStoreListenerErrorHandler;

  public constructor(options: PlotStoreOptions = {}) {
    this.#onListenerError = options.onListenerError ?? reportListenerErrors;
  }

  public add(input: PlotFeatureInput | PlotFeature): PlotFeature {
    if (this.#features.has(input.id)) {
      throw new DuplicatePlotFeatureError(input.id);
    }
    const feature = createPlotFeature(input);
    this.#features.set(feature.id, feature);
    this.#emit(createSingleChange("add", [feature.id]));
    return clonePlotFeature(feature);
  }

  public update(
    id: string,
    updater: (feature: PlotFeature) => PlotFeatureInput | PlotFeature,
  ): PlotFeature {
    const current = this.#features.get(id);
    if (!current) {
      throw new PlotFeatureNotFoundError(id);
    }
    const updatedInput = updater(clonePlotFeature(current));
    if (updatedInput.id !== id) {
      throw new Error("PlotStore.update cannot change a feature id.");
    }
    const updated = createPlotFeature({
      ...updatedInput,
      revision: current.revision + 1,
    });
    this.#features.set(id, updated);
    this.#emit(createSingleChange("update", [id]));
    return clonePlotFeature(updated);
  }

  public replace(feature: PlotFeature): PlotFeature {
    if (!this.#features.has(feature.id)) {
      throw new PlotFeatureNotFoundError(feature.id);
    }
    const cloned = clonePlotFeature(feature);
    this.#features.set(feature.id, cloned);
    this.#emit(createSingleChange("update", [feature.id]));
    return clonePlotFeature(cloned);
  }

  public remove(id: string): PlotFeature {
    const feature = this.#features.get(id);
    if (!feature) {
      throw new PlotFeatureNotFoundError(id);
    }
    this.#features.delete(id);
    this.#emit(createSingleChange("remove", [id]));
    return clonePlotFeature(feature);
  }

  public clear(): readonly PlotFeature[] {
    const removed = this.list();
    if (removed.length === 0) {
      return [];
    }
    this.#features.clear();
    this.#emit(createSingleChange("clear", removed.map((feature) => feature.id)));
    return removed;
  }

  /**
   * Atomically applies a validated document transaction.
   *
   * All feature and ordering preconditions are checked against a staged Map.
   * Store state is replaced only after the complete transaction is valid, and
   * exactly one batch change is emitted after commit. Listener failures are
   * isolated from the committed mutation and from CommandHistory bookkeeping.
   */
  public applyTransaction(transaction: PlotStoreTransaction): PlotStoreBatchChange {
    const additions = (transaction.add ?? []).map((feature) =>
      createPlotFeature(feature)
    );
    const replacements = (transaction.replace ?? []).map((feature) =>
      clonePlotFeature(feature)
    );
    const removalIds = [...(transaction.remove ?? [])];

    const addIds = additions.map((feature) => feature.id);
    const replaceIds = replacements.map((feature) => feature.id);
    assertUniqueTransactionIds(addIds, "add");
    assertUniqueTransactionIds(replaceIds, "replace");
    assertUniqueTransactionIds(removalIds, "remove");
    assertDisjointTransactionIds(addIds, replaceIds, removalIds);

    for (const id of addIds) {
      if (this.#features.has(id)) {
        throw new DuplicatePlotFeatureError(id);
      }
    }
    for (const id of [...replaceIds, ...removalIds]) {
      if (!this.#features.has(id)) {
        throw new PlotFeatureNotFoundError(id);
      }
    }

    const currentOrder = [...this.#features.keys()];
    const removalSet = new Set(removalIds);
    const replacementMap = new Map(
      replacements.map((feature) => [feature.id, feature] as const),
    );

    const removedIds = currentOrder.filter((id) => removalSet.has(id));
    const updatedIds = currentOrder.filter((id) => replacementMap.has(id));
    const addedIds = [...addIds];

    const staged = new Map<string, PlotFeature>();
    for (const [id, feature] of this.#features) {
      staged.set(id, clonePlotFeature(feature));
    }
    for (const id of removalIds) {
      staged.delete(id);
    }
    for (const feature of replacements) {
      staged.set(feature.id, clonePlotFeature(feature));
    }
    for (const feature of additions) {
      staged.set(feature.id, clonePlotFeature(feature));
    }

    const committed = transaction.orderedIds === undefined
      ? staged
      : reorderStagedFeatures(staged, transaction.orderedIds);

    const orderChanged = !sameIds(currentOrder, [...committed.keys()]);
    const change = createBatchChange(addedIds, updatedIds, removedIds);
    if (change.ids.length === 0 && !orderChanged) {
      return change;
    }

    this.#features.clear();
    for (const [id, feature] of committed) {
      this.#features.set(id, feature);
    }
    this.#emit(change);
    return change;
  }

  public get(id: string): PlotFeature {
    const feature = this.#features.get(id);
    if (!feature) {
      throw new PlotFeatureNotFoundError(id);
    }
    return clonePlotFeature(feature);
  }

  public find(id: string): PlotFeature | undefined {
    const feature = this.#features.get(id);
    return feature ? clonePlotFeature(feature) : undefined;
  }

  public has(id: string): boolean {
    return this.#features.has(id);
  }

  public list(): readonly PlotFeature[] {
    return [...this.#features.values()].map(clonePlotFeature);
  }

  public get size(): number {
    return this.#features.size;
  }

  public subscribe(listener: PlotStoreListener): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  #emit(change: PlotStoreChange): void {
    const errors: unknown[] = [];
    for (const listener of [...this.#listeners]) {
      try {
        listener(change);
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length === 0) return;

    const frozenErrors = Object.freeze([...errors]);
    try {
      this.#onListenerError(frozenErrors, change);
    } catch (handlerError) {
      reportListenerErrors(Object.freeze([handlerError, ...frozenErrors]), change);
    }
  }
}

function createSingleChange(
  type: PlotStoreSingleChangeType,
  ids: readonly string[],
): PlotStoreSingleChange {
  return Object.freeze({
    type,
    ids: Object.freeze([...ids]),
  });
}

function createBatchChange(
  addedIds: readonly string[],
  updatedIds: readonly string[],
  removedIds: readonly string[],
): PlotStoreBatchChange {
  const frozenAddedIds = Object.freeze([...addedIds]);
  const frozenUpdatedIds = Object.freeze([...updatedIds]);
  const frozenRemovedIds = Object.freeze([...removedIds]);
  return Object.freeze({
    type: "batch",
    ids: Object.freeze([
      ...frozenRemovedIds,
      ...frozenUpdatedIds,
      ...frozenAddedIds,
    ]),
    addedIds: frozenAddedIds,
    updatedIds: frozenUpdatedIds,
    removedIds: frozenRemovedIds,
  });
}

function assertUniqueTransactionIds(
  ids: readonly string[],
  operation: "add" | "replace" | "remove",
): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      throw new RangeError(
        `PlotStore transaction ${operation} contains duplicate id "${id}".`,
      );
    }
    seen.add(id);
  }
}

function assertDisjointTransactionIds(
  addIds: readonly string[],
  replaceIds: readonly string[],
  removeIds: readonly string[],
): void {
  const operations = [
    ["add", addIds],
    ["replace", replaceIds],
    ["remove", removeIds],
  ] as const;
  const owner = new Map<string, string>();
  for (const [operation, ids] of operations) {
    for (const id of ids) {
      const previous = owner.get(id);
      if (previous !== undefined) {
        throw new RangeError(
          `PlotStore transaction cannot ${previous} and ${operation} feature "${id}" in one commit.`,
        );
      }
      owner.set(id, operation);
    }
  }
}

function reorderStagedFeatures(
  staged: ReadonlyMap<string, PlotFeature>,
  orderedIds: readonly string[],
): Map<string, PlotFeature> {
  assertUniqueTransactionIds(orderedIds, "replace");
  if (orderedIds.length !== staged.size) {
    throw new RangeError(
      "PlotStore transaction orderedIds must contain every post-transaction feature exactly once.",
    );
  }

  const ordered = new Map<string, PlotFeature>();
  for (const id of orderedIds) {
    const feature = staged.get(id);
    if (!feature) {
      throw new RangeError(
        `PlotStore transaction orderedIds contains unknown id "${id}".`,
      );
    }
    ordered.set(id, feature);
  }
  return ordered;
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return (
    left.length === right.length &&
    left.every((id, index) => id === right[index])
  );
}

function reportListenerErrors(
  errors: readonly unknown[],
  change: PlotStoreChange,
): void {
  globalThis.console?.error(
    `[PlotLibre] ${errors.length} PlotStore listener error(s) after ${change.type} commit.`,
    ...errors,
  );
}

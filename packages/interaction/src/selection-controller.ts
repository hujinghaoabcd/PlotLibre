import {
  PlotFeatureNotFoundError,
  type PlotStore,
} from "@plotlibre/core";

export type SelectionIntent = "replace" | "add" | "subtract" | "toggle";
export type SelectionRegionChangeReason = "box" | "lasso";

export type SelectionChangeReason =
  | "replace"
  | "add"
  | "subtract"
  | "toggle"
  | "primary"
  | "clear"
  | "store-reconcile"
  | "history-execute"
  | "history-undo"
  | "history-redo"
  | SelectionRegionChangeReason;

export interface SelectionSnapshot {
  readonly selectedIds: readonly string[];
  readonly primaryId?: string;
  readonly revision: number;
}

export interface SelectionChange {
  readonly before: SelectionSnapshot;
  readonly after: SelectionSnapshot;
  readonly reason: SelectionChangeReason;
}

export type SelectionListener = (change: SelectionChange) => void;

/**
 * Engine-independent transient multi-selection state.
 *
 * Selection membership is reconciled against PlotStore removals, but selection
 * itself never mutates PlotFeature state or enters PlotJSON.
 */
export class SelectionController {
  readonly #store: PlotStore;
  readonly #listeners = new Set<SelectionListener>();
  readonly #unsubscribeStore: () => void;
  #selectedIds: string[] = [];
  #revision = 0;
  #storeReconciliationPauseDepth = 0;

  public constructor(store: PlotStore) {
    this.#store = store;
    this.#unsubscribeStore = store.subscribe(() => {
      this.#reconcileStore();
    });
  }

  public snapshot(): SelectionSnapshot {
    return createSnapshot(this.#selectedIds, this.#revision);
  }

  public get selectedIds(): readonly string[] {
    return [...this.#selectedIds];
  }

  public get primaryId(): string | undefined {
    return this.#selectedIds.at(-1);
  }

  public get revision(): number {
    return this.#revision;
  }

  public get size(): number {
    return this.#selectedIds.length;
  }

  public has(id: string): boolean {
    return this.#selectedIds.includes(id);
  }

  /**
   * Applies an adapter-normalized click/selection intent without inspecting any
   * browser or map-engine modifier keys.
   */
  public applyIntent(
    id: string | undefined,
    intent: SelectionIntent,
  ): SelectionSnapshot {
    if (id === undefined) {
      return intent === "replace" ? this.clear() : this.snapshot();
    }

    this.#assertExists(id);
    switch (intent) {
      case "replace":
        return this.has(id) ? this.makePrimary(id) : this.replace([id]);
      case "add":
        return this.add([id]);
      case "subtract":
        return this.has(id) ? this.subtract([id]) : this.snapshot();
      case "toggle":
        return this.toggle(id);
    }
  }

  /**
   * Applies one ordered multi-id box/lasso intent and emits at most one change.
   * The adapter is responsible for supplying ids in deterministic Store order.
   */
  public applyMany(
    ids: readonly string[],
    intent: SelectionIntent,
    reason: SelectionRegionChangeReason,
  ): SelectionSnapshot {
    const normalized = this.#normalizeExistingIds(ids);
    const currentSet = new Set(this.#selectedIds);

    switch (intent) {
      case "replace":
        return this.#commit(normalized, reason);
      case "add": {
        const additions = normalized.filter((id) => !currentSet.has(id));
        if (additions.length === 0) return this.snapshot();
        return this.#commit([...this.#selectedIds, ...additions], reason);
      }
      case "subtract": {
        if (normalized.length === 0) return this.snapshot();
        const removals = new Set(normalized);
        return this.#commit(
          this.#selectedIds.filter((id) => !removals.has(id)),
          reason,
        );
      }
      case "toggle": {
        if (normalized.length === 0) return this.snapshot();
        const toggles = new Set(normalized);
        const survivors = this.#selectedIds.filter((id) => !toggles.has(id));
        const additions = normalized.filter((id) => !currentSet.has(id));
        return this.#commit([...survivors, ...additions], reason);
      }
    }
  }

  public replace(
    ids: readonly string[],
    primaryId?: string,
    reason: SelectionChangeReason = "replace",
  ): SelectionSnapshot {
    const normalized = this.#normalizeExistingIds(ids);
    const primary = primaryId ?? normalized.at(-1);
    if (primary !== undefined && !normalized.includes(primary)) {
      throw new RangeError(
        `Primary selection "${primary}" must belong to selectedIds.`,
      );
    }
    const next = primary === undefined
      ? normalized
      : moveToEnd(normalized, primary);
    return this.#commit(next, reason);
  }

  public add(ids: readonly string[]): SelectionSnapshot {
    const normalized = this.#normalizeExistingIds(ids);
    if (normalized.length === 0) return this.snapshot();

    const next = [...this.#selectedIds];
    for (const id of normalized) {
      if (!next.includes(id)) next.push(id);
    }
    // Click-add preserves the merged 007A behavior: the final requested id
    // becomes primary even when it was already selected.
    return this.#commit(moveToEnd(next, normalized.at(-1)!), "add");
  }

  public subtract(ids: readonly string[]): SelectionSnapshot {
    const normalized = this.#normalizeExistingIds(ids);
    if (normalized.length === 0) return this.snapshot();
    const removals = new Set(normalized);
    return this.#commit(
      this.#selectedIds.filter((id) => !removals.has(id)),
      "subtract",
    );
  }

  public toggle(id: string): SelectionSnapshot {
    this.#assertExists(id);
    if (this.has(id)) {
      return this.#commit(
        this.#selectedIds.filter((selectedId) => selectedId !== id),
        "toggle",
      );
    }
    return this.#commit([...this.#selectedIds, id], "toggle");
  }

  public makePrimary(id: string): SelectionSnapshot {
    this.#assertExists(id);
    if (!this.has(id)) {
      throw new RangeError(
        `Cannot make unselected feature "${id}" the primary selection.`,
      );
    }
    return this.#commit(moveToEnd(this.#selectedIds, id), "primary");
  }

  public clear(reason: SelectionChangeReason = "clear"): SelectionSnapshot {
    return this.#commit([], reason);
  }

  /**
   * Runs one synchronous Store mutation without intermediate automatic
   * reconciliation. Selection-aware commands use this to emit exactly one
   * explicit history selection event after a successful atomic commit.
   */
  public runWithoutStoreReconciliation<T>(operation: () => T): T {
    this.#storeReconciliationPauseDepth += 1;
    try {
      return operation();
    } finally {
      this.#storeReconciliationPauseDepth -= 1;
    }
  }

  /**
   * Restores semantic membership/primary state while issuing a fresh monotonic
   * interaction revision. Stored snapshot.revision is intentionally not reused.
   */
  public restore(
    snapshot: SelectionSnapshot,
    reason: SelectionChangeReason,
  ): SelectionSnapshot {
    return this.replace(snapshot.selectedIds, snapshot.primaryId, reason);
  }

  public subscribe(listener: SelectionListener): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  public destroy(): void {
    this.#unsubscribeStore();
    this.#listeners.clear();
  }

  #normalizeExistingIds(ids: readonly string[]): string[] {
    const normalized: string[] = [];
    const seen = new Set<string>();
    for (const id of ids) {
      this.#assertExists(id);
      if (!seen.has(id)) {
        seen.add(id);
        normalized.push(id);
      }
    }
    return normalized;
  }

  #assertExists(id: string): void {
    if (!this.#store.has(id)) {
      throw new PlotFeatureNotFoundError(id);
    }
  }

  #reconcileStore(): void {
    if (this.#storeReconciliationPauseDepth > 0) return;
    const surviving = this.#selectedIds.filter((id) => this.#store.has(id));
    this.#commit(surviving, "store-reconcile");
  }

  #commit(
    nextIds: readonly string[],
    reason: SelectionChangeReason,
  ): SelectionSnapshot {
    if (sameIds(this.#selectedIds, nextIds)) return this.snapshot();

    const before = this.snapshot();
    this.#selectedIds = [...nextIds];
    this.#revision += 1;
    const after = this.snapshot();
    const change: SelectionChange = Object.freeze({ before, after, reason });
    for (const listener of [...this.#listeners]) listener(change);
    return after;
  }
}

function createSnapshot(
  selectedIds: readonly string[],
  revision: number,
): SelectionSnapshot {
  const ids = Object.freeze([...selectedIds]);
  const primaryId = ids.at(-1);
  return Object.freeze({
    selectedIds: ids,
    ...(primaryId !== undefined ? { primaryId } : {}),
    revision,
  });
}

function moveToEnd(ids: readonly string[], id: string): string[] {
  return [...ids.filter((candidate) => candidate !== id), id];
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return (
    left.length === right.length &&
    left.every((id, index) => id === right[index])
  );
}

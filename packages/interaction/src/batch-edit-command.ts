import {
  clonePlotFeature,
  createPlotFeature,
  type Command,
  type PlotStore,
  type PlotStoreTransaction,
} from "@plotlibre/core";
import {
  type SelectionSnapshot,
  SelectionController,
} from "./selection-controller.js";

export interface BatchEditCommandOptions {
  readonly label?: string;
  readonly execute: PlotStoreTransaction;
  readonly undo: PlotStoreTransaction;
  readonly beforeSelection: SelectionSnapshot;
  readonly afterSelection: SelectionSnapshot;
}

/**
 * One history entry for a preflighted multi-feature document mutation.
 *
 * The command owns immutable before/after transactions and selection snapshots.
 * Redo reuses the exact captured feature revisions rather than regenerating
 * candidates. PlotStore listener failures are isolated after commit, so they
 * cannot prevent CommandHistory from recording this command.
 */
export class BatchEditCommand implements Command {
  public readonly label: string;
  readonly #store: PlotStore;
  readonly #selection: SelectionController;
  readonly #executeTransaction: PlotStoreTransaction;
  readonly #undoTransaction: PlotStoreTransaction;
  readonly #beforeSelection: SelectionSnapshot;
  readonly #afterSelection: SelectionSnapshot;
  #executionCount = 0;

  public constructor(
    store: PlotStore,
    selection: SelectionController,
    options: BatchEditCommandOptions,
  ) {
    this.label = options.label ?? "batch-edit";
    this.#store = store;
    this.#selection = selection;
    this.#executeTransaction = cloneTransaction(options.execute);
    this.#undoTransaction = cloneTransaction(options.undo);
    this.#beforeSelection = cloneSelectionSnapshot(options.beforeSelection);
    this.#afterSelection = cloneSelectionSnapshot(options.afterSelection);
  }

  public execute(): void {
    this.#store.applyTransaction(this.#executeTransaction);
    this.#selection.restore(
      this.#afterSelection,
      this.#executionCount === 0 ? "history-execute" : "history-redo",
    );
    this.#executionCount += 1;
  }

  public undo(): void {
    if (this.#executionCount === 0) {
      throw new Error("BatchEditCommand cannot undo before execute.");
    }
    this.#store.applyTransaction(this.#undoTransaction);
    this.#selection.restore(this.#beforeSelection, "history-undo");
  }
}

function cloneTransaction(
  transaction: PlotStoreTransaction,
): PlotStoreTransaction {
  const additions = transaction.add?.map((feature) => createPlotFeature(feature));
  const replacements = transaction.replace?.map(clonePlotFeature);
  const removals = transaction.remove === undefined
    ? undefined
    : Object.freeze([...transaction.remove]);
  const orderedIds = transaction.orderedIds === undefined
    ? undefined
    : Object.freeze([...transaction.orderedIds]);

  return Object.freeze({
    ...(additions === undefined ? {} : { add: Object.freeze(additions) }),
    ...(replacements === undefined
      ? {}
      : { replace: Object.freeze(replacements) }),
    ...(removals === undefined ? {} : { remove: removals }),
    ...(orderedIds === undefined ? {} : { orderedIds }),
  });
}

function cloneSelectionSnapshot(
  snapshot: SelectionSnapshot,
): SelectionSnapshot {
  const selectedIds = Object.freeze([...snapshot.selectedIds]);
  return Object.freeze({
    selectedIds,
    ...(snapshot.primaryId === undefined
      ? {}
      : { primaryId: snapshot.primaryId }),
    revision: snapshot.revision,
  });
}

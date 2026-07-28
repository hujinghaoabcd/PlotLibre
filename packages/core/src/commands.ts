import type { Command } from "./history.js";
import { PlotStore } from "./store.js";
import { clonePlotFeature, type PlotFeature, type PlotFeatureInput } from "./types.js";

export class CreatePlotCommand implements Command {
  public readonly label = "create-plot";
  readonly #store: PlotStore;
  readonly #feature: PlotFeature;

  public constructor(store: PlotStore, feature: PlotFeatureInput | PlotFeature) {
    this.#store = store;
    this.#feature = clonePlotFeature({
      id: feature.id,
      plotType: feature.plotType,
      definitionVersion: feature.definitionVersion ?? "1.0.0",
      controlPoints: feature.controlPoints,
      parameters: feature.parameters ?? {},
      style: feature.style ?? {},
      metadata: feature.metadata ?? {},
      revision: feature.revision ?? 0,
    });
  }

  public execute(): void {
    this.#store.add(this.#feature);
  }

  public undo(): void {
    this.#store.remove(this.#feature.id);
  }
}

export class DeletePlotCommand implements Command {
  public readonly label = "delete-plot";
  readonly #store: PlotStore;
  readonly #id: string;
  #deleted: PlotFeature | undefined;

  public constructor(store: PlotStore, id: string) {
    this.#store = store;
    this.#id = id;
  }

  public execute(): void {
    this.#deleted = this.#store.remove(this.#id);
  }

  public undo(): void {
    if (!this.#deleted) {
      throw new Error("DeletePlotCommand cannot undo before execute.");
    }
    this.#store.add(this.#deleted);
  }
}

export class ReplacePlotCommand implements Command {
  public readonly label = "replace-plot";
  readonly #store: PlotStore;
  readonly #next: PlotFeature;
  #previous: PlotFeature | undefined;

  public constructor(store: PlotStore, next: PlotFeature) {
    this.#store = store;
    this.#next = clonePlotFeature(next);
  }

  public execute(): void {
    this.#previous = this.#store.get(this.#next.id);
    this.#store.replace(this.#next);
  }

  public undo(): void {
    if (!this.#previous) {
      throw new Error("ReplacePlotCommand cannot undo before execute.");
    }
    this.#store.replace(this.#previous);
  }
}

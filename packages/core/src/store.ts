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

export type PlotStoreChangeType = "add" | "update" | "remove" | "clear";

export interface PlotStoreChange {
  readonly type: PlotStoreChangeType;
  readonly ids: readonly string[];
}

export type PlotStoreListener = (change: PlotStoreChange) => void;

export class PlotStore {
  readonly #features = new Map<string, PlotFeature>();
  readonly #listeners = new Set<PlotStoreListener>();

  public add(input: PlotFeatureInput | PlotFeature): PlotFeature {
    if (this.#features.has(input.id)) {
      throw new DuplicatePlotFeatureError(input.id);
    }
    const feature = createPlotFeature(input);
    this.#features.set(feature.id, feature);
    this.#emit({ type: "add", ids: [feature.id] });
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
    this.#emit({ type: "update", ids: [id] });
    return clonePlotFeature(updated);
  }

  public replace(feature: PlotFeature): PlotFeature {
    if (!this.#features.has(feature.id)) {
      throw new PlotFeatureNotFoundError(feature.id);
    }
    const cloned = clonePlotFeature(feature);
    this.#features.set(feature.id, cloned);
    this.#emit({ type: "update", ids: [feature.id] });
    return clonePlotFeature(cloned);
  }

  public remove(id: string): PlotFeature {
    const feature = this.#features.get(id);
    if (!feature) {
      throw new PlotFeatureNotFoundError(id);
    }
    this.#features.delete(id);
    this.#emit({ type: "remove", ids: [id] });
    return clonePlotFeature(feature);
  }

  public clear(): readonly PlotFeature[] {
    const removed = this.list();
    if (removed.length === 0) {
      return [];
    }
    this.#features.clear();
    this.#emit({ type: "clear", ids: removed.map((feature) => feature.id) });
    return removed;
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
    for (const listener of this.#listeners) {
      listener(change);
    }
  }
}

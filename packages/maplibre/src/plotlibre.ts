import {
  CommandHistory,
  CreatePlotCommand,
  createPlotDocument,
  createPlotFeature,
  DeletePlotCommand,
  parsePlotDocument,
  PlotRegistry,
  PlotStore,
  ReplacePlotCommand,
  serializePlotDocument,
  type PlotDefinition,
  type PlotDocument,
  type PlotFeature,
  type PlotFeatureInput,
} from "@plotlibre/core";
import {
  MapLibrePlotInteraction,
  type MapLibrePlotInteractionOptions,
  type StartPlotDrawOptions,
} from "./interaction.js";
import { MapLibrePlotRenderer } from "./renderer.js";
import type { MapLibreMapLike, PlotLibreRendererOptions } from "./types.js";

export interface PlotLibreOptions
  extends PlotLibreRendererOptions,
    MapLibrePlotInteractionOptions {
  readonly definitions?: readonly PlotDefinition[];
  readonly historySize?: number;
  readonly autoInitialize?: boolean;
}

export class PlotLibre {
  public readonly registry: PlotRegistry;
  public readonly store: PlotStore;
  public readonly history: CommandHistory;
  public readonly renderer: MapLibrePlotRenderer;
  public readonly interaction: MapLibrePlotInteraction;
  readonly #unsubscribe: () => void;

  public constructor(map: MapLibreMapLike, options: PlotLibreOptions = {}) {
    this.registry = new PlotRegistry();
    this.store = new PlotStore();
    this.history = new CommandHistory({ maxSize: options.historySize ?? 200 });
    this.renderer = new MapLibrePlotRenderer(map, options);

    if (options.definitions) {
      this.registry.registerMany(options.definitions);
    }
    if (options.autoInitialize ?? true) {
      this.renderer.initialize();
    }

    this.#unsubscribe = this.store.subscribe(() => {
      this.renderer.render(this.store.list(), this.registry);
    });

    this.interaction = new MapLibrePlotInteraction(
      map,
      this.registry,
      this.store,
      this.renderer,
      {
        create: (input) => this.create(input),
        replace: (feature) => this.replace(feature),
      },
      options.idFactory !== undefined
        ? { idFactory: options.idFactory }
        : {},
    );
  }

  public register(definition: PlotDefinition): this {
    this.registry.register(definition);
    return this;
  }

  public registerMany(definitions: readonly PlotDefinition[]): this {
    this.registry.registerMany(definitions);
    return this;
  }

  public create(input: PlotFeatureInput): PlotFeature {
    const definition = this.registry.get(input.plotType);
    const feature = createPlotFeature({
      ...input,
      definitionVersion: input.definitionVersion ?? definition.version,
      parameters: {
        ...definition.defaultParameters,
        ...(input.parameters ?? {}),
      },
      style: {
        ...definition.defaultStyle,
        ...(input.style ?? {}),
      },
    });
    this.registry.assertValid(feature);
    this.history.execute(new CreatePlotCommand(this.store, feature));
    return this.store.get(feature.id);
  }

  public replace(feature: PlotFeature): PlotFeature {
    const current = this.store.get(feature.id);
    const next = createPlotFeature({
      ...feature,
      revision: current.revision + 1,
    });
    this.registry.assertValid(next);
    this.history.execute(new ReplacePlotCommand(this.store, next));
    return this.store.get(next.id);
  }

  public remove(id: string): void {
    this.history.execute(new DeletePlotCommand(this.store, id));
  }

  public draw(plotType: string, options: StartPlotDrawOptions = {}): string {
    return this.interaction.startDraw(plotType, options);
  }

  public cancelDrawing(): boolean {
    return this.interaction.cancelDraw();
  }

  public select(id: string | undefined): void {
    this.interaction.select(id);
  }

  public undo(): boolean {
    return this.history.undo();
  }

  public redo(): boolean {
    return this.history.redo();
  }

  public clear(): void {
    this.interaction.cancelDraw();
    this.interaction.select(undefined);
    this.store.clear();
    this.history.clear();
  }

  public exportDocument(id: string, name: string): PlotDocument {
    return createPlotDocument({
      id,
      name,
      features: this.store.list(),
      metadata: {
        generator: "PlotLibre",
        schema: "PlotJSON 1.0.0",
      },
    });
  }

  public exportJson(id: string, name: string): string {
    return serializePlotDocument(this.exportDocument(id, name));
  }

  public importDocument(value: PlotDocument | string | unknown): PlotDocument {
    const document = parsePlotDocument(value);
    this.interaction.cancelDraw();
    this.interaction.select(undefined);
    this.store.clear();
    for (const feature of document.features) {
      this.registry.assertValid(feature);
      this.store.add(feature);
    }
    this.history.clear();
    return document;
  }

  public render(): void {
    this.renderer.render(this.store.list(), this.registry);
  }

  public destroy(): void {
    this.interaction.destroy();
    this.#unsubscribe();
    this.renderer.destroy();
  }
}

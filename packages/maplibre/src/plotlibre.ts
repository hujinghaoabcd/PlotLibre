import {
  CommandHistory,
  CreatePlotCommand,
  createPlotDocument,
  createPlotFeature,
  DeletePlotCommand,
  preparePlotDocumentImport,
  PlotJsonMigrationRegistry,
  PlotRegistry,
  PlotStore,
  ReplacePlotCommand,
  serializePlotDocument,
  type PlotDefinition,
  type PlotDocument,
  type PlotFeature,
  type PlotFeatureInput,
  type PlotJsonLimits,
  type ReadPlotDocumentResult,
} from "@plotlibre/core";
import {
  BatchEditCommand,
  createSelectionTransformCommand,
  SelectionController,
  type SelectionTransformRejection as RotationScaleRejection,
} from "@plotlibre/interaction";
import {
  MapLibrePlotInteraction,
  type MapLibrePlotInteractionOptions,
  type StartPlotDrawOptions,
} from "./interaction.js";
import { MapLibrePlotRenderer } from "./renderer.js";
import {
  MapLibreSelectionRegionInteraction,
  type MapLibreSelectionRegionRejection,
  type MapLibreSelectionRegionSnapshot,
  type StartSelectionRegionOptions,
} from "./selection-region-interaction.js";
import {
  MapLibreSelectionTransformInteraction,
  type MapLibreSelectionTransformSnapshot,
} from "./selection-transform-interaction.js";
import {
  MapLibreSelectionTranslation,
  type SelectionTransformRejection as SelectionTranslationRejection,
} from "./selection-translation.js";
import type {
  MapCanvasLike,
  MapLibreMapLike,
  PlotLibreRendererOptions,
} from "./types.js";

export interface PlotLibreOptions
  extends PlotLibreRendererOptions,
    MapLibrePlotInteractionOptions {
  readonly definitions?: readonly PlotDefinition[];
  readonly migrations?: PlotJsonMigrationRegistry;
  readonly plotJsonLimits?: Partial<PlotJsonLimits>;
  readonly historySize?: number;
  readonly autoInitialize?: boolean;
}

export class PlotLibre {
  public readonly registry: PlotRegistry;
  public readonly migrations: PlotJsonMigrationRegistry;
  public readonly store: PlotStore;
  public readonly history: CommandHistory;
  public readonly selection: SelectionController;
  public readonly renderer: MapLibrePlotRenderer;
  public readonly selectionTransform: MapLibreSelectionTransformInteraction;
  public readonly regionSelection: MapLibreSelectionRegionInteraction;
  /** @deprecated Use regionSelection. */
  public readonly selectionModifiers: MapLibreSelectionRegionInteraction;
  public readonly translation: MapLibreSelectionTranslation;
  public readonly interaction: MapLibrePlotInteraction;
  readonly #plotJsonLimits: Partial<PlotJsonLimits> | undefined;
  readonly #unsubscribe: () => void;

  public constructor(map: MapLibreMapLike, options: PlotLibreOptions = {}) {
    this.registry = new PlotRegistry();
    this.migrations = options.migrations ?? new PlotJsonMigrationRegistry();
    this.#plotJsonLimits = options.plotJsonLimits;
    this.store = new PlotStore();
    this.history = new CommandHistory({ maxSize: options.historySize ?? 200 });
    this.selection = new SelectionController(this.store);
    this.renderer = new MapLibrePlotRenderer(map, options);
    this.renderer.setRegistry(this.registry);

    if (options.definitions) {
      this.registry.registerMany(options.definitions);
    }
    if (options.autoInitialize ?? true) {
      this.renderer.initialize();
    }

    this.#unsubscribe = this.store.subscribe(() => {
      this.renderer.render(this.store.list(), this.registry);
    });

    let regionSelection: MapLibreSelectionRegionInteraction | undefined;
    let translation: MapLibreSelectionTranslation | undefined;
    let interaction: MapLibrePlotInteraction | undefined;

    // Register transform pointer listeners before region/body interaction so an
    // armed explicit transform owns its handle or consumes one outside click.
    this.selectionTransform = new MapLibreSelectionTransformInteraction(
      map,
      this.registry,
      this.store,
      this.selection,
      this.renderer,
      {
        callbacks: {
          commit: (completion, selectionSnapshot) => {
            const command = createSelectionTransformCommand(
              this.store,
              this.selection,
              { completion, selectionSnapshot },
            );
            if (command !== undefined) this.history.execute(command);
            return this.selection.selectedIds.map((id) => this.store.get(id));
          },
          cancelRegion: () => regionSelection?.cancel(),
          cancelTranslation: () => translation?.cancel(),
          cancelDrawing: () => interaction?.cancelDraw(),
          isDrawing: () => interaction?.isDrawing ?? false,
          isRegionActive: () => regionSelection?.isActive ?? false,
          isTranslating: () => translation?.isTranslating ?? false,
        },
      },
    );

    this.regionSelection = new MapLibreSelectionRegionInteraction(
      map,
      this.registry,
      this.store,
      this.selection,
      this.renderer,
      {
        callbacks: {
          isDrawing: () => interaction?.isDrawing ?? false,
          isTranslating: () => translation?.isTranslating ?? false,
          suppressNextClick: () => armCanvasClickSuppression(map.getCanvas()),
        },
      },
    );
    regionSelection = this.regionSelection;
    this.selectionModifiers = this.regionSelection;

    // Register body-translation listeners before the general interaction
    // controller so Escape can cancel the preview before single-selection
    // keyboard handling observes the same event.
    this.translation = new MapLibreSelectionTranslation(
      map,
      this.registry,
      this.store,
      this.selection,
      this.renderer,
      {
        replaceSelection: (features) => this.replaceSelected(features),
      },
    );
    translation = this.translation;

    this.interaction = new MapLibrePlotInteraction(
      map,
      this.registry,
      this.store,
      this.renderer,
      {
        create: (input) => this.create(input),
        replace: (feature) => this.replace(feature),
        removeSelection: () => this.removeSelected(),
      },
      options.idFactory !== undefined
        ? { idFactory: options.idFactory }
        : {},
      this.selection,
    );
    interaction = this.interaction;
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
    const feature = this.registry.canonicalize(
      createPlotFeature({
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
      }),
    );
    this.registry.generate(feature);
    this.history.execute(new CreatePlotCommand(this.store, feature));
    return this.store.get(feature.id);
  }

  public replace(feature: PlotFeature): PlotFeature {
    const current = this.store.get(feature.id);
    const next = this.registry.canonicalize(
      createPlotFeature({
        ...feature,
        revision: current.revision + 1,
      }),
    );
    this.registry.generate(next);
    this.history.execute(new ReplacePlotCommand(this.store, next));
    return this.store.get(next.id);
  }

  public replaceSelected(
    features: readonly PlotFeature[],
  ): readonly PlotFeature[] {
    const selection = this.selection.snapshot();
    if (selection.selectedIds.length === 0) {
      throw new RangeError("Cannot replace an empty PlotLibre selection.");
    }

    const candidates = new Map<string, PlotFeature>();
    for (const feature of features) {
      if (candidates.has(feature.id)) {
        throw new RangeError(
          `Selection replacement contains duplicate id "${feature.id}".`,
        );
      }
      candidates.set(feature.id, feature);
    }
    if (
      candidates.size !== selection.selectedIds.length ||
      selection.selectedIds.some((id) => !candidates.has(id))
    ) {
      throw new RangeError(
        "Selection replacement must contain every selected feature exactly once.",
      );
    }

    const before = selection.selectedIds.map((id) => this.store.get(id));
    const next = before.map((current) => {
      const candidate = candidates.get(current.id)!;
      const materialized = this.registry.canonicalize(
        createPlotFeature({
          ...candidate,
          revision: current.revision + 1,
        }),
      );
      this.registry.generate(materialized);
      return materialized;
    });

    this.history.execute(new BatchEditCommand(this.store, this.selection, {
      label: "translate-selection",
      execute: { replace: next },
      undo: { replace: before },
      beforeSelection: selection,
      afterSelection: selection,
    }));
    return selection.selectedIds.map((id) => this.store.get(id));
  }

  public remove(id: string): void {
    this.history.execute(new DeletePlotCommand(this.store, id));
  }

  public removeSelected(): boolean {
    this.selectionTransform.cancel();
    this.regionSelection.cancel();
    const beforeSelection = this.selection.snapshot();
    if (beforeSelection.selectedIds.length === 0) return false;

    const document = this.store.list();
    const selected = new Set(beforeSelection.selectedIds);
    const removed = document.filter((feature) => selected.has(feature.id));
    if (removed.length === 0) return false;

    this.history.execute(new BatchEditCommand(this.store, this.selection, {
      label: "delete-selection",
      execute: {
        remove: removed.map((feature) => feature.id),
      },
      undo: {
        add: removed,
        orderedIds: document.map((feature) => feature.id),
      },
      beforeSelection,
      afterSelection: {
        selectedIds: [],
        revision: beforeSelection.revision,
      },
    }));
    return true;
  }

  public draw(plotType: string, options: StartPlotDrawOptions = {}): string {
    this.selectionTransform.cancel();
    this.regionSelection.cancel();
    this.translation.cancel();
    return this.interaction.startDraw(plotType, options);
  }

  public cancelDrawing(): boolean {
    return this.interaction.cancelDraw();
  }

  public startBoxSelection(
    options: StartSelectionRegionOptions = {},
  ): MapLibreSelectionRegionSnapshot {
    this.selectionTransform.cancel();
    this.translation.cancel();
    this.interaction.cancelDraw();
    return this.regionSelection.start("box", options);
  }

  public startLassoSelection(
    options: StartSelectionRegionOptions = {},
  ): MapLibreSelectionRegionSnapshot {
    this.selectionTransform.cancel();
    this.translation.cancel();
    this.interaction.cancelDraw();
    return this.regionSelection.start("lasso", options);
  }

  public cancelRegionSelection(): boolean {
    return this.regionSelection.cancel();
  }

  public startSelectionRotation(): MapLibreSelectionTransformSnapshot {
    return this.selectionTransform.start("rotate");
  }

  public startSelectionScale(): MapLibreSelectionTransformSnapshot {
    return this.selectionTransform.start("scale");
  }

  public cancelSelectionTransform(): boolean {
    return this.selectionTransform.cancel();
  }

  /** Replaces the current selection with one feature for API compatibility. */
  public select(id: string | undefined): void {
    this.selectionTransform.cancel();
    this.regionSelection.cancel();
    this.interaction.select(id);
  }

  public get selectedId(): string | undefined {
    return this.selection.primaryId;
  }

  public get selectedIds(): readonly string[] {
    return this.selection.selectedIds;
  }

  public get regionSelectionSnapshot(): MapLibreSelectionRegionSnapshot {
    return this.regionSelection.snapshot;
  }

  public get regionSelectionRejection():
    | MapLibreSelectionRegionRejection
    | undefined {
    return this.regionSelection.rejection;
  }

  public get selectionTransformSnapshot(): MapLibreSelectionTransformSnapshot {
    return this.selectionTransform.snapshot;
  }

  public get selectionTransformRejection(): RotationScaleRejection | undefined {
    return this.selectionTransform.rejection;
  }

  public get transformRejection(): SelectionTranslationRejection | undefined {
    return this.translation.rejection;
  }

  public undo(): boolean {
    this.selectionTransform.cancel();
    this.regionSelection.cancel();
    this.translation.cancel();
    return this.history.undo();
  }

  public redo(): boolean {
    this.selectionTransform.cancel();
    this.regionSelection.cancel();
    this.translation.cancel();
    return this.history.redo();
  }

  public clear(): void {
    this.selectionTransform.cancel();
    this.regionSelection.cancel();
    this.translation.cancel();
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

  /**
   * Fully reads, migrates and Registry-preflights a document before one atomic
   * Store replacement. Transient application state is cleared only after the
   * Store commit succeeds.
   */
  public importDocumentWithReport(
    value: PlotDocument | string | unknown,
  ): ReadPlotDocumentResult {
    const prepared = preparePlotDocumentImport(value, this.registry, {
      migrations: this.migrations,
      ...(this.#plotJsonLimits === undefined
        ? {}
        : { limits: this.#plotJsonLimits }),
    });

    this.store.replaceDocument(prepared.document.features);

    this.selectionTransform.cancel();
    this.regionSelection.cancel();
    this.translation.cancel();
    this.interaction.cancelDraw();
    this.selection.clear();
    this.history.clear();
    return prepared;
  }

  /** Compatibility wrapper returning the imported current PlotDocument only. */
  public importDocument(value: PlotDocument | string | unknown): PlotDocument {
    return this.importDocumentWithReport(value).document;
  }

  public render(): void {
    this.renderer.render(this.store.list(), this.registry);
  }

  public destroy(): void {
    this.selectionTransform.destroy();
    this.regionSelection.destroy();
    this.translation.destroy();
    this.interaction.destroy();
    this.selection.destroy();
    this.#unsubscribe();
    this.renderer.destroy();
  }
}

function armCanvasClickSuppression(canvas: MapCanvasLike): void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listener = (event: any): void => {
    event.preventDefault?.();
    event.stopPropagation?.();
    event.stopImmediatePropagation?.();
    canvas.removeEventListener("click", listener, { capture: true });
    if (timer !== undefined) clearTimeout(timer);
  };
  canvas.addEventListener("click", listener, { capture: true });
  timer = setTimeout(() => {
    canvas.removeEventListener("click", listener, { capture: true });
  }, 0);
}

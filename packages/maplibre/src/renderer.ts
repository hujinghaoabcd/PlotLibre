import type {
  GeoJsonFeature,
  GeoJsonFeatureCollection,
  PlotFeature,
  PlotFeatureInput,
  PlotGeometry,
  PlotRegistry,
  PlotRenderProperties,
  Position,
} from "@plotlibre/core";
import type {
  GeoJsonSourceLike,
  MapLibreMapLike,
  PlotLibreLayerIds,
  PlotLibreRendererOptions,
  PlotLibreSourceIds,
} from "./types.js";

const EMPTY_COLLECTION: GeoJsonFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

export class MapLibrePlotRenderer {
  readonly #map: MapLibreMapLike;
  readonly #sourceIds: PlotLibreSourceIds;
  readonly #layerIds: PlotLibreLayerIds;
  readonly #beforeLayerId: string | undefined;
  #registry: PlotRegistry | undefined;

  public constructor(
    map: MapLibreMapLike,
    options: PlotLibreRendererOptions = {},
  ) {
    this.#map = map;
    this.#sourceIds = {
      committed:
        options.sourceIds?.committed ??
        options.sourceId ??
        "plotlibre-committed",
      draft: options.sourceIds?.draft ?? "plotlibre-draft",
      handles: options.sourceIds?.handles ?? "plotlibre-handles",
    };
    this.#layerIds = {
      fill: options.layerIds?.fill ?? "plotlibre-fill",
      line: options.layerIds?.line ?? "plotlibre-line",
      point: options.layerIds?.point ?? "plotlibre-point",
      draftFill: options.layerIds?.draftFill ?? "plotlibre-draft-fill",
      draftLine: options.layerIds?.draftLine ?? "plotlibre-draft-line",
      draftPoint: options.layerIds?.draftPoint ?? "plotlibre-draft-point",
      handleGuide:
        options.layerIds?.handleGuide ?? "plotlibre-handle-guide",
      handle: options.layerIds?.handle ?? "plotlibre-handle",
    };
    this.#beforeLayerId = options.beforeLayerId;
  }

  public setRegistry(registry: PlotRegistry): void {
    this.#registry = registry;
  }

  public initialize(): void {
    this.#addGeoJsonSourceIfMissing(this.#sourceIds.committed, true);
    this.#addGeoJsonSourceIfMissing(this.#sourceIds.draft, true);
    this.#addGeoJsonSourceIfMissing(this.#sourceIds.handles, false);

    this.#addPlotLayers(
      this.#sourceIds.committed,
      {
        fill: this.#layerIds.fill,
        line: this.#layerIds.line,
        point: this.#layerIds.point,
      },
      false,
    );

    this.#addPlotLayers(
      this.#sourceIds.draft,
      {
        fill: this.#layerIds.draftFill,
        line: this.#layerIds.draftLine,
        point: this.#layerIds.draftPoint,
      },
      true,
    );

    this.#addLayerIfMissing({
      id: this.#layerIds.handleGuide,
      type: "line",
      source: this.#sourceIds.handles,
      filter: [
        "all",
        ["==", ["get", "role"], "line"],
        ["==", ["get", "handleKind"], "semantic-guide"],
      ],
      paint: {
        "line-color": ["coalesce", ["get", "lineColor"], "#1976d2"],
        "line-opacity": ["coalesce", ["get", "lineOpacity"], 0.85],
        "line-width": ["coalesce", ["get", "lineWidth"], 2],
        "line-dasharray": [2, 1],
      },
    });

    this.#addLayerIfMissing({
      id: this.#layerIds.handle,
      type: "circle",
      source: this.#sourceIds.handles,
      filter: ["==", ["get", "role"], "handle"],
      paint: {
        "circle-color": ["coalesce", ["get", "pointColor"], "#ffffff"],
        "circle-radius": ["coalesce", ["get", "pointRadius"], 6],
        "circle-stroke-color": "#1976d2",
        "circle-stroke-width": 2,
      },
    });
  }

  public render(
    features: readonly PlotFeature[],
    registry: PlotRegistry,
  ): GeoJsonFeatureCollection<PlotGeometry, PlotRenderProperties> {
    this.initialize();
    const collection = this.#createCollection(features, registry);
    this.#getSource(this.#sourceIds.committed).setData(collection);
    return collection;
  }

  public renderDraft(
    feature: PlotFeature | undefined,
    registry: PlotRegistry,
  ): GeoJsonFeatureCollection<PlotGeometry, PlotRenderProperties> {
    this.initialize();
    const collection = feature
      ? this.#createCollection([feature], registry, true)
      : (EMPTY_COLLECTION as GeoJsonFeatureCollection<
          PlotGeometry,
          PlotRenderProperties
        >);
    this.#getSource(this.#sourceIds.draft).setData(collection);
    return collection;
  }

  /**
   * Shows authored/temporary semantic controls when a complete symbol polygon
   * cannot yet be generated. The guide is transient derived output in the draft
   * source only; it is never persisted as PlotJSON or Store state.
   */
  public renderDraftGuide(
    input: PlotFeatureInput,
  ): GeoJsonFeatureCollection<PlotGeometry, PlotRenderProperties> {
    this.initialize();
    const style = input.style ?? {};
    const baseProperties = {
      plotId: input.id,
      plotType: input.plotType,
      lineColor: style.lineColor ?? "#8e0000",
      lineOpacity: style.lineOpacity ?? 1,
      lineWidth: Math.max(style.lineWidth ?? 2, 2),
      pointColor: style.pointColor ?? style.lineColor ?? "#1976d2",
      pointRadius: Math.max(style.pointRadius ?? 5, 5),
      draftKind: "semantic-guide",
    } as const;
    const features: GeoJsonFeature<PlotGeometry, PlotRenderProperties>[] = [];

    if (input.controlPoints.length >= 2) {
      const id = `${input.id}:draft-guide-line`;
      features.push({
        type: "Feature",
        id,
        geometry: {
          type: "LineString",
          coordinates: input.controlPoints.map(clonePosition),
        },
        properties: {
          ...baseProperties,
          role: "line",
          plotRenderId: id,
        },
      });
    }

    for (const [index, position] of input.controlPoints.entries()) {
      const id = `${input.id}:draft-guide-point:${index}`;
      features.push({
        type: "Feature",
        id,
        geometry: {
          type: "Point",
          coordinates: clonePosition(position),
        },
        properties: {
          ...baseProperties,
          role: "point",
          plotRenderId: id,
          handleIndex: index,
        },
      });
    }

    const collection: GeoJsonFeatureCollection<
      PlotGeometry,
      PlotRenderProperties
    > = {
      type: "FeatureCollection",
      features,
    };
    this.#getSource(this.#sourceIds.draft).setData(collection);
    return collection;
  }

  public renderHandles(
    feature: PlotFeature | undefined,
  ): GeoJsonFeatureCollection {
    this.initialize();
    const collection: GeoJsonFeatureCollection = feature
      ? {
          type: "FeatureCollection",
          features: [
            ...this.#createSemanticGuideFeatures(feature, this.#registry),
            ...feature.controlPoints.map((position, index) =>
              createHandleFeature(feature, position, index),
            ),
          ],
        }
      : EMPTY_COLLECTION;
    this.#getSource(this.#sourceIds.handles).setData(collection);
    return collection;
  }

  public clear(): void {
    this.#setEmptyIfPresent(this.#sourceIds.committed);
    this.clearDraft();
    this.clearHandles();
  }

  public clearDraft(): void {
    this.#setEmptyIfPresent(this.#sourceIds.draft);
  }

  public clearHandles(): void {
    this.#setEmptyIfPresent(this.#sourceIds.handles);
  }

  public destroy(): void {
    for (const layerId of [
      this.#layerIds.handle,
      this.#layerIds.handleGuide,
      this.#layerIds.draftPoint,
      this.#layerIds.draftLine,
      this.#layerIds.draftFill,
      this.#layerIds.point,
      this.#layerIds.line,
      this.#layerIds.fill,
    ]) {
      if (this.#map.getLayer(layerId)) {
        this.#map.removeLayer(layerId);
      }
    }

    for (const sourceId of [
      this.#sourceIds.handles,
      this.#sourceIds.draft,
      this.#sourceIds.committed,
    ]) {
      if (this.#map.getSource(sourceId)) {
        this.#map.removeSource(sourceId);
      }
    }
  }

  public get sourceId(): string {
    return this.#sourceIds.committed;
  }

  public get sourceIds(): PlotLibreSourceIds {
    return { ...this.#sourceIds };
  }

  public get layerIds(): PlotLibreLayerIds {
    return { ...this.#layerIds };
  }

  #createCollection(
    features: readonly PlotFeature[],
    registry: PlotRegistry,
    includeSemanticGuides = false,
  ): GeoJsonFeatureCollection<PlotGeometry, PlotRenderProperties> {
    const rendered: GeoJsonFeature<PlotGeometry, PlotRenderProperties>[] = [];

    for (const feature of features) {
      const bundle = registry.generate(feature);
      rendered.push(
        ...bundle.fills,
        ...bundle.lines,
        ...bundle.points,
        ...bundle.labels,
      );
      if (includeSemanticGuides) {
        rendered.push(...this.#createSemanticGuideFeatures(feature, registry));
      }
    }

    return {
      type: "FeatureCollection",
      features: rendered.map((renderFeature) => ({
        ...renderFeature,
        properties: {
          ...renderFeature.properties,
          plotRenderId: String(
            renderFeature.id ?? renderFeature.properties.plotId,
          ),
        },
      })),
    };
  }

  #createSemanticGuideFeatures(
    feature: PlotFeature,
    registry: PlotRegistry | undefined,
  ): GeoJsonFeature<PlotGeometry, PlotRenderProperties>[] {
    if (!registry) return [];
    const definition = registry.get(feature.plotType);
    const paths = definition.deriveSemanticGuidePaths?.(feature) ?? [];
    const rendered: GeoJsonFeature<PlotGeometry, PlotRenderProperties>[] = [];

    for (const [index, path] of paths.entries()) {
      if (
        path.length < 2 ||
        path.some(
          ([longitude, latitude]) =>
            !Number.isFinite(longitude) || !Number.isFinite(latitude),
        )
      ) {
        continue;
      }
      const id = `${feature.id}:semantic-guide:${index}`;
      rendered.push({
        type: "Feature",
        id,
        geometry: {
          type: "LineString",
          coordinates: path.map(clonePosition),
        },
        properties: {
          plotId: feature.id,
          plotType: feature.plotType,
          role: "line",
          handleKind: "semantic-guide",
          lineColor: feature.style.lineColor ?? "#1976d2",
          lineOpacity: Math.min(feature.style.lineOpacity ?? 1, 0.85),
          lineWidth: Math.max(feature.style.lineWidth ?? 2, 2),
          plotRenderId: id,
        },
      });
    }

    return rendered;
  }

  #addPlotLayers(
    sourceId: string,
    layerIds: Pick<PlotLibreLayerIds, "fill" | "line" | "point">,
    draft: boolean,
  ): void {
    this.#addLayerIfMissing({
      id: layerIds.fill,
      type: "fill",
      source: sourceId,
      filter: ["==", ["get", "role"], "fill"],
      paint: {
        "fill-color": ["coalesce", ["get", "fillColor"], "#d32f2f"],
        "fill-opacity": [
          "*",
          ["coalesce", ["get", "fillOpacity"], 0.45],
          draft ? 0.75 : 1,
        ],
      },
    });

    this.#addLayerIfMissing({
      id: layerIds.line,
      type: "line",
      source: sourceId,
      filter: [
        "in",
        ["get", "role"],
        ["literal", ["outline", "line"]],
      ],
      paint: {
        "line-color": ["coalesce", ["get", "lineColor"], "#8e0000"],
        "line-opacity": [
          "*",
          ["coalesce", ["get", "lineOpacity"], 1],
          draft ? 0.85 : 1,
        ],
        "line-width": ["coalesce", ["get", "lineWidth"], 2],
        ...(draft ? { "line-dasharray": [2, 1] } : {}),
      },
    });

    this.#addLayerIfMissing({
      id: layerIds.point,
      type: "circle",
      source: sourceId,
      filter: ["==", ["get", "role"], "point"],
      paint: {
        "circle-color": [
          "coalesce",
          ["get", "pointColor"],
          "#1976d2",
        ],
        "circle-radius": ["coalesce", ["get", "pointRadius"], 5],
      },
    });
  }

  #addGeoJsonSourceIfMissing(sourceId: string, promoteId: boolean): void {
    if (!this.#map.getSource(sourceId)) {
      this.#map.addSource(sourceId, {
        type: "geojson",
        data: EMPTY_COLLECTION,
        ...(promoteId ? { promoteId: "plotRenderId" } : {}),
      });
    }
  }

  #getSource(sourceId: string): GeoJsonSourceLike {
    const source = this.#map.getSource(sourceId);
    if (!source || typeof (source as GeoJsonSourceLike).setData !== "function") {
      throw new Error(
        `MapLibre source "${sourceId}" is missing or is not a GeoJSON source.`,
      );
    }
    return source as GeoJsonSourceLike;
  }

  #setEmptyIfPresent(sourceId: string): void {
    if (this.#map.getSource(sourceId)) {
      this.#getSource(sourceId).setData(EMPTY_COLLECTION);
    }
  }

  #addLayerIfMissing(layer: unknown): void {
    const id = (layer as { id: string }).id;
    if (!this.#map.getLayer(id)) {
      if (this.#beforeLayerId !== undefined) {
        this.#map.addLayer(layer, this.#beforeLayerId);
      } else {
        this.#map.addLayer(layer);
      }
    }
  }
}

function createHandleFeature(
  feature: PlotFeature,
  position: Position,
  index: number,
): GeoJsonFeature {
  return {
    type: "Feature",
    id: `${feature.id}:handle:${index}`,
    geometry: {
      type: "Point",
      coordinates: position,
    },
    properties: {
      plotId: feature.id,
      plotType: feature.plotType,
      role: "handle",
      handleKind: "control-point",
      handleIndex: index,
      pointColor: "#ffffff",
      pointRadius: 6,
      plotRenderId: `${feature.id}:handle:${index}`,
    },
  };
}

function clonePosition([longitude, latitude]: Position): Position {
  return [longitude, latitude];
}

import type {
  GeoJsonFeature,
  GeoJsonFeatureCollection,
  PlotFeature,
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
      handle: options.layerIds?.handle ?? "plotlibre-handle",
    };
    this.#beforeLayerId = options.beforeLayerId;
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
      ? this.#createCollection([feature], registry)
      : (EMPTY_COLLECTION as GeoJsonFeatureCollection<
          PlotGeometry,
          PlotRenderProperties
        >);
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
          features: feature.controlPoints.map((position, index) =>
            createHandleFeature(feature, position, index),
          ),
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

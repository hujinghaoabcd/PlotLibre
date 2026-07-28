import type {
  GeoJsonFeature,
  GeoJsonFeatureCollection,
  PlotFeature,
  PlotGeometry,
  PlotRegistry,
  PlotRenderProperties,
} from "@plotlibre/core";
import type {
  GeoJsonSourceLike,
  MapLibreMapLike,
  PlotLibreLayerIds,
  PlotLibreRendererOptions,
} from "./types.js";

const EMPTY_COLLECTION: GeoJsonFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

export class MapLibrePlotRenderer {
  readonly #map: MapLibreMapLike;
  readonly #sourceId: string;
  readonly #layerIds: PlotLibreLayerIds;
  readonly #beforeLayerId: string | undefined;

  public constructor(
    map: MapLibreMapLike,
    options: PlotLibreRendererOptions = {},
  ) {
    this.#map = map;
    this.#sourceId = options.sourceId ?? "plotlibre-committed";
    this.#layerIds = {
      fill: options.layerIds?.fill ?? "plotlibre-fill",
      line: options.layerIds?.line ?? "plotlibre-line",
      point: options.layerIds?.point ?? "plotlibre-point",
    };
    this.#beforeLayerId = options.beforeLayerId;
  }

  public initialize(): void {
    if (!this.#map.getSource(this.#sourceId)) {
      this.#map.addSource(this.#sourceId, {
        type: "geojson",
        data: EMPTY_COLLECTION,
        promoteId: "plotRenderId",
      });
    }

    this.#addLayerIfMissing({
      id: this.#layerIds.fill,
      type: "fill",
      source: this.#sourceId,
      filter: ["==", ["get", "role"], "fill"],
      paint: {
        "fill-color": ["coalesce", ["get", "fillColor"], "#d32f2f"],
        "fill-opacity": ["coalesce", ["get", "fillOpacity"], 0.45],
      },
    });

    this.#addLayerIfMissing({
      id: this.#layerIds.line,
      type: "line",
      source: this.#sourceId,
      filter: [
        "in",
        ["get", "role"],
        ["literal", ["outline", "line"]],
      ],
      paint: {
        "line-color": ["coalesce", ["get", "lineColor"], "#8e0000"],
        "line-opacity": ["coalesce", ["get", "lineOpacity"], 1],
        "line-width": ["coalesce", ["get", "lineWidth"], 2],
      },
    });

    this.#addLayerIfMissing({
      id: this.#layerIds.point,
      type: "circle",
      source: this.#sourceId,
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

  public render(
    features: readonly PlotFeature[],
    registry: PlotRegistry,
  ): GeoJsonFeatureCollection<PlotGeometry, PlotRenderProperties> {
    this.initialize();
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

    const collection: GeoJsonFeatureCollection<
      PlotGeometry,
      PlotRenderProperties
    > = {
      type: "FeatureCollection",
      features: rendered.map((renderFeature) => ({
        ...renderFeature,
        properties: {
          ...renderFeature.properties,
          plotRenderId: String(renderFeature.id ?? renderFeature.properties.plotId),
        },
      })),
    };

    this.#getSource().setData(collection);
    return collection;
  }

  public clear(): void {
    if (this.#map.getSource(this.#sourceId)) {
      this.#getSource().setData(EMPTY_COLLECTION);
    }
  }

  public destroy(): void {
    for (const layerId of [
      this.#layerIds.point,
      this.#layerIds.line,
      this.#layerIds.fill,
    ]) {
      if (this.#map.getLayer(layerId)) {
        this.#map.removeLayer(layerId);
      }
    }
    if (this.#map.getSource(this.#sourceId)) {
      this.#map.removeSource(this.#sourceId);
    }
  }

  public get sourceId(): string {
    return this.#sourceId;
  }

  public get layerIds(): PlotLibreLayerIds {
    return { ...this.#layerIds };
  }

  #getSource(): GeoJsonSourceLike {
    const source = this.#map.getSource(this.#sourceId);
    if (!source || typeof (source as GeoJsonSourceLike).setData !== "function") {
      throw new Error(
        `MapLibre source "${this.#sourceId}" is missing or is not a GeoJSON source.`,
      );
    }
    return source as GeoJsonSourceLike;
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

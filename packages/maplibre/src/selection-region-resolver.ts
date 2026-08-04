import type {
  PlotFeature,
  PlotGeometry,
  PlotRegistry,
  PlotStore,
  Position,
  RenderBundle,
} from "@plotlibre/core";
import {
  screenGeometryIntersectsRegion,
  type ScreenBounds,
  type ScreenGeometry,
  type ScreenPoint,
} from "@plotlibre/interaction";
import type {
  MapLibreMapLike,
  MapLibreRenderedFeatureLike,
  PlotLibreLayerIds,
} from "./types.js";

export type SelectionRegionResolutionErrorCode =
  | "SELECTION_REGION_QUERY_FAILED"
  | "SELECTION_REGION_CANDIDATE_GENERATION_FAILED"
  | "SELECTION_REGION_PROJECTION_FAILED";

export class SelectionRegionResolutionError extends Error {
  public readonly code: SelectionRegionResolutionErrorCode;
  public readonly plotId: string | undefined;
  public readonly cause: unknown;

  public constructor(
    code: SelectionRegionResolutionErrorCode,
    message: string,
    options: { readonly plotId?: string; readonly cause?: unknown } = {},
  ) {
    super(message);
    this.name = "SelectionRegionResolutionError";
    this.code = code;
    this.plotId = options.plotId;
    this.cause = options.cause;
  }
}

export interface SelectionRegionResolverMetrics {
  readonly queriedFeatureCount: number;
  readonly uniqueRenderedPlotIdCount: number;
  readonly candidateCount: number;
  readonly generatedCandidateCount: number;
  readonly projectedGeometryCount: number;
}

export interface SelectionRegionResolution {
  readonly ids: readonly string[];
  readonly metrics: SelectionRegionResolverMetrics;
}

export interface MapLibreSelectionRegionResolverOptions {
  readonly layerIds?: Partial<
    Pick<PlotLibreLayerIds, "fill" | "line" | "point">
  >;
}

type StoreReader = Pick<PlotStore, "list">;
type RegistryGenerator = Pick<PlotRegistry, "generate">;

const DEFAULT_QUERY_LAYER_IDS = Object.freeze({
  fill: "plotlibre-fill",
  line: "plotlibre-line",
  point: "plotlibre-point",
});

/**
 * Resolves one exact screen-space region against semantic PlotFeature output.
 *
 * MapLibre's rendered feature index is used only as a broad phase. The final
 * ids are ordered by PlotStore document order and every unique candidate is
 * generated and projected once before exact screen-geometry intersection.
 */
export class MapLibreSelectionRegionResolver {
  readonly #map: MapLibreMapLike;
  readonly #store: StoreReader;
  readonly #registry: RegistryGenerator;
  readonly #queryLayerIds: readonly string[];

  public constructor(
    map: MapLibreMapLike,
    store: StoreReader,
    registry: RegistryGenerator,
    options: MapLibreSelectionRegionResolverOptions = {},
  ) {
    this.#map = map;
    this.#store = store;
    this.#registry = registry;
    this.#queryLayerIds = Object.freeze([
      options.layerIds?.fill ?? DEFAULT_QUERY_LAYER_IDS.fill,
      options.layerIds?.line ?? DEFAULT_QUERY_LAYER_IDS.line,
      options.layerIds?.point ?? DEFAULT_QUERY_LAYER_IDS.point,
    ]);
  }

  public resolve(
    regionPoints: readonly ScreenPoint[],
    bounds: ScreenBounds,
  ): SelectionRegionResolution {
    const rendered = this.#query(bounds);
    const renderedIds = collectRenderedPlotIds(rendered);
    const orderedCandidates = this.#store
      .list()
      .filter((feature) => renderedIds.has(feature.id));

    const selectedIds: string[] = [];
    let generatedCandidateCount = 0;
    let projectedGeometryCount = 0;

    for (const feature of orderedCandidates) {
      let bundle: RenderBundle;
      try {
        bundle = this.#registry.generate(feature);
        generatedCandidateCount += 1;
      } catch (error) {
        throw new SelectionRegionResolutionError(
          "SELECTION_REGION_CANDIDATE_GENERATION_FAILED",
          `Failed to generate selection candidate "${feature.id}".`,
          { plotId: feature.id, cause: error },
        );
      }

      let projected: readonly ScreenGeometry[];
      try {
        projected = this.#projectSelectableBundle(bundle, feature);
        projectedGeometryCount += projected.length;
      } catch (error) {
        if (error instanceof SelectionRegionResolutionError) throw error;
        throw new SelectionRegionResolutionError(
          "SELECTION_REGION_PROJECTION_FAILED",
          `Failed to project selection candidate "${feature.id}".`,
          { plotId: feature.id, cause: error },
        );
      }

      if (
        projected.some((geometry) =>
          screenGeometryIntersectsRegion(geometry, regionPoints),
        )
      ) {
        selectedIds.push(feature.id);
      }
    }

    return Object.freeze({
      ids: Object.freeze(selectedIds),
      metrics: Object.freeze({
        queriedFeatureCount: rendered.length,
        uniqueRenderedPlotIdCount: renderedIds.size,
        candidateCount: orderedCandidates.length,
        generatedCandidateCount,
        projectedGeometryCount,
      }),
    });
  }

  #query(bounds: ScreenBounds): readonly MapLibreRenderedFeatureLike[] {
    const query = this.#map.queryRenderedFeatures;
    if (query === undefined) {
      throw new SelectionRegionResolutionError(
        "SELECTION_REGION_QUERY_FAILED",
        "Map adapter does not provide queryRenderedFeatures().",
      );
    }

    try {
      const result = query.call(
        this.#map,
        [
          [bounds.minX, bounds.minY],
          [bounds.maxX, bounds.maxY],
        ],
        { layers: [...this.#queryLayerIds] },
      );
      if (!Array.isArray(result)) {
        throw new TypeError("queryRenderedFeatures() must return an array.");
      }
      return result;
    } catch (error) {
      if (error instanceof SelectionRegionResolutionError) throw error;
      throw new SelectionRegionResolutionError(
        "SELECTION_REGION_QUERY_FAILED",
        "Failed to query rendered selection candidates.",
        { cause: error },
      );
    }
  }

  #projectSelectableBundle(
    bundle: RenderBundle,
    feature: PlotFeature,
  ): readonly ScreenGeometry[] {
    const geometries: ScreenGeometry[] = [];
    for (const rendered of [
      ...bundle.fills,
      ...bundle.lines,
      ...bundle.points,
    ]) {
      geometries.push(this.#projectGeometry(rendered.geometry, feature.id));
    }
    return geometries;
  }

  #projectGeometry(geometry: PlotGeometry, plotId: string): ScreenGeometry {
    switch (geometry.type) {
      case "Point":
        return {
          type: "Point",
          coordinates: this.#projectPosition(geometry.coordinates, plotId),
        };
      case "LineString":
        return {
          type: "LineString",
          coordinates: geometry.coordinates.map((position) =>
            this.#projectPosition(position, plotId),
          ),
        };
      case "Polygon":
        return {
          type: "Polygon",
          coordinates: geometry.coordinates.map((ring) =>
            ring.map((position) => this.#projectPosition(position, plotId)),
          ),
        };
      case "MultiLineString":
        return {
          type: "MultiLineString",
          coordinates: geometry.coordinates.map((line) =>
            line.map((position) => this.#projectPosition(position, plotId)),
          ),
        };
      case "MultiPolygon":
        return {
          type: "MultiPolygon",
          coordinates: geometry.coordinates.map((polygon) =>
            polygon.map((ring) =>
              ring.map((position) => this.#projectPosition(position, plotId)),
            ),
          ),
        };
    }
  }

  #projectPosition(position: Position, plotId: string): ScreenPoint {
    const project = this.#map.project;
    if (project === undefined) {
      throw new SelectionRegionResolutionError(
        "SELECTION_REGION_PROJECTION_FAILED",
        "Map adapter does not provide project().",
        { plotId },
      );
    }

    let projected: { readonly x: number; readonly y: number };
    try {
      projected = project.call(this.#map, position);
    } catch (error) {
      throw new SelectionRegionResolutionError(
        "SELECTION_REGION_PROJECTION_FAILED",
        `Map projection failed for selection candidate "${plotId}".`,
        { plotId, cause: error },
      );
    }

    if (!Number.isFinite(projected.x) || !Number.isFinite(projected.y)) {
      throw new SelectionRegionResolutionError(
        "SELECTION_REGION_PROJECTION_FAILED",
        `Map projection returned non-finite coordinates for "${plotId}".`,
        { plotId },
      );
    }
    return { x: projected.x, y: projected.y };
  }
}

function collectRenderedPlotIds(
  features: readonly MapLibreRenderedFeatureLike[],
): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const feature of features) {
    const plotId = feature.properties?.plotId;
    if (typeof plotId === "string" && plotId.length > 0) ids.add(plotId);
  }
  return ids;
}

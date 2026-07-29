export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | { readonly [key: string]: JsonValue }
  | readonly JsonValue[];

export type Position = readonly [longitude: number, latitude: number];

export interface PointGeometry {
  readonly type: "Point";
  readonly coordinates: Position;
}

export interface LineStringGeometry {
  readonly type: "LineString";
  readonly coordinates: readonly Position[];
}

export interface PolygonGeometry {
  readonly type: "Polygon";
  readonly coordinates: readonly (readonly Position[])[];
}

export interface MultiLineStringGeometry {
  readonly type: "MultiLineString";
  readonly coordinates: readonly (readonly Position[])[];
}

export interface MultiPolygonGeometry {
  readonly type: "MultiPolygon";
  readonly coordinates: readonly (readonly (readonly Position[])[])[];
}

export type PlotGeometry =
  | PointGeometry
  | LineStringGeometry
  | PolygonGeometry
  | MultiLineStringGeometry
  | MultiPolygonGeometry;

export interface GeoJsonFeature<
  TGeometry extends PlotGeometry = PlotGeometry,
  TProperties extends Record<string, JsonValue> = Record<string, JsonValue>,
> {
  readonly type: "Feature";
  readonly id?: string | number;
  readonly geometry: TGeometry;
  readonly properties: TProperties;
}

export interface GeoJsonFeatureCollection<
  TGeometry extends PlotGeometry = PlotGeometry,
  TProperties extends Record<string, JsonValue> = Record<string, JsonValue>,
> {
  readonly type: "FeatureCollection";
  readonly features: readonly GeoJsonFeature<TGeometry, TProperties>[];
}

export type PlotSizeMode = "ground" | "screen" | "relative";
export type PlotCoordinateMode = "local" | "geodesic";

export interface PlotStyle {
  readonly fillColor?: string;
  readonly fillOpacity?: number;
  readonly lineColor?: string;
  readonly lineOpacity?: number;
  readonly lineWidth?: number;
  readonly lineDasharray?: readonly number[];
  readonly pointColor?: string;
  readonly pointRadius?: number;
  readonly textColor?: string;
  readonly textSize?: number;
}

export interface PlotFeature {
  readonly id: string;
  readonly plotType: string;
  readonly definitionVersion: string;
  readonly controlPoints: readonly Position[];
  readonly parameters: Readonly<Record<string, JsonValue>>;
  readonly style: PlotStyle;
  readonly metadata: Readonly<Record<string, JsonValue>>;
  readonly revision: number;
}

export interface PlotFeatureInput {
  readonly id: string;
  readonly plotType: string;
  readonly definitionVersion?: string;
  readonly controlPoints: readonly Position[];
  readonly parameters?: Readonly<Record<string, JsonValue>>;
  readonly style?: PlotStyle;
  readonly metadata?: Readonly<Record<string, JsonValue>>;
  readonly revision?: number;
}

export interface ControlSchema {
  readonly minPoints: number;
  readonly maxPoints: number;
  readonly completeOnDoubleClick?: boolean;
  readonly allowPointInsertion?: boolean;
  readonly allowPointRemoval?: boolean;
}

export type PlotRenderRole =
  | "fill"
  | "outline"
  | "line"
  | "point"
  | "label"
  | "hit-area"
  | "handle";

export interface PlotRenderProperties extends Record<string, JsonValue> {
  readonly plotId: string;
  readonly plotType: string;
  readonly role: PlotRenderRole;
  readonly fillColor?: string;
  readonly fillOpacity?: number;
  readonly lineColor?: string;
  readonly lineOpacity?: number;
  readonly lineWidth?: number;
  readonly pointColor?: string;
  readonly pointRadius?: number;
  readonly handleKind?: string;
  readonly handleIndex?: number;
  readonly plotRenderId?: string;
}

export interface RenderBundle {
  readonly fills: readonly GeoJsonFeature<PlotGeometry, PlotRenderProperties>[];
  readonly lines: readonly GeoJsonFeature<PlotGeometry, PlotRenderProperties>[];
  readonly points: readonly GeoJsonFeature<PointGeometry, PlotRenderProperties>[];
  readonly labels: readonly GeoJsonFeature<PointGeometry, PlotRenderProperties>[];
  readonly hitAreas: readonly GeoJsonFeature<PlotGeometry, PlotRenderProperties>[];
}

export interface GenerateContext {
  readonly feature: PlotFeature;
}

export interface CanonicalizeControlPointsContext {
  readonly feature: PlotFeature;
}

export interface ValidationIssue {
  readonly code: string;
  readonly message: string;
  readonly severity: "error" | "warning";
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly issues: readonly ValidationIssue[];
}

export interface PlotDefinition {
  readonly type: string;
  readonly title: string;
  readonly category: string;
  readonly version: string;
  readonly controlSchema: ControlSchema;
  readonly defaultParameters: Readonly<Record<string, JsonValue>>;
  readonly defaultStyle: PlotStyle;
  /**
   * Optionally reorders an existing authored control set into the Definition's
   * canonical positional roles. The result must be a deterministic permutation
   * of the input coordinates: controls may not be added, removed or moved.
   */
  canonicalizeControlPoints?(
    context: CanonicalizeControlPointsContext,
  ): readonly Position[];
  /**
   * Optionally derives a complete transient control set from the currently
   * authored controls. The result is used only for draft rendering and must
   * never be persisted as canonical feature state.
   */
  deriveDraftControlPoints?(
    controlPoints: readonly Position[],
  ): readonly Position[] | undefined;
  generate(context: GenerateContext): RenderBundle;
  validate?(context: GenerateContext): ValidationResult;
}

export interface PlotDocument {
  readonly type: "PlotLibreDocument";
  readonly schemaVersion: "1.0.0";
  readonly id: string;
  readonly name: string;
  readonly features: readonly PlotFeature[];
  readonly metadata: Readonly<Record<string, JsonValue>>;
}

export function emptyRenderBundle(): RenderBundle {
  return {
    fills: [],
    lines: [],
    points: [],
    labels: [],
    hitAreas: [],
  };
}

export function createPlotFeature(input: PlotFeatureInput): PlotFeature {
  return {
    id: input.id,
    plotType: input.plotType,
    definitionVersion: input.definitionVersion ?? "1.0.0",
    controlPoints: input.controlPoints.map(
      ([longitude, latitude]) => [longitude, latitude] as const,
    ),
    parameters: { ...(input.parameters ?? {}) },
    style: { ...(input.style ?? {}) },
    metadata: { ...(input.metadata ?? {}) },
    revision: input.revision ?? 0,
  };
}

export function clonePlotFeature(feature: PlotFeature): PlotFeature {
  return createPlotFeature(feature);
}

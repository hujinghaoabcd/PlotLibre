import type {
  PlotFeature,
  PlotRenderProperties,
  PlotRenderRole,
  PlotStyle,
} from "@plotlibre/core";

export const DEFAULT_ARROW_STYLE: PlotStyle = {
  fillColor: "#d32f2f",
  fillOpacity: 0.45,
  lineColor: "#8e0000",
  lineOpacity: 1,
  lineWidth: 2,
};

export const DEFAULT_AREA_STYLE: PlotStyle = {
  fillColor: "#1976d2",
  fillOpacity: 0.3,
  lineColor: "#0d47a1",
  lineOpacity: 1,
  lineWidth: 2,
};

export const DEFAULT_LINE_STYLE: PlotStyle = {
  lineColor: "#6a1b9a",
  lineOpacity: 1,
  lineWidth: 3,
};

export function createRenderProperties(
  feature: PlotFeature,
  role: PlotRenderRole,
  defaultStyle: PlotStyle,
): PlotRenderProperties {
  const style = { ...defaultStyle, ...feature.style };
  const properties: Record<string, string | number> = {
    plotId: feature.id,
    plotType: feature.plotType,
    role,
  };

  if (style.fillColor !== undefined) properties.fillColor = style.fillColor;
  if (style.fillOpacity !== undefined) properties.fillOpacity = style.fillOpacity;
  if (style.lineColor !== undefined) properties.lineColor = style.lineColor;
  if (style.lineOpacity !== undefined) properties.lineOpacity = style.lineOpacity;
  if (style.lineWidth !== undefined) properties.lineWidth = style.lineWidth;
  if (style.pointColor !== undefined) properties.pointColor = style.pointColor;
  if (style.pointRadius !== undefined) properties.pointRadius = style.pointRadius;

  return properties as PlotRenderProperties;
}

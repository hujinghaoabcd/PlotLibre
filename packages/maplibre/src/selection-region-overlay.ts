import type {
  ScreenBounds,
  ScreenPoint,
} from "@plotlibre/interaction";
import type { MapContainerLike } from "./types.js";

export interface SelectionRegionOverlayFrame {
  readonly kind: "box" | "lasso";
  readonly points: readonly ScreenPoint[];
  readonly bounds?: ScreenBounds;
  readonly rejected?: boolean;
}

export interface SelectionRegionOverlayLike {
  render(frame: SelectionRegionOverlayFrame): void;
  clear(): void;
  destroy(): void;
}

/**
 * Transient CSS-pixel region guide. The overlay is DOM presentation only and
 * never creates a MapLibre source/layer or geographic PlotJSON geometry.
 */
export class MapLibreSelectionRegionOverlay
  implements SelectionRegionOverlayLike
{
  readonly #container: MapContainerLike | undefined;
  #root: HTMLDivElement | undefined;
  #svg: SVGSVGElement | undefined;
  #path: SVGPathElement | undefined;

  public constructor(container: MapContainerLike | undefined) {
    this.#container = container;
  }

  public render(frame: SelectionRegionOverlayFrame): void {
    this.#ensureElements();
    if (!this.#root || !this.#path) return;

    const points = frame.kind === "box"
      ? boxFramePoints(frame)
      : frame.points;
    if (points.length < 2) {
      this.clear();
      return;
    }

    const path = points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");
    const closed = frame.kind === "box" || points.length >= 3;
    this.#path.setAttribute("d", `${path}${closed ? " Z" : ""}`);
    this.#path.setAttribute(
      "fill",
      frame.rejected ? "rgba(211,47,47,0.12)" : "rgba(25,118,210,0.12)",
    );
    this.#path.setAttribute(
      "stroke",
      frame.rejected ? "#d32f2f" : "#1976d2",
    );
    this.#path.setAttribute("stroke-width", "2");
    this.#path.setAttribute("stroke-dasharray", "6 4");
    this.#path.setAttribute("vector-effect", "non-scaling-stroke");
    this.#root.style.display = "block";
  }

  public clear(): void {
    if (this.#path) this.#path.setAttribute("d", "");
    if (this.#root) this.#root.style.display = "none";
  }

  public destroy(): void {
    const root = this.#root;
    this.#root = undefined;
    this.#svg = undefined;
    this.#path = undefined;
    if (!root) return;
    if (root.parentNode) root.parentNode.removeChild(root);
  }

  #ensureElements(): void {
    if (this.#root) return;
    const documentObject = globalThis.document;
    const container = this.#container as unknown as Node | undefined;
    if (!documentObject || !container || !("appendChild" in container)) return;

    const root = documentObject.createElement("div");
    root.setAttribute("aria-hidden", "true");
    root.dataset.plotlibreSelectionRegion = "true";
    Object.assign(root.style, {
      position: "absolute",
      inset: "0",
      overflow: "hidden",
      pointerEvents: "none",
      zIndex: "4",
      display: "none",
    });

    const svg = documentObject.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.style.display = "block";

    const path = documentObject.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );
    svg.appendChild(path);
    root.appendChild(svg);
    container.appendChild(root);

    this.#root = root;
    this.#svg = svg;
    this.#path = path;
  }
}

function boxFramePoints(
  frame: SelectionRegionOverlayFrame,
): readonly ScreenPoint[] {
  const bounds = frame.bounds;
  if (!bounds) return frame.points;
  return [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
    { x: bounds.minX, y: bounds.maxY },
  ];
}

import type {
  SelectionTransformKind,
} from "@plotlibre/interaction";
import type { MapContainerLike } from "./types.js";

export interface SelectionTransformScreenPoint {
  readonly x: number;
  readonly y: number;
}

export interface SelectionTransformOverlayFrame {
  readonly kind: SelectionTransformKind;
  readonly corners: readonly [
    SelectionTransformScreenPoint,
    SelectionTransformScreenPoint,
    SelectionTransformScreenPoint,
    SelectionTransformScreenPoint,
  ];
  readonly pivot: SelectionTransformScreenPoint;
  readonly scaleHandle: SelectionTransformScreenPoint;
  readonly rotationHandle: SelectionTransformScreenPoint;
  readonly label?: string;
  readonly rejected?: boolean;
}

export interface SelectionTransformOverlayPointerEvent {
  readonly kind: SelectionTransformKind;
  readonly point: SelectionTransformScreenPoint;
  readonly pointerId: number;
  preventDefault?(): void;
  stopPropagation?(): void;
  stopImmediatePropagation?(): void;
}

export interface SelectionTransformOverlayHandlers {
  pointerDown(event: SelectionTransformOverlayPointerEvent): void;
  pointerMove(event: SelectionTransformOverlayPointerEvent): void;
  pointerUp(event: SelectionTransformOverlayPointerEvent): void;
  pointerCancel(event: SelectionTransformOverlayPointerEvent): void;
}

export interface SelectionTransformOverlayLike {
  setHandlers(handlers: SelectionTransformOverlayHandlers | undefined): void;
  render(frame: SelectionTransformOverlayFrame): void;
  clear(): void;
  destroy(): void;
}

/**
 * DOM/SVG presentation for one explicit selection transform mode.
 *
 * Only the active mode handle receives pointer events. The overlay owns pointer
 * capture so transform movement remains independent from MapLibre layers and
 * never creates geographic Source/Layer state.
 */
export class MapLibreSelectionTransformOverlay
  implements SelectionTransformOverlayLike
{
  readonly #container: MapContainerLike | undefined;
  #handlers: SelectionTransformOverlayHandlers | undefined;
  #root: HTMLDivElement | undefined;
  #svg: SVGSVGElement | undefined;
  #framePath: SVGPathElement | undefined;
  #rotationGuide: SVGLineElement | undefined;
  #pivot: SVGCircleElement | undefined;
  #scaleHandle: SVGCircleElement | undefined;
  #rotationHandle: SVGCircleElement | undefined;
  #label: SVGTextElement | undefined;
  #activeHandle: SVGCircleElement | undefined;
  #activeKind: SelectionTransformKind | undefined;
  #activePointerId: number | undefined;

  public constructor(container: MapContainerLike | undefined) {
    this.#container = container;
  }

  public setHandlers(
    handlers: SelectionTransformOverlayHandlers | undefined,
  ): void {
    this.#handlers = handlers;
  }

  public render(frame: SelectionTransformOverlayFrame): void {
    this.#ensureElements();
    if (
      !this.#root ||
      !this.#framePath ||
      !this.#rotationGuide ||
      !this.#pivot ||
      !this.#scaleHandle ||
      !this.#rotationHandle ||
      !this.#label
    ) {
      return;
    }

    const path = frame.corners
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");
    this.#framePath.setAttribute("d", `${path} Z`);
    this.#framePath.setAttribute(
      "stroke",
      frame.rejected ? "#d32f2f" : "#1976d2",
    );
    this.#framePath.setAttribute(
      "fill",
      frame.rejected ? "rgba(211,47,47,0.08)" : "rgba(25,118,210,0.06)",
    );

    setCirclePosition(this.#pivot, frame.pivot);
    setCirclePosition(this.#scaleHandle, frame.scaleHandle);
    setCirclePosition(this.#rotationHandle, frame.rotationHandle);
    this.#rotationGuide.setAttribute("x1", String(frame.pivot.x));
    this.#rotationGuide.setAttribute("y1", String(frame.pivot.y));
    this.#rotationGuide.setAttribute("x2", String(frame.rotationHandle.x));
    this.#rotationGuide.setAttribute("y2", String(frame.rotationHandle.y));

    this.#scaleHandle.style.display = frame.kind === "scale" ? "block" : "none";
    this.#rotationHandle.style.display = frame.kind === "rotate" ? "block" : "none";
    this.#rotationGuide.style.display = frame.kind === "rotate" ? "block" : "none";
    this.#scaleHandle.style.pointerEvents = frame.kind === "scale" ? "all" : "none";
    this.#rotationHandle.style.pointerEvents = frame.kind === "rotate" ? "all" : "none";

    const labelPoint = frame.kind === "rotate"
      ? frame.rotationHandle
      : frame.scaleHandle;
    this.#label.setAttribute("x", String(labelPoint.x + 10));
    this.#label.setAttribute("y", String(labelPoint.y - 10));
    this.#label.textContent = frame.label ?? "";
    this.#label.style.display = frame.label ? "block" : "none";
    this.#label.setAttribute(
      "fill",
      frame.rejected ? "#d32f2f" : "#0d47a1",
    );

    this.#root.dataset.plotlibreSelectionTransformKind = frame.kind;
    this.#root.dataset.plotlibreSelectionTransformRejected = String(
      frame.rejected === true,
    );
    this.#root.style.display = "block";
  }

  public clear(): void {
    this.#releaseActivePointer();
    if (this.#framePath) this.#framePath.setAttribute("d", "");
    if (this.#label) this.#label.textContent = "";
    if (this.#root) this.#root.style.display = "none";
  }

  public destroy(): void {
    this.clear();
    this.#handlers = undefined;
    const root = this.#root;
    this.#root = undefined;
    this.#svg = undefined;
    this.#framePath = undefined;
    this.#rotationGuide = undefined;
    this.#pivot = undefined;
    this.#scaleHandle = undefined;
    this.#rotationHandle = undefined;
    this.#label = undefined;
    if (root?.parentNode) root.parentNode.removeChild(root);
  }

  #ensureElements(): void {
    if (this.#root) return;
    const documentObject = globalThis.document;
    const container = this.#container as unknown as Node | undefined;
    if (!documentObject || !container || !("appendChild" in container)) return;

    const root = documentObject.createElement("div");
    root.setAttribute("aria-hidden", "true");
    root.dataset.plotlibreSelectionTransform = "true";
    Object.assign(root.style, {
      position: "absolute",
      inset: "0",
      overflow: "hidden",
      pointerEvents: "none",
      zIndex: "5",
      display: "none",
    });

    const svg = documentObject.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.style.display = "block";
    svg.style.overflow = "hidden";

    const framePath = createSvgElement(documentObject, "path");
    framePath.setAttribute("stroke-width", "2");
    framePath.setAttribute("stroke-dasharray", "6 4");
    framePath.setAttribute("vector-effect", "non-scaling-stroke");
    framePath.style.pointerEvents = "none";

    const rotationGuide = createSvgElement(documentObject, "line");
    rotationGuide.setAttribute("stroke", "#1976d2");
    rotationGuide.setAttribute("stroke-width", "2");
    rotationGuide.setAttribute("stroke-dasharray", "4 3");
    rotationGuide.setAttribute("vector-effect", "non-scaling-stroke");
    rotationGuide.style.pointerEvents = "none";

    const pivot = createSvgElement(documentObject, "circle");
    pivot.setAttribute("r", "5");
    pivot.setAttribute("fill", "#ffffff");
    pivot.setAttribute("stroke", "#1976d2");
    pivot.setAttribute("stroke-width", "2");
    pivot.style.pointerEvents = "none";

    const scaleHandle = createTransformHandle(documentObject, "scale");
    const rotationHandle = createTransformHandle(documentObject, "rotate");

    const label = createSvgElement(documentObject, "text");
    label.setAttribute("font-size", "12");
    label.setAttribute("font-family", "system-ui, sans-serif");
    label.setAttribute("font-weight", "600");
    label.setAttribute("paint-order", "stroke");
    label.setAttribute("stroke", "#ffffff");
    label.setAttribute("stroke-width", "3");
    label.setAttribute("stroke-linejoin", "round");
    label.style.pointerEvents = "none";

    for (const child of [
      framePath,
      rotationGuide,
      pivot,
      scaleHandle,
      rotationHandle,
      label,
    ]) {
      svg.appendChild(child);
    }
    root.appendChild(svg);
    container.appendChild(root);

    this.#root = root;
    this.#svg = svg;
    this.#framePath = framePath;
    this.#rotationGuide = rotationGuide;
    this.#pivot = pivot;
    this.#scaleHandle = scaleHandle;
    this.#rotationHandle = rotationHandle;
    this.#label = label;

    for (const [element, kind] of [
      [scaleHandle, "scale"],
      [rotationHandle, "rotate"],
    ] as const) {
      element.addEventListener("pointerdown", (event) => {
        if (this.#activePointerId !== undefined || event.button !== 0) return;
        this.#activeHandle = element;
        this.#activeKind = kind;
        this.#activePointerId = event.pointerId;
        element.setPointerCapture?.(event.pointerId);
        this.#handlers?.pointerDown(toOverlayEvent(kind, event, root));
      });
      element.addEventListener("pointermove", (event) => {
        if (!this.#matchesActive(kind, event.pointerId)) return;
        this.#handlers?.pointerMove(toOverlayEvent(kind, event, root));
      });
      element.addEventListener("pointerup", (event) => {
        if (!this.#matchesActive(kind, event.pointerId)) return;
        const overlayEvent = toOverlayEvent(kind, event, root);
        this.#activePointerId = undefined;
        this.#activeKind = undefined;
        this.#activeHandle = undefined;
        this.#handlers?.pointerUp(overlayEvent);
        element.releasePointerCapture?.(event.pointerId);
      });
      element.addEventListener("pointercancel", (event) => {
        if (!this.#matchesActive(kind, event.pointerId)) return;
        const overlayEvent = toOverlayEvent(kind, event, root);
        this.#activePointerId = undefined;
        this.#activeKind = undefined;
        this.#activeHandle = undefined;
        this.#handlers?.pointerCancel(overlayEvent);
      });
      element.addEventListener("lostpointercapture", (event) => {
        if (!this.#matchesActive(kind, event.pointerId)) return;
        const overlayEvent = toOverlayEvent(kind, event, root);
        this.#activePointerId = undefined;
        this.#activeKind = undefined;
        this.#activeHandle = undefined;
        this.#handlers?.pointerCancel(overlayEvent);
      });
    }
  }

  #matchesActive(kind: SelectionTransformKind, pointerId: number): boolean {
    return this.#activeKind === kind && this.#activePointerId === pointerId;
  }

  #releaseActivePointer(): void {
    const pointerId = this.#activePointerId;
    const handle = this.#activeHandle;
    this.#activePointerId = undefined;
    this.#activeKind = undefined;
    this.#activeHandle = undefined;
    if (
      pointerId !== undefined &&
      handle?.hasPointerCapture?.(pointerId)
    ) {
      handle.releasePointerCapture(pointerId);
    }
  }
}

function createTransformHandle(
  documentObject: Document,
  kind: SelectionTransformKind,
): SVGCircleElement {
  const handle = createSvgElement(documentObject, "circle");
  handle.dataset.plotlibreSelectionTransformHandle = kind;
  handle.setAttribute("r", "8");
  handle.setAttribute("fill", "#ffffff");
  handle.setAttribute("stroke", kind === "rotate" ? "#7b1fa2" : "#1976d2");
  handle.setAttribute("stroke-width", "3");
  handle.style.cursor = kind === "rotate" ? "crosshair" : "nwse-resize";
  handle.style.pointerEvents = "all";
  return handle;
}

function createSvgElement<K extends keyof SVGElementTagNameMap>(
  documentObject: Document,
  name: K,
): SVGElementTagNameMap[K] {
  return documentObject.createElementNS("http://www.w3.org/2000/svg", name);
}

function setCirclePosition(
  circle: SVGCircleElement,
  point: SelectionTransformScreenPoint,
): void {
  circle.setAttribute("cx", String(point.x));
  circle.setAttribute("cy", String(point.y));
}

function toOverlayEvent(
  kind: SelectionTransformKind,
  event: PointerEvent,
  root: HTMLDivElement,
): SelectionTransformOverlayPointerEvent {
  const rectangle = root.getBoundingClientRect();
  return {
    kind,
    point: {
      x: event.clientX - rectangle.left,
      y: event.clientY - rectangle.top,
    },
    pointerId: event.pointerId,
    preventDefault: () => event.preventDefault(),
    stopPropagation: () => event.stopPropagation(),
    stopImmediatePropagation: () => event.stopImmediatePropagation(),
  };
}

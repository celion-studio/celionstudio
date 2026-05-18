import type { CelionEditableElement } from "@/lib/slide-document";

export type LayoutTarget = {
  slideId: string;
  element: CelionEditableElement;
};

const DRAG_START_THRESHOLD = 3;
const MOVE_HANDLE_SIZE = 24;
const RESIZE_DOT_SIZE = 11;
const SELECTION_LINE_WIDTH = 2;
const MIN_RESIZE_SIZE = 24;
const CHROME_Z_INDEX = "2147483647";
const CHROME_RESIZE_Z_INDEX = "2147483646";
const CHROME_BOX_Z_INDEX = "2147483645";
const CHROME_SURFACE = "#ffffff";
const CHROME_ACCENT = "#ff5a1f";
const CHROME_ACCENT_DEEP = "#e94612";
const CHROME_VERSION = "layout-controls-v4";

type ResizeAxis = -1 | 0 | 1;

type ResizeHandleConfig = {
  id: string;
  title: string;
  cursor: string;
  x: ResizeAxis;
  y: ResizeAxis;
};

const RESIZE_HANDLES: ResizeHandleConfig[] = [
  { id: "nw", title: "Resize top left", cursor: "nwse-resize", x: -1, y: -1 },
  { id: "n", title: "Resize top", cursor: "ns-resize", x: 0, y: -1 },
  { id: "ne", title: "Resize top right", cursor: "nesw-resize", x: 1, y: -1 },
  { id: "e", title: "Resize right", cursor: "ew-resize", x: 1, y: 0 },
  { id: "se", title: "Resize bottom right", cursor: "nwse-resize", x: 1, y: 1 },
  { id: "s", title: "Resize bottom", cursor: "ns-resize", x: 0, y: 1 },
  { id: "sw", title: "Resize bottom left", cursor: "nesw-resize", x: -1, y: 1 },
  { id: "w", title: "Resize left", cursor: "ew-resize", x: -1, y: 0 },
];

function formatDragTransform(baseTransform: string, deltaX: number, deltaY: number) {
  const x = Math.round(deltaX);
  const y = Math.round(deltaY);
  const translate = `translate(${x}px, ${y}px)`;
  const base = baseTransform.trim();

  if (!base || base === "none") return translate;
  return `${base} ${translate}`;
}

function formatPixelSize(value: number) {
  return `${Math.max(MIN_RESIZE_SIZE, Math.round(value))}px`;
}

function attributeSelector(name: string, value: string) {
  return `[${name}="${value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}"]`;
}

export function getLayoutTargetElement(doc: Document, element: CelionEditableElement, slideId?: string) {
  if (!element.selector.startsWith("[data-celion-id=")) return null;

  try {
    const scope = slideId
      ? doc.querySelector<HTMLElement>(attributeSelector("data-celion-slide", slideId))
      : doc;
    return scope?.querySelector<HTMLElement>(element.selector) ?? null;
  } catch {
    return null;
  }
}

export function createPreviewLayoutChrome(
  doc: Document,
  options: {
    getCurrentTarget: () => LayoutTarget | null;
    onTransform: (target: LayoutTarget, transform: string) => void;
    onResize: (target: LayoutTarget, width: string, height: string, transform?: string) => void;
  },
) {
  const selectionBoxId = "celion-selection-box";
  const moveHandleId = "celion-move-handle";
  const resizeHandlePrefix = "celion-resize-handle";

  const getSelectionBox = () => {
    let box = doc.getElementById(selectionBoxId) as HTMLElement | null;
    if (!box) {
      box = doc.createElement("div");
      box.id = selectionBoxId;
      doc.body.appendChild(box);
    }
    if (box.getAttribute("data-celion-editor-version") !== CHROME_VERSION) {
      box.setAttribute("data-celion-editor-chrome", "true");
      box.setAttribute("data-celion-editor-action", "selection");
      box.setAttribute("data-celion-editor-version", CHROME_VERSION);
      box.setAttribute("aria-hidden", "true");
      Object.assign(box.style, {
        position: "absolute",
        border: `${SELECTION_LINE_WIDTH}px solid ${CHROME_ACCENT}`,
        borderRadius: "3px",
        boxSizing: "border-box",
        display: "none",
        pointerEvents: "none",
        zIndex: CHROME_BOX_Z_INDEX,
      } satisfies Partial<CSSStyleDeclaration>);
    }

    return box;
  };

  const getMoveHandle = () => {
    let handle = doc.getElementById(moveHandleId) as HTMLElement | null;
    if (!handle) {
      handle = doc.createElement("div");
      handle.id = moveHandleId;
      doc.body.appendChild(handle);
    }
    if (handle.getAttribute("data-celion-editor-version") !== CHROME_VERSION) {
      handle.setAttribute("data-celion-editor-chrome", "true");
      handle.setAttribute("data-celion-editor-action", "move");
      handle.setAttribute("data-celion-editor-version", CHROME_VERSION);
      handle.setAttribute("aria-hidden", "true");
      handle.title = "Move";
      handle.innerHTML = `
        <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false">
          <circle cx="3" cy="3" r="1" fill="currentColor" />
          <circle cx="9" cy="3" r="1" fill="currentColor" />
          <circle cx="3" cy="9" r="1" fill="currentColor" />
          <circle cx="9" cy="9" r="1" fill="currentColor" />
        </svg>`;
      Object.assign(handle.style, {
        position: "absolute",
        width: `${MOVE_HANDLE_SIZE}px`,
        height: `${MOVE_HANDLE_SIZE}px`,
        alignItems: "center",
        justifyContent: "center",
        border: `1px solid ${CHROME_ACCENT_DEEP}`,
        background: CHROME_ACCENT,
        borderRadius: "6px",
        boxShadow: "0 4px 12px rgba(255, 90, 31, 0.22)",
        boxSizing: "border-box",
        color: CHROME_SURFACE,
        cursor: "grab",
        display: "none",
        touchAction: "none",
        userSelect: "none",
        zIndex: CHROME_Z_INDEX,
      } satisfies Partial<CSSStyleDeclaration>);
    }

    return handle;
  };

  const getResizeHandle = (config: ResizeHandleConfig) => {
    const handleId = `${resizeHandlePrefix}-${config.id}`;
    let handle = doc.getElementById(handleId) as HTMLElement | null;
    if (!handle) {
      handle = doc.createElement("div");
      handle.id = handleId;
      doc.body.appendChild(handle);
    }
    if (handle.getAttribute("data-celion-editor-version") !== CHROME_VERSION) {
      handle.setAttribute("data-celion-editor-chrome", "true");
      handle.setAttribute("data-celion-editor-action", "resize");
      handle.setAttribute("data-celion-resize-axis-x", String(config.x));
      handle.setAttribute("data-celion-resize-axis-y", String(config.y));
      handle.setAttribute("data-celion-editor-version", CHROME_VERSION);
      handle.setAttribute("aria-hidden", "true");
      handle.title = config.title;
      handle.innerHTML = "";
      Object.assign(handle.style, {
        position: "absolute",
        width: `${RESIZE_DOT_SIZE}px`,
        height: `${RESIZE_DOT_SIZE}px`,
        border: `2px solid ${CHROME_ACCENT}`,
        background: CHROME_SURFACE,
        borderRadius: "999px",
        boxSizing: "border-box",
        boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.92), 0 2px 8px rgba(255, 90, 31, 0.18)",
        cursor: config.cursor,
        display: "none",
        touchAction: "none",
        userSelect: "none",
        zIndex: CHROME_RESIZE_Z_INDEX,
      } satisfies Partial<CSSStyleDeclaration>);
    }

    return handle;
  };

  const getResizeHandles = () => RESIZE_HANDLES.map((config) => ({
    config,
    handle: getResizeHandle(config),
  }));

  const hide = () => {
    const selectionBox = doc.getElementById(selectionBoxId) as HTMLElement | null;
    const moveHandle = doc.getElementById(moveHandleId) as HTMLElement | null;
    const rotateHandle = doc.getElementById("celion-rotate-handle") as HTMLElement | null;
    if (selectionBox) selectionBox.style.display = "none";
    if (moveHandle) moveHandle.style.display = "none";
    RESIZE_HANDLES.forEach((config) => {
      const resizeHandle = doc.getElementById(`${resizeHandlePrefix}-${config.id}`) as HTMLElement | null;
      if (resizeHandle) resizeHandle.style.display = "none";
    });
    rotateHandle?.remove();
  };

  const showFor = (element: HTMLElement) => {
    const selectionBox = getSelectionBox();
    const moveHandle = getMoveHandle();
    const resizeHandles = getResizeHandles();
    doc.getElementById("celion-rotate-handle")?.remove();
    const rect = element.getBoundingClientRect();
    const view = doc.defaultView;
    const scrollX = view?.scrollX ?? 0;
    const scrollY = view?.scrollY ?? 0;
    const edgeLeft = rect.left + scrollX;
    const edgeTop = rect.top + scrollY;
    const edgeRight = rect.right + scrollX;
    const edgeBottom = rect.bottom + scrollY;
    const edgeCenterX = edgeLeft + rect.width / 2;
    const edgeCenterY = edgeTop + rect.height / 2;

    selectionBox.style.left = `${edgeLeft - SELECTION_LINE_WIDTH / 2}px`;
    selectionBox.style.top = `${edgeTop - SELECTION_LINE_WIDTH / 2}px`;
    selectionBox.style.width = `${rect.width + SELECTION_LINE_WIDTH}px`;
    selectionBox.style.height = `${rect.height + SELECTION_LINE_WIDTH}px`;
    selectionBox.style.display = "block";

    moveHandle.style.left = `${edgeCenterX - MOVE_HANDLE_SIZE / 2}px`;
    moveHandle.style.top = `${edgeCenterY - MOVE_HANDLE_SIZE / 2}px`;
    moveHandle.style.display = "flex";

    resizeHandles.forEach(({ config, handle }) => {
      const left = config.x === -1 ? edgeLeft : config.x === 1 ? edgeRight : edgeCenterX;
      const top = config.y === -1 ? edgeTop : config.y === 1 ? edgeBottom : edgeCenterY;

      handle.style.left = `${left - RESIZE_DOT_SIZE / 2}px`;
      handle.style.top = `${top - RESIZE_DOT_SIZE / 2}px`;
      handle.style.display = "block";
    });
  };

  const restore = (target: LayoutTarget | null) => {
    if (!target) {
      hide();
      return;
    }

    const selectedNode = getLayoutTargetElement(doc, target.element, target.slideId);
    const pageEl = selectedNode?.closest<HTMLElement>("[data-celion-slide]");
    if (selectedNode && pageEl?.getAttribute("data-celion-slide") === target.slideId) {
      showFor(selectedNode);
    } else {
      hide();
    }
  };

  const handlePointerDown = (e: PointerEvent) => {
    const layoutTarget = options.getCurrentTarget();
    if (!layoutTarget) return;

    const selectedNode = getLayoutTargetElement(doc, layoutTarget.element, layoutTarget.slideId);
    const eventTarget = e.target as Node | null;
    if (!selectedNode || !eventTarget) return;

    const pageEl = selectedNode.closest<HTMLElement>("[data-celion-slide]");
    if (pageEl?.getAttribute("data-celion-slide") !== layoutTarget.slideId) return;

    const moveHandle = doc.getElementById(moveHandleId);
    const resizeTarget = RESIZE_HANDLES
      .map((config) => ({ config, handle: doc.getElementById(`${resizeHandlePrefix}-${config.id}`) }))
      .find(({ handle }) => handle?.contains(eventTarget));
    if (resizeTarget) {
      e.preventDefault();
      e.stopPropagation();

      const rect = selectedNode.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const baseTransform = doc.defaultView?.getComputedStyle(selectedNode).transform ?? selectedNode.style.transform;
      const originalInlineTransform = selectedNode.style.transform;
      const originalInlineWidth = selectedNode.style.width;
      const originalInlineHeight = selectedNode.style.height;
      const originalWillChange = selectedNode.style.willChange;
      const originalCursor = selectedNode.style.cursor;
      let latestWidth = "";
      let latestHeight = "";
      let latestTransform = "";
      let hasResized = false;

      const cleanupResize = () => {
        doc.removeEventListener("pointermove", handleResizeMove);
        doc.removeEventListener("pointerup", handleResizeUp);
        doc.removeEventListener("pointercancel", handleResizeCancel);
        resizeTarget.handle?.releasePointerCapture?.(e.pointerId);
        selectedNode.style.willChange = originalWillChange;
        selectedNode.style.cursor = originalCursor;
      };

      const handleResizeMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;
        const distance = Math.hypot(deltaX, deltaY);
        if (!hasResized && distance < DRAG_START_THRESHOLD) return;

        hasResized = true;
        moveEvent.preventDefault();
        moveEvent.stopPropagation();

        const nextWidth = rect.width + (resizeTarget.config.x === -1 ? -deltaX : resizeTarget.config.x === 1 ? deltaX : 0);
        const nextHeight = rect.height + (resizeTarget.config.y === -1 ? -deltaY : resizeTarget.config.y === 1 ? deltaY : 0);
        const clampedWidth = Math.max(MIN_RESIZE_SIZE, nextWidth);
        const clampedHeight = Math.max(MIN_RESIZE_SIZE, nextHeight);
        const shiftX = resizeTarget.config.x === -1 ? rect.width - clampedWidth : 0;
        const shiftY = resizeTarget.config.y === -1 ? rect.height - clampedHeight : 0;

        latestWidth = formatPixelSize(clampedWidth);
        latestHeight = formatPixelSize(clampedHeight);
        latestTransform = shiftX || shiftY ? formatDragTransform(baseTransform, shiftX, shiftY) : "";
        selectedNode.style.willChange = latestTransform ? "width, height, transform" : "width, height";
        selectedNode.style.cursor = resizeTarget.config.cursor;
        selectedNode.style.width = latestWidth;
        selectedNode.style.height = latestHeight;
        if (latestTransform) selectedNode.style.transform = latestTransform;
        showFor(selectedNode);
      };

      const handleResizeUp = (upEvent: PointerEvent) => {
        cleanupResize();
        if (!hasResized || !latestWidth || !latestHeight) return;

        upEvent.preventDefault();
        upEvent.stopPropagation();
        options.onResize(layoutTarget, latestWidth, latestHeight, latestTransform || undefined);
      };

      const handleResizeCancel = () => {
        cleanupResize();
        selectedNode.style.transform = originalInlineTransform;
        selectedNode.style.width = originalInlineWidth;
        selectedNode.style.height = originalInlineHeight;
        showFor(selectedNode);
      };

      resizeTarget.handle?.setPointerCapture?.(e.pointerId);
      doc.addEventListener("pointermove", handleResizeMove);
      doc.addEventListener("pointerup", handleResizeUp);
      doc.addEventListener("pointercancel", handleResizeCancel);
      return;
    }

    const startedFromMoveHandle = Boolean(moveHandle?.contains(eventTarget));
    if (!startedFromMoveHandle) return;

    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const baseTransform = doc.defaultView?.getComputedStyle(selectedNode).transform ?? selectedNode.style.transform;
    const originalInlineTransform = selectedNode.style.transform;
    const originalWillChange = selectedNode.style.willChange;
    const originalCursor = selectedNode.style.cursor;
    let latestTransform = "";
    let hasDragged = false;
    const captureTarget = startedFromMoveHandle && moveHandle ? moveHandle : selectedNode;

    const cleanupDrag = () => {
      doc.removeEventListener("pointermove", handlePointerMove);
      doc.removeEventListener("pointerup", handlePointerUp);
      doc.removeEventListener("pointercancel", handlePointerCancel);
      captureTarget.releasePointerCapture?.(e.pointerId);
      selectedNode.style.willChange = originalWillChange;
      selectedNode.style.cursor = originalCursor;
      if (moveHandle) moveHandle.style.cursor = "grab";
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      const distance = Math.hypot(deltaX, deltaY);
      if (!hasDragged && distance < DRAG_START_THRESHOLD) return;

      hasDragged = true;
      moveEvent.preventDefault();
      moveEvent.stopPropagation();
      latestTransform = formatDragTransform(baseTransform, deltaX, deltaY);
      selectedNode.style.willChange = "transform";
      selectedNode.style.cursor = "grabbing";
      if (moveHandle) moveHandle.style.cursor = "grabbing";
      selectedNode.style.transform = latestTransform;
      showFor(selectedNode);
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      cleanupDrag();
      if (!hasDragged || !latestTransform) return;

      upEvent.preventDefault();
      upEvent.stopPropagation();
      options.onTransform(layoutTarget, latestTransform);
    };

    const handlePointerCancel = () => {
      cleanupDrag();
      selectedNode.style.transform = originalInlineTransform;
      showFor(selectedNode);
    };

    captureTarget.setPointerCapture?.(e.pointerId);
    doc.addEventListener("pointermove", handlePointerMove);
    doc.addEventListener("pointerup", handlePointerUp);
    doc.addEventListener("pointercancel", handlePointerCancel);
  };

  return {
    handlePointerDown,
    hide,
    restore,
    showFor,
  };
}

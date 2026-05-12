import type { CelionEditableElement } from "@/lib/ebook-document";

export type LayoutTarget = {
  pageId: string;
  element: CelionEditableElement;
};

const DRAG_START_THRESHOLD = 3;
const MOVE_HANDLE_SIZE = 18;
const RESIZE_HANDLE_SIZE = 12;
const MIN_RESIZE_SIZE = 24;

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

export function getLayoutTargetElement(doc: Document, element: CelionEditableElement, pageId?: string) {
  if (!element.selector.startsWith("[data-celion-id=")) return null;

  try {
    const scope = pageId
      ? doc.querySelector<HTMLElement>(attributeSelector("data-celion-page", pageId))
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
    onMove: (target: LayoutTarget, transform: string) => void;
    onResize: (target: LayoutTarget, width: string, height: string) => void;
  },
) {
  const moveHandleId = "celion-move-handle";
  const resizeHandleId = "celion-resize-handle";

  const getMoveHandle = () => {
    let handle = doc.getElementById(moveHandleId) as HTMLElement | null;
    if (!handle) {
      handle = doc.createElement("div");
      handle.id = moveHandleId;
      handle.setAttribute("data-celion-editor-chrome", "true");
      handle.setAttribute("aria-hidden", "true");
      Object.assign(handle.style, {
        position: "absolute",
        width: `${MOVE_HANDLE_SIZE}px`,
        height: `${MOVE_HANDLE_SIZE}px`,
        border: "2px solid #ffffff",
        background: "#18181b",
        borderRadius: "999px",
        boxShadow: "0 1px 4px rgba(0, 0, 0, 0.18)",
        boxSizing: "border-box",
        cursor: "grab",
        display: "none",
        zIndex: "2147483647",
      } satisfies Partial<CSSStyleDeclaration>);
      doc.body.appendChild(handle);
    }

    return handle;
  };

  const getResizeHandle = () => {
    let handle = doc.getElementById(resizeHandleId) as HTMLElement | null;
    if (!handle) {
      handle = doc.createElement("div");
      handle.id = resizeHandleId;
      handle.setAttribute("data-celion-editor-chrome", "true");
      handle.setAttribute("aria-hidden", "true");
      Object.assign(handle.style, {
        position: "absolute",
        width: `${RESIZE_HANDLE_SIZE}px`,
        height: `${RESIZE_HANDLE_SIZE}px`,
        border: "2px solid #18181b",
        background: "#ffffff",
        borderRadius: "999px",
        boxSizing: "border-box",
        cursor: "nwse-resize",
        display: "none",
        zIndex: "2147483647",
      } satisfies Partial<CSSStyleDeclaration>);
      doc.body.appendChild(handle);
    }

    return handle;
  };

  const hide = () => {
    const moveHandle = doc.getElementById(moveHandleId) as HTMLElement | null;
    const resizeHandle = doc.getElementById(resizeHandleId) as HTMLElement | null;
    if (moveHandle) moveHandle.style.display = "none";
    if (resizeHandle) resizeHandle.style.display = "none";
  };

  const showFor = (element: HTMLElement) => {
    const moveHandle = getMoveHandle();
    const resizeHandle = getResizeHandle();
    const rect = element.getBoundingClientRect();
    const view = doc.defaultView;
    const scrollX = view?.scrollX ?? 0;
    const scrollY = view?.scrollY ?? 0;

    moveHandle.style.left = `${rect.left + scrollX - MOVE_HANDLE_SIZE / 2}px`;
    moveHandle.style.top = `${rect.top + scrollY - MOVE_HANDLE_SIZE / 2}px`;
    moveHandle.style.display = "block";

    resizeHandle.style.left = `${rect.right + scrollX - RESIZE_HANDLE_SIZE / 2}px`;
    resizeHandle.style.top = `${rect.bottom + scrollY - RESIZE_HANDLE_SIZE / 2}px`;
    resizeHandle.style.display = "block";
  };

  const restore = (target: LayoutTarget | null) => {
    if (!target) {
      hide();
      return;
    }

    const selectedNode = getLayoutTargetElement(doc, target.element, target.pageId);
    const pageEl = selectedNode?.closest<HTMLElement>("[data-celion-page]");
    if (selectedNode && pageEl?.getAttribute("data-celion-page") === target.pageId) {
      showFor(selectedNode);
    } else {
      hide();
    }
  };

  const handlePointerDown = (e: PointerEvent) => {
    const layoutTarget = options.getCurrentTarget();
    if (!layoutTarget) return;

    const selectedNode = getLayoutTargetElement(doc, layoutTarget.element, layoutTarget.pageId);
    const eventTarget = e.target as Node | null;
    if (!selectedNode || !eventTarget) return;

    const pageEl = selectedNode.closest<HTMLElement>("[data-celion-page]");
    if (pageEl?.getAttribute("data-celion-page") !== layoutTarget.pageId) return;

    const resizeHandle = doc.getElementById(resizeHandleId);
    const moveHandle = doc.getElementById(moveHandleId);
    if (resizeHandle?.contains(eventTarget)) {
      e.preventDefault();
      e.stopPropagation();

      const rect = selectedNode.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const originalInlineWidth = selectedNode.style.width;
      const originalInlineHeight = selectedNode.style.height;
      const originalWillChange = selectedNode.style.willChange;
      const originalCursor = selectedNode.style.cursor;
      let latestWidth = "";
      let latestHeight = "";
      let hasResized = false;

      const cleanupResize = () => {
        doc.removeEventListener("pointermove", handleResizeMove);
        doc.removeEventListener("pointerup", handleResizeUp);
        doc.removeEventListener("pointercancel", handleResizeCancel);
        resizeHandle.releasePointerCapture?.(e.pointerId);
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
        latestWidth = formatPixelSize(rect.width + deltaX);
        latestHeight = formatPixelSize(rect.height + deltaY);
        selectedNode.style.willChange = "width, height";
        selectedNode.style.cursor = "nwse-resize";
        selectedNode.style.width = latestWidth;
        selectedNode.style.height = latestHeight;
        showFor(selectedNode);
      };

      const handleResizeUp = (upEvent: PointerEvent) => {
        cleanupResize();
        if (!hasResized || !latestWidth || !latestHeight) return;

        upEvent.preventDefault();
        upEvent.stopPropagation();
        options.onResize(layoutTarget, latestWidth, latestHeight);
      };

      const handleResizeCancel = () => {
        cleanupResize();
        selectedNode.style.width = originalInlineWidth;
        selectedNode.style.height = originalInlineHeight;
        showFor(selectedNode);
      };

      resizeHandle.setPointerCapture?.(e.pointerId);
      doc.addEventListener("pointermove", handleResizeMove);
      doc.addEventListener("pointerup", handleResizeUp);
      doc.addEventListener("pointercancel", handleResizeCancel);
      return;
    }

    const startedFromMoveHandle = Boolean(moveHandle?.contains(eventTarget));
    if (!startedFromMoveHandle && !selectedNode.contains(eventTarget)) return;

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
      options.onMove(layoutTarget, latestTransform);
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

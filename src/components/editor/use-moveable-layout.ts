"use client";

import Moveable from "moveable";

export type { LayoutTarget } from "./editor-layout-chrome";
import type { LayoutTarget } from "./editor-layout-chrome";

type ChromeOptions = {
  getCurrentTarget: () => LayoutTarget | null;
  onTransform: (target: LayoutTarget, transform: string) => void;
  onResize: (target: LayoutTarget, width: string, height: string, transform?: string) => void;
};

export function createMoveableLayoutChrome(doc: Document, opts: ChromeOptions) {
  const moveable = new Moveable(doc.body, {
    target: null,
    container: doc.body,
    draggable: true,
    resizable: true,
    throttleDrag: 0,
    throttleResize: 0,
    origin: false,
    edge: true,
    keepRatio: false,
    // Snap on, visual guides off, near-only.
    snappable: true,
    snapGap: false,
    snapThreshold: 10,
    snapDirections: { left: true, top: true, right: true, bottom: true, center: true, middle: true },
    hideDefaultLines: true,
    isDisplaySnapDigit: false,
  });

  let currentEl: HTMLElement | null = null;

  moveable.on("drag", ({ target, transform }) => {
    const t = opts.getCurrentTarget();
    if (!t) return;
    opts.onTransform(t, transform);
  });

  moveable.on("resize", ({ target, width, height, drag }) => {
    const t = opts.getCurrentTarget();
    if (!t) return;
    opts.onResize(t, `${Math.round(width)}px`, `${Math.round(height)}px`, drag.transform);
  });

  return {
    showFor(element: HTMLElement) {
      currentEl = element;
      // Prevent page scroll while dragging this element.
      element.style.touchAction = "none";

      moveable.target = element;
      moveable.elementGuidelines = Array.from(
        doc.querySelectorAll<HTMLElement>("[data-celion-id]"),
      ).filter((el) => el !== element);
      moveable.updateTarget();
      moveable.forceUpdate();
    },

    hide() {
      if (currentEl) {
        currentEl.style.touchAction = "";
      }
      currentEl = null;
      moveable.target = null;
      moveable.elementGuidelines = [];
      moveable.updateTarget();
    },

    destroy() {
      if (currentEl) {
        currentEl.style.touchAction = "";
      }
      currentEl = null;
      moveable.destroy();
    },
  };
}

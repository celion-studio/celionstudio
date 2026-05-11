type SelectionCleanupTarget = {
  style: {
    outline: string;
    outlineOffset: string;
  };
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
};

type SelectionSnapshot = {
  element: SelectionCleanupTarget;
  selected: string | null;
  hovered: string | null;
  outline: string;
  outlineOffset: string;
};

type EditorChromeCleanupTarget = {
  style: {
    display: string;
  };
};

type EditorChromeSnapshot = {
  element: EditorChromeCleanupTarget;
  display: string;
};

export function clearEditorSelectionForExport(elements: Iterable<SelectionCleanupTarget>) {
  const snapshots: SelectionSnapshot[] = Array.from(elements, (element) => ({
    element,
    selected: element.getAttribute("data-selected"),
    hovered: element.getAttribute("data-celion-hovered"),
    outline: element.style.outline,
    outlineOffset: element.style.outlineOffset,
  }));

  snapshots.forEach(({ element }) => {
    element.removeAttribute("data-selected");
    element.removeAttribute("data-celion-hovered");
    element.style.outline = "none";
    element.style.outlineOffset = "0";
  });

  return () => {
    snapshots.forEach(({ element, selected, hovered, outline, outlineOffset }) => {
      if (selected === null) {
        element.removeAttribute("data-selected");
      } else {
        element.setAttribute("data-selected", selected);
      }
      if (hovered === null) {
        element.removeAttribute("data-celion-hovered");
      } else {
        element.setAttribute("data-celion-hovered", hovered);
      }
      element.style.outline = outline;
      element.style.outlineOffset = outlineOffset;
    });
  };
}

export function hideEditorChromeForExport(elements: Iterable<EditorChromeCleanupTarget>) {
  const snapshots: EditorChromeSnapshot[] = Array.from(elements, (element) => ({
    element,
    display: element.style.display,
  }));

  snapshots.forEach(({ element }) => {
    element.style.display = "none";
  });

  return () => {
    snapshots.forEach(({ element, display }) => {
      element.style.display = display;
    });
  };
}

export function clearEditorSelectionFromDocument(doc: Document) {
  const restoreSelection = clearEditorSelectionForExport(doc.querySelectorAll<HTMLElement>("[data-selected], [data-celion-hovered]"));
  const restoreEditorChrome = hideEditorChromeForExport(doc.querySelectorAll<HTMLElement>("[data-celion-editor-chrome]"));

  return () => {
    restoreSelection();
    restoreEditorChrome();
  };
}

export function stripEditorMetadataFromHtml(html: string) {
  return html
    .replace(/\sdata-celion-id\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\sdata-role\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\sdata-editable\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\sdata-selected\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\sdata-celion-hovered\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\sdata-celion-editor-chrome\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
}

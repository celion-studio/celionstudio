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
  outline: string;
  outlineOffset: string;
};

export function clearBuilderSelectionForExport(elements: Iterable<SelectionCleanupTarget>) {
  const snapshots: SelectionSnapshot[] = Array.from(elements, (element) => ({
    element,
    selected: element.getAttribute("data-selected"),
    outline: element.style.outline,
    outlineOffset: element.style.outlineOffset,
  }));

  snapshots.forEach(({ element }) => {
    element.removeAttribute("data-selected");
    element.style.outline = "none";
    element.style.outlineOffset = "0";
  });

  return () => {
    snapshots.forEach(({ element, selected, outline, outlineOffset }) => {
      if (selected === null) {
        element.removeAttribute("data-selected");
      } else {
        element.setAttribute("data-selected", selected);
      }
      element.style.outline = outline;
      element.style.outlineOffset = outlineOffset;
    });
  };
}

export function clearBuilderSelectionFromDocument(doc: Document) {
  return clearBuilderSelectionForExport(doc.querySelectorAll<HTMLElement>("[data-selected]"));
}

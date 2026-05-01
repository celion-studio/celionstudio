"use client";

import { useCallback, useMemo, useState } from "react";
import type { CelionEditableElement } from "@/lib/ebook-document";
import type { RuntimeTextSelection, SelectedElementState } from "./editor-types";

export function useEditorSelection() {
  const [selectedText, setSelectedText] = useState("");
  const [selectedSelector, setSelectedSelector] = useState("");
  const [selectedElement, setSelectedElement] = useState<CelionEditableElement | null>(null);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [selectedRuntimeText, setSelectedRuntimeText] = useState<RuntimeTextSelection | null>(null);
  const [editValue, setEditValue] = useState("");

  const clearSelection = useCallback(() => {
    setSelectedText("");
    setEditValue("");
    setSelectedSelector("");
    setSelectedElement(null);
    setSelectedPageId("");
    setSelectedRuntimeText(null);
  }, []);

  const selectElement = useCallback((selection: SelectedElementState) => {
    setSelectedText(selection.text);
    setEditValue(selection.text);
    setSelectedPageId(selection.pageId);
    setSelectedElement(selection.element);
    setSelectedSelector(selection.selector);
    setSelectedRuntimeText(selection.runtimeText);
  }, []);

  const inspectorElement = useMemo(() => selectedElement ?? (selectedText
    ? {
        id: "legacy-selected-text",
        role: "text",
        type: "text",
        selector: selectedSelector,
        label: "Selected text",
        editableProps: ["text"],
      } satisfies CelionEditableElement
    : null), [selectedElement, selectedSelector, selectedText]);

  return {
    selectedText,
    selectedSelector,
    selectedElement,
    selectedPageId,
    selectedRuntimeText,
    editValue,
    inspectorElement,
    setEditValue,
    clearSelection,
    selectElement,
  };
}

"use client";

import { useCallback, useMemo, useState } from "react";
import type { CelionEditableElement } from "@/lib/slide-document";
import type { InspectorStyleValues, RuntimeTextSelection, SelectedElementState } from "./editor-types";

export function useEditorSelection() {
  const [selectedText, setSelectedText] = useState("");
  const [selectedSelector, setSelectedSelector] = useState("");
  const [selectedElement, setSelectedElement] = useState<CelionEditableElement | null>(null);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [selectedRuntimeText, setSelectedRuntimeText] = useState<RuntimeTextSelection | null>(null);
  const [styleValues, setStyleValues] = useState<InspectorStyleValues>({});
  const [editValue, setEditValue] = useState("");

  const clearSelection = useCallback(() => {
    setSelectedText("");
    setEditValue("");
    setSelectedSelector("");
    setSelectedElement(null);
    setSelectedPageId("");
    setSelectedRuntimeText(null);
    setStyleValues({});
  }, []);

  const selectElement = useCallback((selection: SelectedElementState) => {
    setSelectedText(selection.text);
    setEditValue(selection.text);
    setSelectedPageId(selection.slideId);
    setSelectedElement(selection.element);
    setSelectedSelector(selection.selector);
    setSelectedRuntimeText(selection.runtimeText);
    setStyleValues(selection.styleValues ?? {});
  }, []);

  const setStyleValue = useCallback((prop: string, value: string) => {
    setStyleValues((current) => ({ ...current, [prop]: value }));
  }, []);

  const commitTextValue = useCallback((value: string) => {
    setSelectedText(value);
    setEditValue(value);
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

  return useMemo(() => ({
    selectedText,
    selectedSelector,
    selectedElement,
    selectedPageId,
    selectedRuntimeText,
    styleValues,
    editValue,
    inspectorElement,
    setEditValue,
    setStyleValue,
    commitTextValue,
    clearSelection,
    selectElement,
  }), [
    clearSelection,
    commitTextValue,
    editValue,
    inspectorElement,
    selectElement,
    selectedElement,
    selectedPageId,
    selectedRuntimeText,
    selectedSelector,
    selectedText,
    setStyleValue,
    styleValues,
  ]);
}

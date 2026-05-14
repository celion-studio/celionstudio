"use client";

import { useCallback, useRef, useState } from "react";
import type { InspectorLayoutValues } from "./editor-types";
import type { LayoutTarget } from "./editor-layout-chrome";

export function useEditorLayoutSelection() {
  const selectedLayoutTargetRef = useRef<LayoutTarget | null>(null);
  const layoutValuesRef = useRef<InspectorLayoutValues | null>(null);
  const [layoutTargetLabel, setLayoutTargetLabel] = useState("");
  const [layoutValues, setLayoutValuesState] = useState<InspectorLayoutValues | null>(null);

  const setLayoutValues = useCallback((values: InspectorLayoutValues | null) => {
    layoutValuesRef.current = values;
    setLayoutValuesState(values);
  }, []);

  const setLayoutTarget = useCallback((target: LayoutTarget | null) => {
    selectedLayoutTargetRef.current = target;
    setLayoutTargetLabel(target?.element.label ?? "");
    if (!target) setLayoutValues(null);
  }, [setLayoutValues]);

  return {
    layoutTargetLabel,
    layoutValues,
    layoutValuesRef,
    selectedLayoutTargetRef,
    setLayoutTarget,
    setLayoutValues,
  };
}

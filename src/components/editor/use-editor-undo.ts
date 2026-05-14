"use client";

import { useCallback, useRef, useState } from "react";
import type { CelionEbookDocument } from "@/lib/ebook-document";

export type UndoSnapshot =
  | { type: "document"; document: CelionEbookDocument }
  | { type: "html"; html: string };

const MAX_UNDO_SNAPSHOTS = 20;

export function useEditorUndo() {
  const undoStackRef = useRef<UndoSnapshot[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  const pushDocumentSnapshot = useCallback((document: CelionEbookDocument | null) => {
    if (!document) return;

    undoStackRef.current = [
      ...undoStackRef.current.slice(-(MAX_UNDO_SNAPSHOTS - 1)),
      { type: "document", document: structuredClone(document) as CelionEbookDocument },
    ];
    setCanUndo(true);
  }, []);

  const pushHtmlSnapshot = useCallback((html: string) => {
    if (!html.trim()) return;

    undoStackRef.current = [
      ...undoStackRef.current.slice(-(MAX_UNDO_SNAPSHOTS - 1)),
      { type: "html", html },
    ];
    setCanUndo(true);
  }, []);

  const popUndoSnapshot = useCallback(() => {
    const snapshot = undoStackRef.current.at(-1);
    if (!snapshot) return null;

    undoStackRef.current = undoStackRef.current.slice(0, -1);
    setCanUndo(undoStackRef.current.length > 0);
    return snapshot;
  }, []);

  const clearUndoStack = useCallback(() => {
    undoStackRef.current = [];
    setCanUndo(false);
  }, []);

  return {
    canUndo,
    clearUndoStack,
    popUndoSnapshot,
    pushDocumentSnapshot,
    pushHtmlSnapshot,
  };
}

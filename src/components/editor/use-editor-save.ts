"use client";

import { useRef, useState } from "react";
import type { CelionEbookDocument } from "@/lib/ebook-document";

type SavePayload = { html: string } | { document: CelionEbookDocument };

export function useEditorSave(projectId: string, initialDocument: CelionEbookDocument | null) {
  const latestDocumentRef = useRef<CelionEbookDocument | null>(initialDocument);
  const documentSaveInFlightRef = useRef(false);
  const pendingDocumentSaveRef = useRef<CelionEbookDocument | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const postEbookSave = async (payload: SavePayload) => {
    const response = await fetch(`/api/ebook/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, ...payload }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({ message: "" })) as { message?: string };
      throw new Error(data.message || "Could not save ebook changes.");
    }
  };

  const saveHtml = async (newHtml: string) => {
    setSaving(true);
    setSaveError("");
    try {
      await postEbookSave({ html: newHtml });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save ebook changes.");
    } finally {
      setSaving(false);
    }
  };

  const saveDocumentInternal = async (newDocument: CelionEbookDocument) => {
    setSaving(true);
    setSaveError("");
    try {
      await postEbookSave({ document: newDocument });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save ebook changes.");
    } finally {
      setSaving(false);
    }
  };

  const queueDocumentSave = async (newDocument: CelionEbookDocument) => {
    latestDocumentRef.current = newDocument;

    if (documentSaveInFlightRef.current) {
      pendingDocumentSaveRef.current = newDocument;
      return;
    }

    documentSaveInFlightRef.current = true;
    let documentToSave: CelionEbookDocument | null = newDocument;

    try {
      while (documentToSave) {
        pendingDocumentSaveRef.current = null;
        await saveDocumentInternal(documentToSave);
        documentToSave = pendingDocumentSaveRef.current;
      }
    } finally {
      documentSaveInFlightRef.current = false;
    }
  };

  return {
    latestDocumentRef,
    saving,
    saveError,
    setSaveError,
    saveHtml,
    queueDocumentSave,
  };
}

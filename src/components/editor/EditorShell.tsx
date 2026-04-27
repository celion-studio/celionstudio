"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { EditorLeftPanel } from "@/components/editor/EditorLeftPanel";
import { DocumentEditorPanel } from "@/components/editor/DocumentEditorPanel";
import { PageFormatControl } from "@/components/editor/PageFormatControl";
import { ActionPanel } from "@/components/editor/ActionPanel";
import {
  docNodeCount,
  normalizeTiptapBookDocument,
  tiptapDocumentToHtml,
  type TiptapBookDocument,
  type TiptapBookLayout,
} from "@/lib/tiptap-document";
import {
  normalizePageFormat,
  normalizePageSize,
  type PageFormat,
  type PageSize,
} from "@/lib/page-format";
import type { ProjectRecord } from "@/types/project";

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

const AUTO_SAVE_DELAY_MS = 1200;

function cloneBookDocument(document: unknown) {
  return JSON.parse(
    JSON.stringify(normalizeTiptapBookDocument(document)),
  ) as TiptapBookDocument;
}

function normalizedDocumentSignature(document: TiptapBookDocument) {
  return JSON.stringify(document);
}

function saveDocumentPayload(document: unknown) {
  return { action: "save-document", document } as const;
}

function apiErrorMessage(payload: { message?: string; note?: string } | null, fallback: string) {
  const message = payload?.message ?? fallback;
  return payload?.note ? `${message} ${payload.note}` : message;
}

export function EditorShell({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [hasLocalDocumentEdits, setHasLocalDocumentEdits] = useState(false);
  const hasLocalDocumentEditsRef = useRef(false);
  const latestDocumentRef = useRef<TiptapBookDocument>(cloneBookDocument([]));
  const savedDocumentSignatureRef = useRef(normalizedDocumentSignature(cloneBookDocument([])));
  const activeSavePromiseRef = useRef<Promise<void> | null>(null);
  const autoSaveTimerRef = useRef<number | null>(null);
  const [saveStatus, setSaveStatusState] = useState<SaveStatus>("idle");
  const saveStatusRef = useRef<SaveStatus>("idle");
  const [feedback, setFeedback] = useState("");
  const [visualPageCount, setVisualPageCount] = useState<number | undefined>();
  const [imageUploadPending, setImageUploadPending] = useState(false);
  const imageUploadPendingRef = useRef(false);
  const [editorLayout, setEditorLayout] = useState<TiptapBookLayout>({
    headerType: "none",
    headerText: "",
    headerAlign: "center",
    footerType: "page",
    footerText: "{page}",
    footerAlign: "center",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFeedback("");
    setLocalDocumentEdits(false);
    setSaveStatus("idle");
    clearAutoSaveTimer();
    setImageUploadPendingState(false);

    fetch(`/api/projects/${projectId}`, { method: "GET", cache: "no-store" })
      .then((r) => r.json())
      .then((payload: { project?: ProjectRecord; message?: string }) => {
        if (!active) return;
        if (payload.project) {
          markDocumentSavedFromProject(payload.project);
          setProject(payload.project);
        }
        else setFeedback(payload.message ?? "Could not load this draft.");
      })
      .catch(() => {
        if (active) setFeedback("Could not load this draft.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      clearAutoSaveTimer();
    };
  }, [projectId]);

  const pageFormat = normalizePageFormat(project?.profile.pageFormat);
  const customPageSize = normalizePageSize(project?.profile.customPageSize);
  const bookDocument = useMemo(() => {
    const sourceDocument = project?.profile.document;
    if (sourceDocument === latestDocumentRef.current) return latestDocumentRef.current;
    return normalizeTiptapBookDocument(sourceDocument ?? []);
  }, [project?.profile.document]);

  const exportHtml = useMemo(() => {
    if (!project) return "";

    return tiptapDocumentToHtml({
      title: project.title,
      document: bookDocument,
      pageFormat: project.profile.pageFormat,
      customPageSize: project.profile.customPageSize,
    });
  }, [bookDocument, project]);
  const hasDraft = bookDocument.pages.some((page) => docNodeCount(page.doc) > 0);
  useEffect(() => {
    setVisualPageCount(undefined);
  }, [projectId, pageFormat, customPageSize.widthMm, customPageSize.heightMm]);

  useEffect(() => {
    latestDocumentRef.current = bookDocument;
  }, [bookDocument]);

  useEffect(() => {
    if (!imageUploadPending && hasLocalDocumentEdits && saveStatus !== "saving") {
      scheduleAutoSave();
    }
  }, [hasLocalDocumentEdits, imageUploadPending, saveStatus]);

  useEffect(() => () => clearAutoSaveTimer(), []);

  useEffect(() => {
    const shouldWarn =
      hasLocalDocumentEdits ||
      saveStatus === "saving" ||
      saveStatus === "error" ||
      imageUploadPending;
    if (!shouldWarn) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasLocalDocumentEdits, imageUploadPending, saveStatus]);

  function setLocalDocumentEdits(value: boolean) {
    hasLocalDocumentEditsRef.current = value;
    setHasLocalDocumentEdits(value);
  }

  function setSaveStatus(value: SaveStatus) {
    saveStatusRef.current = value;
    setSaveStatusState(value);
  }

  const setImageUploadPendingState = useCallback((value: boolean) => {
    imageUploadPendingRef.current = value;
    setImageUploadPending(value);
    if (value) setFeedback("Uploading image. Save will be available when it finishes.");
  }, []);

  function clearAutoSaveTimer() {
    if (autoSaveTimerRef.current === null) return;
    window.clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = null;
  }

  function scheduleAutoSave() {
    clearAutoSaveTimer();
    if (imageUploadPendingRef.current || saveStatusRef.current === "saving") return;

    autoSaveTimerRef.current = window.setTimeout(() => {
      autoSaveTimerRef.current = null;
      requestSaveDocument({ silent: true }).catch((error) => {
        setFeedback(error instanceof Error ? error.message : "Auto-save failed.");
      });
    }, AUTO_SAVE_DELAY_MS);
  }

  function markDocumentSavedFromProject(nextProject: ProjectRecord) {
    const nextDocument = normalizeTiptapBookDocument(nextProject.profile.document ?? []);
    latestDocumentRef.current = nextDocument;
    savedDocumentSignatureRef.current = normalizedDocumentSignature(nextDocument);
  }

  function confirmNavigationWithUnsavedChanges(event: MouseEvent<HTMLAnchorElement>) {
    const shouldWarn =
      hasLocalDocumentEditsRef.current ||
      saveStatusRef.current === "saving" ||
      saveStatusRef.current === "error" ||
      imageUploadPendingRef.current;
    if (!shouldWarn) return;

    if (!window.confirm("You have unsaved editor changes. Leave this page?")) {
      event.preventDefault();
    }
  }

  async function applyMutation(
    body:
      | { action: "generate" | "regenerate" | "mark-exported" }
      | { action: "revise"; revisionPrompt: string },
    successMessage: string,
  ) {
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await res.json().catch(() => null)) as { project?: ProjectRecord; message?: string; note?: string } | null;
    if (!res.ok || !payload?.project) throw new Error(apiErrorMessage(payload, "Could not update this draft."));
    markDocumentSavedFromProject(payload.project);
    setProject(payload.project);
    setLocalDocumentEdits(false);
    setSaveStatus("saved");
    setFeedback(successMessage);
  }

  function setProjectDocument(nextDocument: TiptapBookDocument) {
    setProject((current) =>
      current
        ? {
            ...current,
            profile: {
              ...current.profile,
              document: nextDocument,
            },
          }
        : current,
    );
  }

  function updateLocalDocument(nextDocument: TiptapBookDocument) {
    setProjectDocument(nextDocument);
    latestDocumentRef.current = nextDocument;
    setLocalDocumentEdits(true);
    setSaveStatus("dirty");
    if (saveStatusRef.current === "error") setFeedback("");
    scheduleAutoSave();
  }

  async function requestSaveDocument({ silent = false } = {}) {
    clearAutoSaveTimer();

    while (true) {
      if (imageUploadPendingRef.current) {
        if (!silent) setFeedback("Wait for the image upload to finish before saving.");
        return;
      }

      const activeSave = activeSavePromiseRef.current;
      if (activeSave) {
        await activeSave;
        continue;
      }

      const documentToSave = cloneBookDocument(latestDocumentRef.current);
      const signatureToSave = normalizedDocumentSignature(documentToSave);
      if (signatureToSave === savedDocumentSignatureRef.current) {
        setLocalDocumentEdits(false);
        setSaveStatus("saved");
        if (!silent) setFeedback("All edits saved.");
        return;
      }

      setSaveStatus("saving");
      if (!silent) setFeedback("Saving edits...");

      const savePromise = (async () => {
        const res = await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(saveDocumentPayload(documentToSave)),
        });
        const payload = (await res.json().catch(() => null)) as {
          project?: ProjectRecord;
          message?: string;
          note?: string;
        } | null;

        if (!res.ok || !payload?.project) {
          throw new Error(apiErrorMessage(payload, "Could not save document edits."));
        }

        savedDocumentSignatureRef.current = signatureToSave;
        if (normalizedDocumentSignature(latestDocumentRef.current) === signatureToSave) {
          latestDocumentRef.current = normalizeTiptapBookDocument(payload.project.profile.document ?? []);
          setProject(payload.project);
          setLocalDocumentEdits(false);
          setSaveStatus("saved");
          if (!silent) setFeedback("Document edits saved.");
        } else {
          setLocalDocumentEdits(true);
          setSaveStatus("dirty");
          if (!silent) setFeedback("Saved earlier edits. Saving the latest edits now...");
        }
      })();

      activeSavePromiseRef.current = savePromise;

      try {
        await savePromise;
      } catch (e) {
        setLocalDocumentEdits(true);
        setSaveStatus("error");
        throw e;
      } finally {
        if (activeSavePromiseRef.current === savePromise) {
          activeSavePromiseRef.current = null;
        }
      }
    }
  }

  async function updatePageFormat(nextFormat: PageFormat, nextPageSize: PageSize) {
    if (!project) return;
    const normalizedPageSize = normalizePageSize(nextPageSize);

    const previousProject = project;
    setProject({
      ...project,
      profile: {
        ...project.profile,
        pageFormat: nextFormat,
        customPageSize: normalizedPageSize,
      },
    });
    setFeedback(`Page format set to ${nextFormat}.`);

    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save-page-format",
        pageFormat: nextFormat,
        customPageSize: normalizedPageSize,
      }),
    });
    const payload = (await res.json().catch(() => null)) as {
      project?: ProjectRecord;
      message?: string;
      note?: string;
    } | null;

    if (!res.ok || !payload?.project) {
      setProject(previousProject);
      throw new Error(apiErrorMessage(payload, "Could not save page format."));
    }

    setProject(payload.project);
  }

  async function exportPdf() {
    if (imageUploadPendingRef.current) {
      setFeedback("Wait for the image upload to finish before exporting.");
      return;
    }

    if (!hasDraft) {
      setFeedback("No document to export.");
      return;
    }

    if (hasLocalDocumentEditsRef.current || saveStatusRef.current === "error") {
      try {
        await requestSaveDocument();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Save failed. Export stopped.");
        return;
      }
    }

    const popup = window.open("", "_blank", "noopener,noreferrer");
    if (!popup) {
      setFeedback("Print window was blocked.");
      return;
    }
    popup.document.open();
    popup.document.write(exportHtml);
    popup.document.close();
    popup.focus();
    popup.print();
    try {
      await applyMutation({ action: "mark-exported" }, "Print dialog opened. Save as PDF.");
    } catch {
      setFeedback("Print opened, but export status could not be saved.");
    }
  }

  const saveStatusLabel = imageUploadPending
    ? "Uploading"
    : saveStatus === "saving" || saveStatus === "dirty"
      ? "Saving"
      : saveStatus === "error"
        ? "Save failed"
        : "Saved";

  if (loading) {
    return (
      <main style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "#faf9f5" }}>
        <p style={{ margin: 0, fontSize: "13px", color: "#b8b4aa", fontFamily: "'Geist', sans-serif" }}>
          Loading...
        </p>
      </main>
    );
  }

  if (!project) {
    return (
      <main style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "#faf9f5", padding: "24px" }}>
        <div style={{ maxWidth: "440px", textAlign: "center", background: "#fff", border: "1px solid #ebe7dd", borderRadius: "6px", padding: "40px 32px" }}>
          <p style={{ margin: "0 0 8px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#b8b4aa", fontFamily: "'Geist', sans-serif" }}>
            Not found
          </p>
          <h1 style={{ margin: "0 0 10px", fontSize: "22px", fontWeight: 600, color: "#1a1714", fontFamily: "'Geist', sans-serif", letterSpacing: "-0.02em" }}>
            Draft unavailable
          </h1>
          <p style={{ margin: "0 0 20px", fontSize: "13.5px", lineHeight: 1.6, color: "#8a867e", fontFamily: "'Geist', sans-serif" }}>
            {feedback || "Sign in and try again from your dashboard."}
          </p>
          <Link
            href="/dashboard"
            onClick={confirmNavigationWithUnsavedChanges}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "9px 18px", background: "#1a1714", color: "#fff", borderRadius: "6px", textDecorationLine: "none", fontSize: "13px", fontWeight: 500, fontFamily: "'Geist', sans-serif" }}
          >
            <ArrowLeft size={13} />
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{ display: "flex", flexDirection: "column", height: "100vh", minHeight: "100vh", overflow: "hidden", background: "#faf9f5" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "52px",
          padding: "0 20px",
          borderBottom: "1px solid #e8e4dd",
          background: "#fff",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
          <Link
            href="/dashboard"
            onClick={confirmNavigationWithUnsavedChanges}
            style={{ display: "flex", alignItems: "center", gap: "5px", textDecorationLine: "none", color: "#8a867e", fontSize: "13px", fontFamily: "'Geist', sans-serif" }}
          >
            <ArrowLeft size={14} />
            Dashboard
          </Link>
          <span style={{ color: "#d8d4cc", fontSize: "13px" }}>/</span>
          <span style={{ fontSize: "13px", fontWeight: 500, color: "#1a1714", fontFamily: "'Geist', sans-serif", maxWidth: "360px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {project.title}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              minWidth: "72px",
              color: imageUploadPending || saveStatus === "saving" || saveStatus === "dirty" ? "#8a5f1f" : saveStatus === "error" ? "#9a3b30" : "#8a867e",
              fontFamily: "'Geist', sans-serif",
              fontSize: "11.5px",
              fontWeight: 560,
              textAlign: "right",
            }}
          >
            {saveStatusLabel}
          </span>
          {saveStatus === "error" ? (
            <button
              type="button"
              disabled={imageUploadPending}
              onClick={() => {
                requestSaveDocument().catch((error) => {
                  setFeedback(error instanceof Error ? error.message : "Could not save document edits.");
                });
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: "30px",
                border: "1px solid #ead6d1",
                borderRadius: "4px",
                background: "#fff8f6",
                color: "#9a3b30",
                padding: "0 12px",
                fontFamily: "'Geist', sans-serif",
                fontSize: "12px",
                fontWeight: 550,
                cursor: imageUploadPending ? "not-allowed" : "pointer",
              }}
            >
              Retry save
            </button>
          ) : null}
          <PageFormatControl
            value={pageFormat}
            customPageSize={customPageSize}
            onChange={(nextFormat, nextPageSize) => {
              updatePageFormat(nextFormat, nextPageSize).catch((e) => {
                setFeedback(e instanceof Error ? e.message : "Could not save page format.");
              });
            }}
          />
          <button
            type="button"
            disabled={!hasDraft || imageUploadPending || saveStatus === "saving"}
            onClick={exportPdf}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              height: "30px",
              border: "1px solid #e2ded5",
              borderRadius: "4px",
              background: hasDraft && !imageUploadPending && saveStatus !== "saving" ? "#1a1714" : "#f7f4ee",
              color: hasDraft && !imageUploadPending && saveStatus !== "saving" ? "#fffdf8" : "#b8b0a5",
              padding: "0 12px",
              fontFamily: "'Geist', sans-serif",
              fontSize: "12px",
              fontWeight: 550,
              cursor: hasDraft && !imageUploadPending && saveStatus !== "saving" ? "pointer" : "not-allowed",
            }}
          >
            <Download size={13} strokeWidth={1.9} />
            Export
          </button>
        </div>
      </header>
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "272px minmax(0, 1fr) 320px",
          height: "calc(100vh - 52px)",
          minHeight: "calc(100vh - 52px)",
          overflow: "hidden",
        }}
      >
        <EditorLeftPanel
          document={bookDocument}
          pageFormat={pageFormat}
          customPageSize={customPageSize}
          visualPageCount={visualPageCount}
        />
        <div style={{ display: "flex", minWidth: 0, minHeight: 0, flexDirection: "column" }}>
          <div
            id="editor-toolbar"
            style={{
              height: "42px",
              borderBottom: "1px solid #e8e4dd",
              background: "#fff",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              minWidth: 0,
            }}
          />
          <div style={{ flex: 1, minHeight: 0 }}>
            {feedback && (saveStatus === "error" || imageUploadPending) ? (
              <div
                role={saveStatus === "error" ? "alert" : "status"}
                style={{
                  margin: "10px 14px 0",
                  border: saveStatus === "error" ? "1px solid #ead6d1" : "1px solid #e5dcc7",
                  borderRadius: "6px",
                  background: saveStatus === "error" ? "#fff8f6" : "#fffaf0",
                  color: saveStatus === "error" ? "#9a3b30" : "#765d2f",
                  fontFamily: "'Geist', sans-serif",
                  fontSize: "12px",
                  lineHeight: 1.45,
                  padding: "8px 10px",
                }}
              >
                {feedback}
              </div>
            ) : null}
            <DocumentEditorPanel
              key={project.id}
              title={project.title}
              document={bookDocument}
              pageFormat={pageFormat}
              customPageSize={customPageSize}
              toolbarHostId="editor-toolbar"
              onChange={updateLocalDocument}
              onPageCountChange={setVisualPageCount}
              onLayoutChange={setEditorLayout}
              onImageUploadStateChange={setImageUploadPendingState}
            />
          </div>
        </div>
        <ActionPanel
          layout={editorLayout}
          onLayoutChange={(nextLayout) => {
            setEditorLayout(nextLayout);
            updateLocalDocument({ ...latestDocumentRef.current, layout: nextLayout });
          }}
        />
      </div>
    </main>
  );
}

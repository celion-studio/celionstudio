"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
} from "@/lib/tiptap-document";
import {
  normalizePageFormat,
  normalizePageSize,
  type PageFormat,
  type PageSize,
} from "@/lib/page-format";
import type { ProjectRecord } from "@/types/project";

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

function cloneBookDocument(document: unknown) {
  return JSON.parse(
    JSON.stringify(normalizeTiptapBookDocument(document)),
  ) as TiptapBookDocument;
}

function documentSignature(document: unknown) {
  return JSON.stringify(normalizeTiptapBookDocument(document));
}

function saveDocumentPayload(document: unknown) {
  return { action: "save-document", document } as const;
}

export function EditorShell({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [hasLocalDocumentEdits, setHasLocalDocumentEdits] = useState(false);
  const hasLocalDocumentEditsRef = useRef(false);
  const latestDocumentRef = useRef<TiptapBookDocument>(cloneBookDocument([]));
  const savedDocumentSignatureRef = useRef(documentSignature([]));
  const activeSavePromiseRef = useRef<Promise<void> | null>(null);
  const [saveStatus, setSaveStatusState] = useState<SaveStatus>("idle");
  const saveStatusRef = useRef<SaveStatus>("idle");
  const [undoStack, setUndoStack] = useState<TiptapBookDocument[]>([]);
  const [redoStack, setRedoStack] = useState<TiptapBookDocument[]>([]);
  const [revisionPrompt, setRevisionPrompt] = useState("");
  const [feedback, setFeedback] = useState("");
  const [visualPageCount, setVisualPageCount] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFeedback("");
    setLocalDocumentEdits(false);
    setSaveStatus("idle");
    setUndoStack([]);
    setRedoStack([]);

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
    };
  }, [projectId]);

  const pageFormat = normalizePageFormat(project?.profile.pageFormat);
  const customPageSize = normalizePageSize(project?.profile.customPageSize);
  const bookDocument = useMemo(
    () => normalizeTiptapBookDocument(project?.profile.document ?? []),
    [project?.profile.document],
  );

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
    const shouldWarn =
      hasLocalDocumentEdits ||
      saveStatus === "saving" ||
      saveStatus === "error";
    if (!shouldWarn) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasLocalDocumentEdits, saveStatus]);

  function setLocalDocumentEdits(value: boolean) {
    hasLocalDocumentEditsRef.current = value;
    setHasLocalDocumentEdits(value);
  }

  function setSaveStatus(value: SaveStatus) {
    saveStatusRef.current = value;
    setSaveStatusState(value);
  }

  function markDocumentSavedFromProject(nextProject: ProjectRecord) {
    const nextDocument = normalizeTiptapBookDocument(nextProject.profile.document ?? []);
    latestDocumentRef.current = nextDocument;
    savedDocumentSignatureRef.current = documentSignature(nextDocument);
  }

  function confirmNavigationWithUnsavedChanges(event: MouseEvent<HTMLAnchorElement>) {
    const shouldWarn =
      hasLocalDocumentEditsRef.current ||
      saveStatusRef.current === "saving" ||
      saveStatusRef.current === "error";
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
    const payload = (await res.json().catch(() => null)) as { project?: ProjectRecord; message?: string } | null;
    if (!res.ok || !payload?.project) throw new Error(payload?.message ?? "Could not update this draft.");
    markDocumentSavedFromProject(payload.project);
    setProject(payload.project);
    setLocalDocumentEdits(false);
    setSaveStatus("saved");
    setUndoStack([]);
    setRedoStack([]);
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
    if (!hasLocalDocumentEditsRef.current) {
      setUndoStack((history) => [...history, cloneBookDocument(bookDocument)]);
    }
    setRedoStack([]);
    setProjectDocument(nextDocument);
    latestDocumentRef.current = nextDocument;
    setLocalDocumentEdits(true);
    setSaveStatus("dirty");
    setFeedback("Unsaved edits. Save when ready.");
  }

  function undoDocumentEdit() {
    const previousDocument = undoStack[undoStack.length - 1];
    if (!previousDocument) return;

    setUndoStack((history) => history.slice(0, -1));
    setRedoStack((history) => [...history, cloneBookDocument(bookDocument)]);
    setProjectDocument(previousDocument);
    latestDocumentRef.current = previousDocument;
    setLocalDocumentEdits(true);
    setSaveStatus("dirty");
    setFeedback("Document edit undone.");
  }

  function redoDocumentEdit() {
    const nextDocument = redoStack[redoStack.length - 1];
    if (!nextDocument) return;

    setRedoStack((history) => history.slice(0, -1));
    setUndoStack((history) => [...history, cloneBookDocument(bookDocument)]);
    setProjectDocument(nextDocument);
    latestDocumentRef.current = nextDocument;
    setLocalDocumentEdits(true);
    setSaveStatus("dirty");
    setFeedback("Document edit redone.");
  }

  async function requestSaveDocument() {
    if (activeSavePromiseRef.current) {
      await activeSavePromiseRef.current;
      return;
    }

    const documentToSave = cloneBookDocument(latestDocumentRef.current);
    const signatureToSave = documentSignature(documentToSave);
    if (signatureToSave === savedDocumentSignatureRef.current) {
      setLocalDocumentEdits(false);
      setSaveStatus("saved");
      setFeedback("All edits saved.");
      return;
    }

    setSaveStatus("saving");
    setFeedback("Saving edits...");

    const savePromise = (async () => {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saveDocumentPayload(documentToSave)),
      });
      const payload = (await res.json().catch(() => null)) as {
        project?: ProjectRecord;
        message?: string;
      } | null;

      if (!res.ok || !payload?.project) {
        throw new Error(payload?.message ?? "Could not save document edits.");
      }

      savedDocumentSignatureRef.current = signatureToSave;
      if (documentSignature(latestDocumentRef.current) === signatureToSave) {
        latestDocumentRef.current = normalizeTiptapBookDocument(payload.project.profile.document ?? []);
        setProject(payload.project);
        setLocalDocumentEdits(false);
        setSaveStatus("saved");
        setUndoStack([]);
        setRedoStack([]);
        setFeedback("Document edits saved.");
      } else {
        setLocalDocumentEdits(true);
        setSaveStatus("dirty");
        setFeedback("Saved earlier edits. New edits are still unsaved.");
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
      activeSavePromiseRef.current = null;
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
    } | null;

    if (!res.ok || !payload?.project) {
      setProject(previousProject);
      throw new Error(payload?.message ?? "Could not save page format.");
    }

    setProject(payload.project);
  }

  async function exportPdf() {
    if (!hasDraft) {
      setFeedback("No document to export.");
      return;
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
            disabled={!hasDraft}
            onClick={exportPdf}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              height: "30px",
              border: "1px solid #e2ded5",
              borderRadius: "4px",
              background: hasDraft ? "#1a1714" : "#f7f4ee",
              color: hasDraft ? "#fffdf8" : "#b8b0a5",
              padding: "0 12px",
              fontFamily: "'Geist', sans-serif",
              fontSize: "12px",
              fontWeight: 550,
              cursor: hasDraft ? "pointer" : "not-allowed",
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
          gridTemplateColumns: "260px minmax(0, 1fr) 300px",
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
            <DocumentEditorPanel
              key={project.id}
              title={project.title}
              document={bookDocument}
              pageFormat={pageFormat}
              customPageSize={customPageSize}
              toolbarHostId="editor-toolbar"
              onChange={updateLocalDocument}
              onPageCountChange={setVisualPageCount}
            />
          </div>
        </div>
        <ActionPanel
          hasDraft={hasDraft}
          hasLocalDocumentEdits={hasLocalDocumentEdits}
          saveStatus={saveStatus}
          revisionPrompt={revisionPrompt}
          feedback={feedback}
          canUndoDocumentEdit={undoStack.length > 0}
          canRedoDocumentEdit={redoStack.length > 0}
          onUndoDocumentEdit={undoDocumentEdit}
          onRedoDocumentEdit={redoDocumentEdit}
          onRevisionPromptChange={setRevisionPrompt}
          onRequestSaveDocument={async () => {
            try {
              await requestSaveDocument();
            } catch (e) {
              setFeedback(e instanceof Error ? e.message : "Could not save document edits.");
            }
          }}
          onGenerateFirstDraft={async () => {
            try {
              await applyMutation({ action: "generate" }, "Draft generated.");
            } catch (e) {
              setFeedback(e instanceof Error ? e.message : "Could not generate.");
            }
          }}
          onRegenerateDraft={async () => {
            try {
              await applyMutation({ action: "regenerate" }, "Draft regenerated.");
            } catch (e) {
              setFeedback(e instanceof Error ? e.message : "Could not regenerate.");
            }
          }}
          onReviseDraft={async () => {
            if (!hasDraft) {
              setFeedback("Generate or write a draft first.");
              return;
            }
            try {
              if (hasLocalDocumentEdits) {
                await requestSaveDocument();
              }
              await applyMutation({ action: "revise", revisionPrompt }, "Revision applied.");
              setRevisionPrompt("");
            } catch (e) {
              setFeedback(e instanceof Error ? e.message : "Revision failed.");
            }
          }}
        />
      </div>
    </main>
  );
}

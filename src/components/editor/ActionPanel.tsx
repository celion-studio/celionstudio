"use client";

import {
  Zap,
  RefreshCw,
  MessageSquare,
  Save,
  Redo2,
  Undo2,
} from "lucide-react";

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

type ActionPanelProps = {
  hasDraft: boolean;
  hasLocalDocumentEdits: boolean;
  saveStatus: SaveStatus;
  revisionPrompt: string;
  feedback: string;
  canUndoDocumentEdit: boolean;
  canRedoDocumentEdit: boolean;
  onUndoDocumentEdit: () => void;
  onRedoDocumentEdit: () => void;
  onRevisionPromptChange: (value: string) => void;
  onRequestSaveDocument: () => void;
  onGenerateFirstDraft: () => void;
  onRegenerateDraft: () => void;
  onReviseDraft: () => void;
};

const btnBase: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "7px",
  width: "100%",
  padding: "9px 14px",
  border: "1px solid #ebe7dd",
  borderRadius: "6px",
  background: "#fff",
  fontSize: "13px",
  color: "#1a1714",
  fontFamily: "'Geist', sans-serif",
  cursor: "pointer",
  transition: "border-color 0.12s ease, background 0.12s ease",
  textAlign: "left",
};

const btnPrimary: React.CSSProperties = {
  ...btnBase,
  background: "#1a1714",
  color: "#fff",
  border: "1px solid #1a1714",
  fontWeight: 600,
};

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p
    style={{
      margin: "0 0 10px",
      fontSize: "10px",
      fontWeight: 600,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      color: "#b8b4aa",
      fontFamily: "'Geist', sans-serif",
    }}
  >
    {children}
  </p>
);

function saveStatusLabel(status: SaveStatus) {
  switch (status) {
    case "dirty":
      return "Unsaved";
    case "saving":
      return "Saving...";
    case "saved":
      return "Saved";
    case "error":
      return "Error";
    default:
      return "Ready";
  }
}

function saveStatusColor(status: SaveStatus) {
  switch (status) {
    case "dirty":
      return "#8a5a12";
    case "saving":
      return "#4f46b8";
    case "saved":
      return "#2f6f4e";
    case "error":
      return "#a33a31";
    default:
      return "#8a867e";
  }
}

export function ActionPanel({
  hasDraft,
  hasLocalDocumentEdits,
  saveStatus,
  revisionPrompt,
  feedback,
  canUndoDocumentEdit,
  canRedoDocumentEdit,
  onUndoDocumentEdit,
  onRedoDocumentEdit,
  onRevisionPromptChange,
  onRequestSaveDocument,
  onGenerateFirstDraft,
  onRegenerateDraft,
  onReviseDraft,
}: ActionPanelProps) {
  const showSaveControls = hasDraft || hasLocalDocumentEdits || saveStatus !== "idle";
  const canRequestSave = hasLocalDocumentEdits && saveStatus !== "saving";
  const saveButtonLabel = saveStatus === "saving"
    ? "Saving..."
    : saveStatus === "error"
      ? "Retry save"
      : hasLocalDocumentEdits
        ? "Save edits"
        : "Saved";

  return (
    <aside
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        borderLeft: "1px solid #e8e4dd",
        background: "#ffffff",
        overflowY: "auto",
      }}
    >
      {showSaveControls && (
        <div style={{ padding: "20px 18px", borderBottom: "1px solid #ebe7dd" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "10px" }}>
            <SectionLabel>Save</SectionLabel>
            <span
              style={{
                flexShrink: 0,
                fontSize: "11px",
                lineHeight: 1,
                color: saveStatusColor(saveStatus),
                fontFamily: "'Geist', sans-serif",
                fontWeight: 650,
              }}
            >
              {saveStatusLabel(saveStatus)}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
            <button
              type="button"
              onClick={onUndoDocumentEdit}
              disabled={!canUndoDocumentEdit}
              style={{
                ...btnBase,
                justifyContent: "center",
                opacity: canUndoDocumentEdit ? 1 : 0.4,
                cursor: canUndoDocumentEdit ? "pointer" : "not-allowed",
              }}
            >
              <Undo2 size={14} style={{ color: "#8a867e" }} />
              Undo
            </button>
            <button
              type="button"
              onClick={onRedoDocumentEdit}
              disabled={!canRedoDocumentEdit}
              style={{
                ...btnBase,
                justifyContent: "center",
                opacity: canRedoDocumentEdit ? 1 : 0.4,
                cursor: canRedoDocumentEdit ? "pointer" : "not-allowed",
              }}
            >
              <Redo2 size={14} style={{ color: "#8a867e" }} />
              Redo
            </button>
          </div>
          <button
            type="button"
            onClick={onRequestSaveDocument}
            disabled={!canRequestSave}
            style={{
              ...btnBase,
              opacity: canRequestSave ? 1 : 0.45,
              cursor: canRequestSave ? "pointer" : "not-allowed",
            }}
          >
            <Save size={14} style={{ color: "#8a867e" }} />
            {saveButtonLabel}
          </button>
        </div>
      )}

      {/* Generate */}
      <div style={{ padding: "20px 18px", borderBottom: "1px solid #ebe7dd" }}>
        <SectionLabel>Generate</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <button type="button" onClick={onGenerateFirstDraft} style={btnPrimary}>
            <Zap size={14} />
            Generate draft
          </button>
          <button
            type="button"
            onClick={onRegenerateDraft}
            disabled={!hasDraft}
            style={{ ...btnBase, opacity: hasDraft ? 1 : 0.4, cursor: hasDraft ? "pointer" : "not-allowed" }}
          >
            <RefreshCw size={14} style={{ color: "#8a867e" }} />
            Regenerate full draft
          </button>
        </div>
      </div>

      {/* Revise */}
      <div style={{ padding: "20px 18px", borderBottom: "1px solid #ebe7dd" }}>
        <SectionLabel>Revise with AI</SectionLabel>
        <textarea
          value={revisionPrompt}
          onChange={(e) => onRevisionPromptChange(e.target.value)}
          placeholder="Make the tone sharper, shorten the intro, add more examples..."
          rows={4}
          style={{
            width: "100%",
            borderRadius: "4px",
            border: "1px solid #ebe7dd",
            background: "#faf9f5",
            padding: "10px 12px",
            fontSize: "13px",
            lineHeight: 1.6,
            color: "#1a1714",
            fontFamily: "'Geist', sans-serif",
            outline: "none",
            resize: "none",
            boxSizing: "border-box",
            transition: "border-color 0.12s ease",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#1a1714")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#ebe7dd")}
        />
        <button
          type="button"
          onClick={onReviseDraft}
          disabled={!hasDraft || !revisionPrompt.trim()}
          style={{
            ...btnBase,
            marginTop: "8px",
            opacity: hasDraft && revisionPrompt.trim() ? 1 : 0.4,
            cursor: hasDraft && revisionPrompt.trim() ? "pointer" : "not-allowed",
          }}
        >
          <MessageSquare size={14} style={{ color: "#8a867e" }} />
          Apply revision
        </button>
      </div>

      {/* Feedback toast */}
      {feedback && (
        <div style={{ padding: "16px 18px" }}>
          <p
            style={{
              margin: 0,
              padding: "10px 14px",
              background: "#faf9f5",
              border: "1px solid #ebe7dd",
              borderRadius: "4px",
              fontSize: "12.5px",
              lineHeight: 1.6,
              color: "#4a443d",
              fontFamily: "'Geist', sans-serif",
            }}
          >
            {feedback}
          </p>
        </div>
      )}
    </aside>
  );
}

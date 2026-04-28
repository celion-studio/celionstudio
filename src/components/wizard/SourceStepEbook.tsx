"use client";

type Props = {
  sourceText: string;
  onSourceTextChange: (text: string) => void;
};

export function SourceStepEbook({ sourceText, onSourceTextChange }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <label style={{ display: "block", fontFamily: "'Geist', sans-serif", fontSize: "13px", fontWeight: 500, color: "#1a1714", marginBottom: "8px" }}>
          Paste your source material
        </label>
        <p style={{ fontFamily: "'Geist', sans-serif", fontSize: "12.5px", color: "#8a867e", marginBottom: "10px", lineHeight: 1.5 }}>
          Notes, drafts, research, bullet points — anything you want the AI to turn into a polished ebook. You can leave this empty and the AI will generate content from the title and description alone.
        </p>
        <textarea
          value={sourceText}
          onChange={(e) => onSourceTextChange(e.target.value)}
          placeholder="Paste your notes, outline, or any content here..."
          rows={10}
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: "8px",
            border: "1.5px solid #e1e4e8",
            fontFamily: "'Geist', sans-serif",
            fontSize: "13px",
            color: "#1a1714",
            lineHeight: 1.6,
            resize: "vertical",
            outline: "none",
            transition: "border-color 0.15s ease",
            boxSizing: "border-box",
          }}
          onFocus={(e) => { e.target.style.borderColor = "#1a1714"; }}
          onBlur={(e) => { e.target.style.borderColor = "#e1e4e8"; }}
        />
        <p style={{ marginTop: "6px", fontFamily: "'Geist', sans-serif", fontSize: "12px", color: "#b8b4aa" }}>
          {sourceText.length.toLocaleString()} characters
        </p>
      </div>
    </div>
  );
}

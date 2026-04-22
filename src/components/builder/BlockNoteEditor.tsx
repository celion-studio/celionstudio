"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import type { PartialBlock } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { normalizeBlockNoteDocument } from "@/lib/blocknote-document";
import { getPageFormatSpec, type PageFormat, type PageSize } from "@/lib/page-format";

type BlockNoteEditorProps = {
  title: string;
  blocks: unknown;
  pageFormat: PageFormat;
  customPageSize: PageSize;
  onChange(blocks: PartialBlock[]): void;
};

export function BlockNoteEditor({
  blocks,
  pageFormat,
  customPageSize,
  onChange,
}: BlockNoteEditorProps) {
  const normalizedBlocks = useMemo(() => normalizeBlockNoteDocument(blocks), [blocks]);
  const initialContent = useMemo(
    () => (normalizedBlocks.length > 0 ? normalizedBlocks : undefined),
    [normalizedBlocks],
  );
  const externalDocumentSignature = useMemo(
    () => JSON.stringify(normalizedBlocks),
    [normalizedBlocks],
  );
  const appliedExternalSignatureRef = useRef(externalDocumentSignature);
  const suppressChangeRef = useRef(false);

  const editor = useCreateBlockNote(
    {
      initialContent,
      uploadFile: async (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result ?? ""));
          reader.onerror = () => reject(reader.error ?? new Error("Could not read file."));
          reader.readAsDataURL(file);
        }),
    },
    [],
  );

  useEffect(() => {
    if (appliedExternalSignatureRef.current === externalDocumentSignature) return;

    const nextDocument =
      normalizedBlocks.length > 0
        ? normalizedBlocks
        : ([{ type: "paragraph", content: "" }] as PartialBlock[]);

    suppressChangeRef.current = true;
    editor.replaceBlocks(editor.document, nextDocument);
    appliedExternalSignatureRef.current = externalDocumentSignature;

    const timeout = window.setTimeout(() => {
      suppressChangeRef.current = false;
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [editor, externalDocumentSignature, normalizedBlocks]);
  const page = getPageFormatSpec(pageFormat, customPageSize);
  const previewHeight = Math.round((page.previewWidth * page.heightMm) / page.widthMm);

  return (
    <div
      style={{
        height: "100%",
        overflow: "auto",
        background: "#f2ede4",
        color: "#1d1712",
        padding: "36px 48px 64px",
        boxSizing: "border-box",
      }}
    >
      <div
        className="celion-page-frame"
        style={{
          width: page.previewWidth + "px",
          minWidth: page.previewWidth + "px",
          maxWidth: page.previewWidth + "px",
          height: previewHeight + "px",
          minHeight: previewHeight + "px",
          maxHeight: previewHeight + "px",
          margin: "0 auto",
          padding: page.pagePadding,
          background: "#ffffff",
          boxSizing: "border-box",
          overflow: "hidden",
          boxShadow: "0 18px 48px rgba(31, 22, 14, 0.12)",
        }}
      >
        <div style={{ height: "100%", maxHeight: "100%", overflow: "hidden" }}>
          <BlockNoteView
            editor={editor}
            theme="light"
            onChange={() => {
              if (suppressChangeRef.current) return;
              const nextDocument = editor.document as PartialBlock[];
              appliedExternalSignatureRef.current = JSON.stringify(nextDocument);
              onChange(nextDocument);
            }}
            style={
              {
                "--bn-colors-editor-background": "#ffffff",
                "--bn-colors-menu-background": "#ffffff",
                "--bn-colors-side-menu": "#8a7d6d",
                "--bn-colors-tooltip-background": "#1a1714",
                "--bn-colors-tooltip-text": "#fffdf8",
                height: "100%",
                maxHeight: "100%",
                overflow: "hidden",
                fontFamily: "'Geist', sans-serif",
              } as CSSProperties
            }
          />
          <style>{`
            .celion-page-frame .bn-editor {
              width: 100%;
              max-width: 640px;
              margin-inline: auto;
              padding-inline: 0;
              background: #ffffff;
              border-radius: 0;
            }

            .celion-page-frame .bn-block-content {
              max-width: 100%;
            }
          `}</style>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  compactTiptapBookDocument,
  createEmptyTiptapDoc,
  normalizeTiptapBookDocument,
  type TiptapBookDocument,
  type TiptapBookLayout,
  type TiptapDocJson,
} from "@/lib/tiptap-document";
import { TiptapPageEditor } from "@/components/editor/TiptapPageEditor";
import { getPageFormatSpec, type PageFormat, type PageSize } from "@/lib/page-format";

type TiptapBookEditorProps = {
  title: string;
  document: unknown;
  pageFormat: PageFormat;
  customPageSize: PageSize;
  toolbarHostId?: string;
  onChange(document: TiptapBookDocument): void;
  onPageCountChange?(pageCount: number): void;
  onLayoutChange?(layout: TiptapBookLayout): void;
  onSelectionAiRevise?(input: { selectedText: string; instruction: string }): Promise<string>;
  onImageUploadStateChange?(uploading: boolean): void;
};

const PAGE_GAP_PX = 36;

function flattenBookDoc(book: TiptapBookDocument): TiptapDocJson {
  const content = book.pages.flatMap((page) => page.doc.content ?? []);
  return {
    type: "doc",
    content: content.length > 0 ? content : createEmptyTiptapDoc().content,
  };
}

function createBookDocument(doc: TiptapDocJson, layout: TiptapBookLayout): TiptapBookDocument {
  return compactTiptapBookDocument({
    type: "tiptap-book",
    version: 1,
    layout,
    pages: [{ id: "page-1", doc }],
  });
}

function parsePadding(padding: string) {
  const parts = padding
    .trim()
    .split(/\s+/)
    .map((part) => Number.parseFloat(part))
    .map((value) => (Number.isFinite(value) ? value : 0));

  const [top = 0, right = top, bottom = top, left = right] = parts;
  return { top, right, bottom, left };
}

export function TiptapBookEditor({
  title,
  document,
  pageFormat,
  customPageSize,
  toolbarHostId,
  onChange,
  onPageCountChange,
  onLayoutChange,
  onSelectionAiRevise,
  onImageUploadStateChange,
}: TiptapBookEditorProps) {
  const initialBook = useMemo(
    () => normalizeTiptapBookDocument(document),
    [document],
  );
  const appliedDocumentRef = useRef(document);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [editorDoc, setEditorDoc] = useState<TiptapDocJson>(() => flattenBookDoc(initialBook));
  const editorDocRef = useRef<TiptapDocJson>(editorDoc);
  const [layout, setLayout] = useState<TiptapBookLayout>(() => ({
    headerType: initialBook.layout?.headerType ?? "none",
    headerText: initialBook.layout?.headerText ?? "",
    headerAlign: initialBook.layout?.headerAlign ?? "center",
    footerType: initialBook.layout?.footerType ?? "page",
    footerText: initialBook.layout?.footerText ?? "{page}",
    footerAlign: initialBook.layout?.footerAlign ?? "center",
  }));
  const layoutRef = useRef<TiptapBookLayout>(layout);
  const [pageCount, setPageCount] = useState(1);

  const page = getPageFormatSpec(pageFormat, customPageSize);
  const previewHeight = Math.round((page.previewWidth * page.heightMm) / page.widthMm);
  const padding = parsePadding(page.pagePadding);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    shell.scrollLeft = Math.max(0, (shell.scrollWidth - shell.clientWidth) / 2);
  }, [page.previewWidth, previewHeight]);

  useEffect(() => {
    if (appliedDocumentRef.current === document) return;

    appliedDocumentRef.current = document;
    const nextDoc = flattenBookDoc(initialBook);
    const nextLayout = {
      headerType: initialBook.layout?.headerType ?? "none",
      headerText: initialBook.layout?.headerText ?? "",
      headerAlign: initialBook.layout?.headerAlign ?? "center",
      footerType: initialBook.layout?.footerType ?? "page",
      footerText: initialBook.layout?.footerText ?? "{page}",
      footerAlign: initialBook.layout?.footerAlign ?? "center",
    } satisfies TiptapBookLayout;
    editorDocRef.current = nextDoc;
    layoutRef.current = nextLayout;
    setEditorDoc(nextDoc);
    setLayout(nextLayout);
    setPageCount(1);
    onLayoutChange?.(nextLayout);
  }, [document, initialBook, onLayoutChange]);

  useEffect(() => {
    onPageCountChange?.(pageCount);
  }, [onPageCountChange, pageCount]);

  useEffect(() => {
    onLayoutChange?.(layout);
    // Keep the parent sidebar initialized with the editor's first normalized layout.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onLayoutChange]);

  const commitDocument = useCallback(
    (nextDoc: TiptapDocJson, nextLayout: TiptapBookLayout) => {
      const nextBook = createBookDocument(nextDoc, nextLayout);
      appliedDocumentRef.current = nextBook;
      onChange(nextBook);
    },
    [onChange],
  );

  const updateDoc = useCallback(
    (nextDoc: TiptapDocJson) => {
      editorDocRef.current = nextDoc;
      setEditorDoc(nextDoc);
      commitDocument(nextDoc, layoutRef.current);
    },
    [commitDocument],
  );

  const updateLayout = useCallback(
    (nextLayout: TiptapBookLayout) => {
      layoutRef.current = nextLayout;
      setLayout(nextLayout);
      commitDocument(editorDocRef.current, nextLayout);
      onLayoutChange?.(nextLayout);
    },
    [commitDocument, onLayoutChange],
  );

  const editHeader = useCallback(() => {
    if (layout.headerType !== "custom") return;
    const nextHeader = window.prompt("Header text", layout.headerText ?? "");
    if (nextHeader === null) return;
    updateLayout({ ...layout, headerText: nextHeader });
  }, [layout, updateLayout]);

  const editFooter = useCallback(() => {
    if (layout.footerType !== "custom") return;
    const nextFooter = window.prompt("Footer text. Use {page} and {total}.", layout.footerText ?? "");
    if (nextFooter === null) return;
    updateLayout({ ...layout, footerText: nextFooter });
  }, [layout, updateLayout]);

  const chapterText = useMemo(() => {
    if (layout.headerType !== "chapter") return "";
    for (const page of editorDoc.content ?? []) {
      if (page.type === "heading") return (page.content ?? []).map((n) => n.text ?? "").join("");
    }
    return "";
  }, [layout.headerType, editorDoc]);

  const handlePageCountChange = useCallback((nextPageCount: number) => {
    setPageCount((current) => (current === nextPageCount ? current : nextPageCount));
  }, []);

  const pagination = useMemo(
    () => ({
      enabled: true,
      pageWidthPx: page.previewWidth,
      pageHeightPx: previewHeight,
      pageGapPx: PAGE_GAP_PX,
      paddingTopPx: padding.top,
      paddingRightPx: padding.right,
      paddingBottomPx: padding.bottom,
      paddingLeftPx: padding.left,
      headerHeightPx: page.headerHeightPx,
      footerHeightPx: page.footerHeightPx,
      headerType: layout.headerType ?? "none",
      headerText: layout.headerType === "chapter" ? chapterText : (layout.headerText ?? ""),
      headerAlign: layout.headerAlign ?? "center",
      footerType: layout.footerType ?? "page",
      footerText: layout.footerText ?? "{page}",
      footerAlign: layout.footerAlign ?? "center",
      onEditHeader: editHeader,
      onEditFooter: editFooter,
      onPageCountChange: handlePageCountChange,
    }),
    [
      chapterText,
      editFooter,
      editHeader,
      handlePageCountChange,
      layout.footerAlign,
      layout.footerText,
      layout.footerType,
      layout.headerAlign,
      layout.headerText,
      layout.headerType,
      padding.bottom,
      padding.left,
      padding.right,
      padding.top,
      page.headerHeightPx,
      page.footerHeightPx,
      page.previewWidth,
      previewHeight,
    ],
  );

  return (
    <div
      ref={shellRef}
      className="celion-book-editor-shell"
      style={{
        height: "100%",
        overflow: "auto",
        background: "#f6f7f8",
        color: "#24272c",
        padding: "84px 48px 64px",
        boxSizing: "border-box",
      }}
    >
      <div
        className="celion-book-editor-page"
        style={{
          width: page.previewWidth + "px",
          minHeight: previewHeight + "px",
          marginInline: "auto",
          "--celion-page-width": `${page.previewWidth}px`,
          "--celion-page-height": `${previewHeight}px`,
          "--celion-page-gap": `${PAGE_GAP_PX}px`,
          "--celion-page-padding-top": `${padding.top}px`,
          "--celion-page-padding-right": `${padding.right}px`,
          "--celion-page-padding-bottom": `${padding.bottom}px`,
          "--celion-page-padding-left": `${padding.left}px`,
          "--celion-header-height": `${page.headerHeightPx}px`,
          "--celion-footer-height": `${page.footerHeightPx}px`,
          "--celion-page-count": pageCount,
        } as React.CSSProperties}
      >
        <TiptapPageEditor
          doc={editorDoc}
          toolbarHostId={toolbarHostId}
          showToolbar
          placeholder="Start writing, or generate a draft from the right panel."
          pagination={pagination}
          onChange={updateDoc}
          onSelectionAiRevise={onSelectionAiRevise}
          onImageUploadStateChange={onImageUploadStateChange}
        />
      </div>
      <style>{`
        .celion-book-editor-page {
          position: relative;
        }

        .celion-tiptap-toolbar::-webkit-scrollbar {
          display: none;
        }

        .celion-tiptap-editor {
          position: relative;
          width: 100%;
          min-height: var(--celion-page-height);
          margin-inline: auto;
          color: #2e3035;
        }

        .celion-tiptap-placeholder {
          position: absolute;
          top: calc(var(--celion-page-padding-top) + var(--celion-header-height));
          left: var(--celion-page-padding-left);
          max-width: min(420px, calc(100% - var(--celion-page-padding-left) - var(--celion-page-padding-right)));
          color: #9aa0a8;
          font-family: 'Geist', sans-serif;
          font-size: 16px;
          line-height: 1.52;
          pointer-events: none;
          user-select: none;
          z-index: 3;
        }

        .celion-selection-menu {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px;
          border: 1px solid rgba(36, 39, 44, 0.1);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.98);
          box-shadow: 0 10px 24px rgba(24, 27, 31, 0.1);
          backdrop-filter: blur(8px);
          pointer-events: auto;
          z-index: 1000;
        }

        .celion-selection-menu-ai {
          display: block;
          padding: 0;
          border: 0;
          border-radius: 0;
          background: transparent;
          box-shadow: none;
          backdrop-filter: none;
        }

        .celion-image-menu {
          padding: 6px;
          border-radius: 9px;
          box-shadow: 0 12px 28px rgba(24, 27, 31, 0.12);
        }

        .celion-menu-group {
          display: inline-flex;
          align-items: center;
          gap: 1px;
          padding: 2px;
          border: 1px solid #e4e6e9;
          border-radius: 7px;
          background: #f6f7f8;
        }

        .celion-tiptap-content {
          min-height: calc(
            (var(--celion-page-height) + var(--celion-page-gap)) * var(--celion-page-count, 1)
            - var(--celion-page-gap)
          );
          padding:
            calc(var(--celion-page-padding-top) + var(--celion-header-height))
            var(--celion-page-padding-right)
            calc(var(--celion-page-padding-bottom) + var(--celion-footer-height))
            var(--celion-page-padding-left);
          background: #ffffff;
          box-sizing: border-box;
          color: #2e3035;
          font-family: 'Geist', sans-serif;
          font-size: 16px;
          line-height: 1.52;
          outline: none;
          white-space: pre-wrap;
        }

        .celion-with-pagination {
          position: relative;
          overflow: visible;
        }

        .celion-pagination-first-page {
          position: absolute;
          inset: 0 0 auto;
          height: var(--celion-page-height);
          pointer-events: none;
          z-index: 2;
          border: 1px solid rgba(44, 50, 58, 0.2);
          box-shadow: 0 18px 38px rgba(24, 27, 31, 0.06);
          box-sizing: border-box;
        }

        .celion-pagination-header,
        .celion-pagination-footer {
          position: absolute;
          left: var(--celion-page-padding-left);
          right: var(--celion-page-padding-right);
          border: 0;
          background: transparent;
          font-family: 'Geist', sans-serif;
          text-align: center;
          pointer-events: auto;
          cursor: text;
        }

        .celion-pagination-header {
          top: 14px;
          height: 24px;
          color: #b6bbc2;
          font-size: 10px;
          font-weight: 650;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .celion-pagination-footer {
          top: calc(var(--celion-page-height) - var(--celion-page-padding-bottom) - 28px);
          height: 28px;
          color: #858b93;
          font-size: 12px;
        }

        .celion-pagination-header.celion-align-left,
        .celion-pagination-footer.celion-align-left {
          text-align: left;
        }

        .celion-pagination-header.celion-align-center,
        .celion-pagination-footer.celion-align-center {
          text-align: center;
        }

        .celion-pagination-header.celion-align-right,
        .celion-pagination-footer.celion-align-right {
          text-align: right;
        }

        .celion-pagination-break {
          position: relative;
          display: block;
          margin-left: calc(-1 * var(--celion-page-padding-left));
          margin-right: calc(-1 * var(--celion-page-padding-right));
          background: transparent;
          pointer-events: none;
          overflow: visible;
        }

        .celion-pagination-break::before {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          top: var(--celion-break-gap-top);
          height: var(--celion-page-gap);
          background: #f6f7f8;
          z-index: 0;
        }

        .celion-pagination-break::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          top: calc(var(--celion-break-gap-top) + var(--celion-page-gap));
          height: var(--celion-page-height);
          border: 1px solid rgba(44, 50, 58, 0.2);
          box-shadow: 0 18px 38px rgba(24, 27, 31, 0.06);
          box-sizing: border-box;
          pointer-events: none;
          z-index: 0;
        }

        .celion-pagination-break-header,
        .celion-pagination-break-next-footer {
          z-index: 1;
        }

        .celion-pagination-break-header {
          top: var(--celion-break-header-top);
        }

        .celion-pagination-break-next-footer {
          top: var(--celion-break-next-footer-top);
        }

        .celion-br-decoration,
        .celion-with-pagination *:has(> br.ProseMirror-trailingBreak:only-child) {
          display: table;
          width: 100%;
        }

        .celion-tiptap-content p:has(> br.ProseMirror-trailingBreak:only-child) {
          min-height: 1.52em;
        }

        .celion-tiptap-content p,
        .celion-tiptap-content blockquote {
          margin: 0 0 12px;
        }

        .celion-tiptap-content h1,
        .celion-tiptap-content h2,
        .celion-tiptap-content h3,
        .celion-tiptap-content h4,
        .celion-tiptap-content h5,
        .celion-tiptap-content h6 {
          color: #2c3036;
          font-weight: 760;
          letter-spacing: 0;
          line-height: 1.12;
          margin: 0 0 12px;
        }

        .celion-tiptap-content h1 { font-size: 40px; }
        .celion-tiptap-content h2 { font-size: 30px; }
        .celion-tiptap-content h3 { font-size: 24px; }

        .celion-tiptap-content ul,
        .celion-tiptap-content ol {
          margin: 0 0 12px 24px;
          padding: 0;
        }

        .celion-tiptap-content li {
          margin: 0 0 6px;
          padding-left: 2px;
        }

        .celion-tiptap-content blockquote {
          border-left: 3px solid #c5cad1;
          color: #4b515a;
          padding-left: 14px;
        }

        .celion-tiptap-content hr {
          border: 0;
          border-top: 1px solid #e1e4e8;
          margin: 24px 0;
        }

        .celion-tiptap-content img {
          display: block;
          max-width: 100%;
          height: auto;
          margin: 18px auto;
          border-radius: 4px;
        }

        .celion-tiptap-content img[data-fit='crop'] {
          object-fit: cover;
        }

        .celion-tiptap-content img[data-align='left'] {
          margin-left: 0;
          margin-right: auto;
        }

        .celion-tiptap-content img[data-align='center'] {
          margin-left: auto;
          margin-right: auto;
        }

        .celion-tiptap-content img[data-align='right'] {
          margin-left: auto;
          margin-right: 0;
        }

        .celion-tiptap-content img[data-align='full'] {
          width: 100%;
        }

        .celion-tiptap-content [data-resize-container][data-node='image'] {
          width: 100%;
          justify-content: center;
          margin: 18px 0;
          max-width: 100%;
        }

        .celion-tiptap-content [data-resize-container][data-node='image'] [data-resize-wrapper] {
          max-width: 100%;
        }

        .celion-tiptap-content [data-resize-container][data-node='image']:has(img[data-align='left']) {
          justify-content: flex-start;
        }

        .celion-tiptap-content [data-resize-container][data-node='image']:has(img[data-align='right']) {
          justify-content: flex-end;
        }

        .celion-tiptap-content [data-resize-container][data-node='image']:has(img[data-align='full']) {
          width: 100%;
        }

        .celion-tiptap-content [data-resize-container][data-node='image']:has(img[data-align='full']) [data-resize-wrapper],
        .celion-tiptap-content [data-resize-container][data-node='image']:has(img[data-align='full']) img {
          width: 100% !important;
        }

        .celion-tiptap-content [data-resize-container][data-node='image'] img {
          margin: 0;
        }

        .celion-tiptap-content .ProseMirror-selectednode,
        .celion-tiptap-content [data-resize-container][data-resize-state='true'] img {
          outline: 2px solid rgba(91, 62, 235, 0.42);
          outline-offset: 3px;
        }

        .celion-tiptap-content [data-resize-handle] {
          width: 8px;
          border: 1px solid rgba(255, 255, 255, 0.92);
          border-radius: 999px;
          background: rgba(91, 62, 235, 0.88);
          box-shadow: 0 2px 8px rgba(24, 27, 31, 0.18);
          z-index: 2;
          cursor: ew-resize;
          opacity: 0;
          transition: opacity 120ms ease, transform 120ms ease;
        }

        .celion-tiptap-content [data-resize-wrapper]:hover [data-resize-handle],
        .celion-tiptap-content .ProseMirror-selectednode [data-resize-handle],
        .celion-tiptap-content [data-resize-container][data-resize-state='true'] [data-resize-handle] {
          opacity: 1;
        }

        .celion-tiptap-content [data-resize-handle='left'] {
          left: -5px !important;
          top: 22% !important;
          bottom: 22% !important;
        }

        .celion-tiptap-content [data-resize-handle='right'] {
          right: -5px !important;
          top: 22% !important;
          bottom: 22% !important;
        }

        .celion-tiptap-content img[data-align='full'] ~ [data-resize-handle],
        .celion-tiptap-content [data-resize-container][data-node='image']:has(img[data-align='full']) [data-resize-handle] {
          display: none;
        }

        .celion-media-text {
          --media-image-width: 44%;
          display: grid;
          grid-template-columns: minmax(140px, var(--media-image-width)) minmax(0, 1fr);
          align-items: start;
          gap: 18px;
          margin: 20px 0;
          padding: 10px;
          border: 1px solid #e4e6e9;
          border-radius: 8px;
          background: #fafbfc;
          position: relative;
        }

        .celion-media-text[data-image-side='right'] {
          grid-template-columns: minmax(0, 1fr) minmax(140px, var(--media-image-width));
        }

        .celion-media-text[data-image-side='right'] [data-media-figure] {
          grid-column: 2;
          grid-row: 1;
        }

        .celion-media-text[data-image-side='right'] [data-media-text-content] {
          grid-column: 1;
          grid-row: 1;
        }

        .celion-media-text [data-media-figure] {
          margin: 0;
          min-width: 0;
        }

        .celion-media-text [data-media-figure] img {
          width: 100%;
          max-width: 100%;
          margin: 0;
          border-radius: 5px;
        }

        .celion-media-text-copy {
          min-width: 0;
        }

        .celion-media-text-copy > :last-child {
          margin-bottom: 0;
        }

        .celion-media-text-resize-handle {
          position: absolute;
          top: 16px;
          bottom: 16px;
          left: calc(var(--media-image-width) + 10px);
          width: 8px;
          border-radius: 999px;
          background: rgba(91, 62, 235, 0.82);
          box-shadow: 0 2px 8px rgba(24, 27, 31, 0.16);
          cursor: ew-resize;
          opacity: 0;
          transform: translateX(-50%);
          transition: opacity 120ms ease;
          z-index: 2;
        }

        .celion-media-text[data-image-side='right'] .celion-media-text-resize-handle {
          left: auto;
          right: calc(var(--media-image-width) + 10px);
          transform: translateX(50%);
        }

        .celion-media-text:hover .celion-media-text-resize-handle,
        .celion-media-text.ProseMirror-selectednode .celion-media-text-resize-handle {
          opacity: 1;
        }

        @media (max-width: 760px) {
          .celion-media-text,
          .celion-media-text[data-image-side='right'] {
            display: block;
          }

          .celion-media-text-resize-handle {
            display: none;
          }
        }

        .celion-tiptap-content ul[data-type='taskList'] {
          list-style: none;
          margin-left: 0;
        }

        .celion-tiptap-content li[data-type='taskItem'] {
          display: flex;
          gap: 8px;
        }

        .celion-tiptap-content li[data-type='taskItem'] > label {
          flex: 0 0 auto;
        }
      `}</style>
    </div>
  );
}

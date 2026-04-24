"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  compactTiptapBookDocument,
  createEmptyTiptapDoc,
  normalizeTiptapBookDocument,
  type TiptapBookDocument,
  type TiptapBookPage,
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
};

function createLayoutPassKey(signature: string, pageFormat: PageFormat, customPageSize: PageSize) {
  return `${signature}:${pageFormat}:${customPageSize.widthMm}x${customPageSize.heightMm}`;
}

function resetPageSurfaceScroll(surface: HTMLElement | null | undefined) {
  if (!surface) return;

  surface.scrollTop = 0;
  surface.scrollLeft = 0;
  surface.querySelectorAll<HTMLElement>(".ProseMirror, [contenteditable='true']").forEach((node) => {
    node.scrollTop = 0;
    node.scrollLeft = 0;
  });
}

function pageContentBottom(surface: HTMLElement) {
  const blockNodes = Array.from(
    surface.querySelectorAll<HTMLElement>(
      ".celion-tiptap-content > *, .celion-tiptap-content li",
    ),
  );
  const proseMirror = surface.querySelector<HTMLElement>(".celion-tiptap-content");
  const rangeBottoms: number[] = [];
  if (proseMirror) {
    const range = document.createRange();
    range.selectNodeContents(proseMirror);
    for (const rect of Array.from(range.getClientRects())) {
      if (rect.height > 0) rangeBottoms.push(rect.bottom);
    }
    range.detach();
  }

  if (blockNodes.length > 0 || rangeBottoms.length > 0) {
    return Math.max(
      ...rangeBottoms,
      ...blockNodes.map((node) => {
        const rect = node.getBoundingClientRect();
        const style = window.getComputedStyle(node);
        const marginBottom = Number.parseFloat(style.marginBottom) || 0;
        return rect.bottom + marginBottom;
      }),
    );
  }

  const content = surface.querySelector<HTMLElement>(".ProseMirror");
  return content?.getBoundingClientRect().bottom ?? surface.getBoundingClientRect().top;
}

function pageOverflowAmount(surface: HTMLElement) {
  return pageContentBottom(surface) - surface.getBoundingClientRect().bottom;
}

function replacePageDoc(pages: TiptapBookPage[], pageId: string, doc: TiptapDocJson) {
  if (!pages.some((page) => page.id === pageId)) return null;
  return pages.map((page) => (page.id === pageId ? { ...page, doc } : page));
}

function moveOverflowNodeForward(pages: TiptapBookPage[], pageId: string) {
  const pageIndex = pages.findIndex((page) => page.id === pageId);
  if (pageIndex < 0) return null;

  const nextPages = pages.map((page) => ({
    ...page,
    doc: { ...page.doc, content: [...(page.doc.content ?? [])] },
  }));
  const page = nextPages[pageIndex];
  if (!page) return null;

  const movedNode = page.doc.content?.pop();
  if (!movedNode) return null;

  if (!page.doc.content || page.doc.content.length === 0) {
    page.doc.content = createEmptyTiptapDoc().content ?? [];
  }

  if (nextPages[pageIndex + 1]) {
    const nextDoc = nextPages[pageIndex + 1]!.doc;
    nextDoc.content = [movedNode, ...(nextDoc.content ?? [])];
  } else {
    nextPages.push({
      id: `page-${nextPages.length + 1}`,
      doc: { type: "doc", content: [movedNode] },
    });
  }

  return nextPages;
}

export function TiptapBookEditor({
  document,
  pageFormat,
  customPageSize,
  toolbarHostId,
  onChange,
  onPageCountChange,
}: TiptapBookEditorProps) {
  const initialBook = useMemo(
    () => normalizeTiptapBookDocument(document),
    [document],
  );
  const externalSignature = useMemo(() => JSON.stringify(initialBook), [initialBook]);
  const appliedExternalSignatureRef = useRef(externalSignature);
  const pageBodyRefs = useRef(new Map<string, HTMLDivElement>());
  const overflowFrameRefs = useRef(new Map<string, number>());
  const pagesRef = useRef<TiptapBookPage[]>(initialBook.pages);
  const layoutPassKeyRef = useRef("");
  const internalLayoutPassKeyRef = useRef("");
  const [book, setBook] = useState<TiptapBookDocument>(initialBook);
  const [activeToolbarPageId, setActiveToolbarPageId] = useState<string | null>(
    initialBook.pages[0]?.id ?? null,
  );
  const [oversizedPageIds, setOversizedPageIds] = useState(() => new Set<string>());

  const page = getPageFormatSpec(pageFormat, customPageSize);
  const previewHeight = Math.round((page.previewWidth * page.heightMm) / page.widthMm);
  const layoutPassKey = createLayoutPassKey(externalSignature, pageFormat, customPageSize);

  useEffect(() => {
    pagesRef.current = book.pages;
    onPageCountChange?.(book.pages.length);
    setActiveToolbarPageId((current) => {
      if (current && book.pages.some((bookPage) => bookPage.id === current)) return current;
      return book.pages[0]?.id ?? null;
    });
  }, [book.pages, onPageCountChange]);

  useEffect(() => {
    if (appliedExternalSignatureRef.current === externalSignature) return;

    appliedExternalSignatureRef.current = externalSignature;
    pagesRef.current = initialBook.pages;
    setOversizedPageIds(new Set());
    setBook(initialBook);
  }, [externalSignature, initialBook]);

  useLayoutEffect(() => {
    for (const body of pageBodyRefs.current.values()) {
      resetPageSurfaceScroll(body);
    }
  }, [book.pages]);

  const commitPages = useCallback(
    (pages: TiptapBookPage[]) => {
      const nextBook = compactTiptapBookDocument({
        type: "tiptap-book",
        version: 1,
        pages,
      });
      const nextSignature = JSON.stringify(nextBook);
      if (appliedExternalSignatureRef.current === nextSignature) return false;

      internalLayoutPassKeyRef.current = createLayoutPassKey(nextSignature, pageFormat, customPageSize);
      appliedExternalSignatureRef.current = nextSignature;
      pagesRef.current = nextBook.pages;
      setBook(nextBook);
      onChange(nextBook);
      return true;
    },
    [customPageSize, onChange, pageFormat],
  );

  const clearOversizedPage = useCallback((pageId: string) => {
    setOversizedPageIds((current) => {
      if (!current.has(pageId)) return current;
      const next = new Set(current);
      next.delete(pageId);
      return next;
    });
  }, []);

  const markOversizedPage = useCallback((pageId: string) => {
    setOversizedPageIds((current) => {
      if (current.has(pageId)) return current;
      const next = new Set(current);
      next.add(pageId);
      return next;
    });
  }, []);

  const requestOverflowCheck = useCallback(
    (pageId: string) => {
      const pendingFrame = overflowFrameRefs.current.get(pageId);
      if (pendingFrame !== undefined) {
        window.cancelAnimationFrame(pendingFrame);
      }

      const frame = window.requestAnimationFrame(() => {
        overflowFrameRefs.current.delete(pageId);
        const body = pageBodyRefs.current.get(pageId);
        const pageIndex = pagesRef.current.findIndex((bookPage) => bookPage.id === pageId);
        resetPageSurfaceScroll(body);
        if (!body || pageIndex < 0 || pageOverflowAmount(body) <= 8) return;

        const pages = moveOverflowNodeForward(pagesRef.current, pageId);
        if (!pages) {
          markOversizedPage(pageId);
          return;
        }

        clearOversizedPage(pageId);
        if (!commitPages(pages)) return;

        window.setTimeout(() => {
          requestOverflowCheck(pageId);
          const nextPageId = pages[pageIndex + 1]?.id;
          if (nextPageId) requestOverflowCheck(nextPageId);
        }, 0);
      });

      overflowFrameRefs.current.set(pageId, frame);
    },
    [clearOversizedPage, commitPages, markOversizedPage],
  );

  useEffect(
    () => () => {
      for (const frame of overflowFrameRefs.current.values()) {
        window.cancelAnimationFrame(frame);
      }
      overflowFrameRefs.current.clear();
    },
    [],
  );

  const updatePageDoc = useCallback(
    (pageId: string, nextDoc: TiptapDocJson) => {
      const pages = replacePageDoc(pagesRef.current, pageId, nextDoc);
      if (!pages) return;

      clearOversizedPage(pageId);
      commitPages(pages);
      requestOverflowCheck(pageId);
    },
    [clearOversizedPage, commitPages, requestOverflowCheck],
  );

  useEffect(() => {
    if (layoutPassKeyRef.current === layoutPassKey) return;
    layoutPassKeyRef.current = layoutPassKey;
    if (internalLayoutPassKeyRef.current === layoutPassKey) return;

    const runChecks = () => {
      for (const page of pagesRef.current) {
        requestOverflowCheck(page.id);
      }
    };
    const timeouts = [
      window.setTimeout(runChecks, 0),
      window.setTimeout(runChecks, 80),
      window.setTimeout(runChecks, 240),
    ];

    return () => {
      for (const timeout of timeouts) window.clearTimeout(timeout);
    };
  }, [layoutPassKey, requestOverflowCheck]);

  const toolbarPageId = activeToolbarPageId ?? book.pages[0]?.id ?? null;

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
      <div style={{ display: "flex", flexDirection: "column", gap: "30px", alignItems: "center" }}>
        {book.pages.map((bookPage, index) => (
          <section
            key={bookPage.id}
            style={{ position: "relative", width: page.previewWidth + "px" }}
          >
            <div
              style={{
                height: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                margin: "0 0 0",
                color: "#9b9185",
                fontFamily: "'Geist', sans-serif",
                fontSize: "11px",
                fontWeight: 650,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Page {index + 1}
            </div>
            <div
              className={`celion-page-frame${oversizedPageIds.has(bookPage.id) ? " is-oversized" : ""}`}
              style={{
                width: page.previewWidth + "px",
                minWidth: page.previewWidth + "px",
                maxWidth: page.previewWidth + "px",
                height: oversizedPageIds.has(bookPage.id) ? "auto" : previewHeight + "px",
                minHeight: previewHeight + "px",
                maxHeight: oversizedPageIds.has(bookPage.id) ? undefined : previewHeight + "px",
                padding: page.pagePadding,
                background: "#ffffff",
                boxSizing: "border-box",
                overflow: oversizedPageIds.has(bookPage.id) ? "visible" : "clip",
                border: "1px solid #ece7df",
                borderRadius: "6px",
                boxShadow: "0 1px 2px rgba(31, 22, 14, 0.04)",
              }}
            >
              <div
                ref={(node) => {
                  if (node) {
                    pageBodyRefs.current.set(bookPage.id, node);
                    resetPageSurfaceScroll(node);
                  }
                  else pageBodyRefs.current.delete(bookPage.id);
                }}
                style={{
                  height: oversizedPageIds.has(bookPage.id) ? "auto" : "100%",
                  minHeight: "100%",
                  maxHeight: oversizedPageIds.has(bookPage.id) ? undefined : "100%",
                  overflow: oversizedPageIds.has(bookPage.id) ? "visible" : "clip",
                }}
              >
                <TiptapPageEditor
                  doc={bookPage.doc}
                  toolbarHostId={toolbarHostId}
                  showToolbar={bookPage.id === toolbarPageId}
                  placeholder={index === 0 ? "Start writing, or generate a draft from the right panel." : undefined}
                  onFocus={() => setActiveToolbarPageId(bookPage.id)}
                  onChange={(nextDoc) => updatePageDoc(bookPage.id, nextDoc)}
                />
              </div>
            </div>
          </section>
        ))}
      </div>
      <style>{`
        .celion-tiptap-editor {
          position: relative;
          width: 100%;
          max-width: 640px;
          min-height: 100%;
          margin-inline: auto;
          background: #ffffff;
        }

        .celion-tiptap-placeholder {
          position: absolute;
          top: 0;
          left: 0;
          max-width: 420px;
          color: #aaa39a;
          font-family: 'Geist', sans-serif;
          font-size: 16px;
          line-height: 1.52;
          pointer-events: none;
          user-select: none;
        }

        .celion-selection-menu {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px;
          border: 1px solid rgba(36, 28, 20, 0.1);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.98);
          box-shadow: 0 10px 24px rgba(31, 22, 14, 0.12);
          backdrop-filter: blur(8px);
          pointer-events: auto;
          z-index: 1000;
        }

        .celion-image-menu {
          padding: 6px;
          border-radius: 9px;
          box-shadow: 0 12px 28px rgba(31, 22, 14, 0.14);
        }

        .celion-menu-group {
          display: inline-flex;
          align-items: center;
          gap: 1px;
          padding: 2px;
          border: 1px solid #eee8df;
          border-radius: 7px;
          background: #faf8f5;
        }

        .celion-tiptap-content {
          color: #2e3035;
          font-family: 'Geist', sans-serif;
          font-size: 16px;
          line-height: 1.52;
        }

        .celion-tiptap-content {
          min-height: 100%;
          outline: none;
          white-space: pre-wrap;
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
          border-left: 3px solid #d5c2a8;
          color: #5b5248;
          padding-left: 14px;
        }

        .celion-tiptap-content hr {
          border: 0;
          border-top: 1px solid #e1d8ca;
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
          box-shadow: 0 2px 8px rgba(31, 22, 14, 0.22);
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
          border: 1px solid #eee8df;
          border-radius: 8px;
          background: #fffdf9;
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
          box-shadow: 0 2px 8px rgba(31, 22, 14, 0.2);
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

        .celion-page-frame,
        .celion-page-frame .ProseMirror {
          overflow: clip;
        }

        .celion-page-frame.is-oversized,
        .celion-page-frame.is-oversized .ProseMirror {
          overflow: visible;
        }
      `}</style>
    </div>
  );
}

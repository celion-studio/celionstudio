import type { JSONContent } from "@tiptap/core";
import {
  getPageCssSize,
  getPageFormatSpec,
  type PageFormat,
  type PageSize,
} from "@/lib/page-format";
import type { LegacyBlock } from "@/types/legacy-block";

export type TiptapDocJson = JSONContent & { type: "doc" };

export type TiptapBookPage = {
  id: string;
  doc: TiptapDocJson;
};

export type TiptapBookLayout = {
  headerType?: "none" | "chapter" | "custom";
  headerText?: string;
  headerAlign?: "left" | "center" | "right";
  footerType?: "none" | "page" | "custom";
  footerText?: string;
  footerAlign?: "left" | "center" | "right";
};

export type TiptapBookDocument = {
  type: "tiptap-book";
  version: 1;
  layout?: TiptapBookLayout;
  pages: TiptapBookPage[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pageId(index: number) {
  return `page-${index + 1}`;
}

function normalizeBookLayout(value: unknown): TiptapBookLayout | undefined {
  if (!isRecord(value)) return undefined;
  const layout: TiptapBookLayout = {};
  const headerTypes = ["none", "chapter", "custom"] as const;
  const footerTypes = ["none", "page", "custom"] as const;
  const aligns = ["left", "center", "right"] as const;
  if (headerTypes.includes(value.headerType as typeof headerTypes[number])) layout.headerType = value.headerType as TiptapBookLayout["headerType"];
  if (typeof value.headerText === "string") layout.headerText = value.headerText;
  if (aligns.includes(value.headerAlign as typeof aligns[number])) layout.headerAlign = value.headerAlign as TiptapBookLayout["headerAlign"];
  if (footerTypes.includes(value.footerType as typeof footerTypes[number])) layout.footerType = value.footerType as TiptapBookLayout["footerType"];
  if (typeof value.footerText === "string") layout.footerText = value.footerText;
  if (aligns.includes(value.footerAlign as typeof aligns[number])) layout.footerAlign = value.footerAlign as TiptapBookLayout["footerAlign"];
  return Object.keys(layout).length > 0 ? layout : undefined;
}

export function createEmptyTiptapDoc(): TiptapDocJson {
  return { type: "doc", content: [{ type: "paragraph", attrs: { id: null } }] };
}

function blockId(block: LegacyBlock) {
  return typeof block.id === "string" ? block.id : null;
}

function inlineText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .map((item) => {
      if (typeof item === "string") return item;
      if (isRecord(item) && typeof item.text === "string") return item.text;
      if (isRecord(item) && Array.isArray(item.content)) return inlineText(item.content);
      return "";
    })
    .join("");
}

function textMarksFromStyles(styles: unknown): JSONContent["marks"] {
  if (!isRecord(styles)) return undefined;
  const marks: JSONContent["marks"] = [];
  if (styles.bold) marks.push({ type: "bold" });
  if (styles.italic) marks.push({ type: "italic" });
  if (styles.underline) marks.push({ type: "underline" });
  if (styles.strike) marks.push({ type: "strike" });
  if (styles.code) marks.push({ type: "code" });
  return marks.length > 0 ? marks : undefined;
}

function inlineContentNodes(content: unknown): JSONContent[] | undefined {
  if (typeof content === "string") return content ? [{ type: "text", text: content }] : undefined;
  if (!Array.isArray(content)) return undefined;

  const nodes = content
    .map((item): JSONContent | null => {
      if (typeof item === "string") return item ? { type: "text", text: item } : null;
      if (!isRecord(item) || typeof item.text !== "string" || item.text.length === 0) return null;
      return {
        type: "text",
        text: item.text,
        marks: textMarksFromStyles(item.styles),
      };
    })
    .filter((node): node is JSONContent => Boolean(node));

  return nodes.length > 0 ? nodes : undefined;
}

function legacyBlockToNode(block: LegacyBlock): JSONContent {
  const type = typeof block.type === "string" ? block.type : "paragraph";
  const id = blockId(block);
  const content = inlineContentNodes(block.content);

  if (type === "heading") {
    const props = block.props as { level?: unknown } | undefined;
    const rawLevel = isRecord(props) ? Number(props.level) : 2;
    const level = Math.min(Math.max(Number.isFinite(rawLevel) ? rawLevel : 2, 1), 6);
    return { type: "heading", attrs: { id, level }, content };
  }
  if (type === "quote") return { type: "blockquote", attrs: { id }, content };
  if (type === "divider") return { type: "horizontalRule", attrs: { id } };
  if (type === "bulletListItem" || type === "numberedListItem" || type === "checkListItem") {
    const listType =
      type === "bulletListItem" ? "bulletList" : type === "numberedListItem" ? "orderedList" : "taskList";
    const itemType = type === "checkListItem" ? "taskItem" : "listItem";
    return {
      type: listType,
      attrs: listType === "orderedList" ? { order: 1 } : undefined,
      content: [
        {
          type: itemType,
          attrs: itemType === "taskItem" ? { id, checked: false } : { id },
          content: [{ type: "paragraph", attrs: { id }, content }],
        },
      ],
    };
  }
  return { type: "paragraph", attrs: { id }, content };
}

function looksLikeLegacyBlock(value: unknown): value is LegacyBlock {
  return isRecord(value) && typeof value.type === "string" && value.type !== "doc";
}

function legacyBlocksToDoc(blocks: unknown[]): TiptapDocJson {
  const content = blocks.filter(looksLikeLegacyBlock).map(legacyBlockToNode);
  return { type: "doc", content: content.length > 0 ? content : createEmptyTiptapDoc().content };
}

export function isTiptapDocJson(value: unknown): value is TiptapDocJson {
  return isRecord(value) && value.type === "doc" && Array.isArray(value.content);
}

export function normalizeTiptapDoc(input: unknown): TiptapDocJson {
  if (isTiptapDocJson(input)) {
    return {
      ...input,
      content: input.content && input.content.length > 0 ? input.content : createEmptyTiptapDoc().content,
    };
  }
  if (isRecord(input) && Array.isArray(input.blocks)) return legacyBlocksToDoc(input.blocks);
  if (Array.isArray(input)) return legacyBlocksToDoc(input);
  return createEmptyTiptapDoc();
}

export function isTiptapBookDocument(value: unknown): value is TiptapBookDocument {
  return (
    isRecord(value) &&
    value.type === "tiptap-book" &&
    value.version === 1 &&
    Array.isArray(value.pages)
  );
}

export function createEmptyTiptapBookDocument(): TiptapBookDocument {
  return {
    type: "tiptap-book",
    version: 1,
    pages: [{ id: pageId(0), doc: createEmptyTiptapDoc() }],
  };
}

export function normalizeTiptapBookDocument(input: unknown): TiptapBookDocument {
  if (isTiptapBookDocument(input)) {
    const pages = input.pages
      .map((page, index) => {
        if (!isRecord(page)) return null;
        return {
          id: typeof page.id === "string" && page.id.trim() ? page.id : pageId(index),
          doc: normalizeTiptapDoc(page.doc),
        };
      })
      .filter((page): page is TiptapBookPage => Boolean(page));

    return {
      type: "tiptap-book",
      version: 1,
      layout: normalizeBookLayout(input.layout),
      pages: pages.length > 0 ? pages : createEmptyTiptapBookDocument().pages,
    };
  }

  if (isRecord(input) && input.type === "book" && Array.isArray(input.pages)) {
    const pages = input.pages
      .map((page, index) => {
        if (!isRecord(page)) return null;
        return {
          id: typeof page.id === "string" && page.id.trim() ? page.id : pageId(index),
          doc: normalizeTiptapDoc(page.blocks),
        };
      })
      .filter((page): page is TiptapBookPage => Boolean(page));
    return { type: "tiptap-book", version: 1, pages: pages.length > 0 ? pages : createEmptyTiptapBookDocument().pages };
  }

  if (isTiptapDocJson(input)) {
    return { type: "tiptap-book", version: 1, pages: [{ id: pageId(0), doc: normalizeTiptapDoc(input) }] };
  }

  return { type: "tiptap-book", version: 1, pages: [{ id: pageId(0), doc: normalizeTiptapDoc(input) }] };
}

export function isEmptyTiptapDoc(doc: TiptapDocJson) {
  const content = doc.content ?? [];
  if (content.length === 0) return true;
  return content.every((node) => {
    if (node.type !== "paragraph") return false;
    return textFromNode(node).trim().length === 0;
  });
}

export function compactTiptapBookDocument(input: TiptapBookDocument): TiptapBookDocument {
  return {
    type: "tiptap-book",
    version: 1,
    layout: normalizeBookLayout(input.layout),
    pages: input.pages.length > 0
      ? input.pages.map((page, index) => ({
          id: page.id || pageId(index),
          doc: normalizeTiptapDoc(page.doc),
        }))
      : createEmptyTiptapBookDocument().pages,
  };
}

export function textFromNode(node: JSONContent): string {
  if (typeof node.text === "string") return node.text;
  return (node.content ?? []).map(textFromNode).join("");
}

export function textFromDoc(doc: TiptapDocJson): string {
  return (doc.content ?? []).map(textFromNode).join("\n");
}

export function docNodeCount(doc: TiptapDocJson) {
  return doc.content?.length ?? 0;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderInline(nodes: JSONContent[] | undefined): string {
  return (nodes ?? [])
    .map((node) => {
      if (node.type === "hardBreak") return "<br />";
      if (node.type !== "text") return renderInline(node.content);
      let text = escapeHtml(node.text ?? "");
      for (const mark of node.marks ?? []) {
        if (mark.type === "bold") text = `<strong>${text}</strong>`;
        if (mark.type === "italic") text = `<em>${text}</em>`;
        if (mark.type === "underline") text = `<u>${text}</u>`;
        if (mark.type === "strike") text = `<s>${text}</s>`;
        if (mark.type === "code") text = `<code>${text}</code>`;
        if (mark.type === "highlight") text = `<mark>${text}</mark>`;
      }
      return text;
    })
    .join("");
}

function renderNode(node: JSONContent): string {
  if (node.type === "heading") {
    const level = Math.min(Math.max(Number(node.attrs?.level) || 2, 1), 6);
    return `<h${level}>${renderInline(node.content)}</h${level}>`;
  }
  if (node.type === "mediaText") {
    const src = typeof node.attrs?.src === "string" ? node.attrs.src : "";
    const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
    const title = typeof node.attrs?.title === "string" ? node.attrs.title : "";
    const fit = node.attrs?.fit === "crop" ? "crop" : "contain";
    const imageSide = node.attrs?.imageSide === "right" ? "right" : "left";
    const rawWidth = typeof node.attrs?.imageWidth === "number" ? node.attrs.imageWidth : 44;
    const imageWidth = Math.min(Math.max(rawWidth, 24), 68);
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
    const image = src
      ? `<figure><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${titleAttr} data-fit="${escapeHtml(fit)}" loading="eager" decoding="sync" crossorigin="anonymous" /></figure>`
      : "";
    return `<div class="media-text" data-image-side="${escapeHtml(imageSide)}" style="--media-image-width:${imageWidth}%">${image}<div class="media-text-copy">${(node.content ?? []).map(renderNode).join("")}</div></div>`;
  }
  if (node.type === "image") {
    const src = typeof node.attrs?.src === "string" ? node.attrs.src : "";
    if (!src) return "";
    const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
    const title = typeof node.attrs?.title === "string" ? node.attrs.title : "";
    const width = typeof node.attrs?.width === "number" ? node.attrs.width : null;
    const height = typeof node.attrs?.height === "number" ? node.attrs.height : null;
    const fit = node.attrs?.fit === "crop" ? "crop" : "contain";
    const align = ["left", "center", "right", "full"].includes(String(node.attrs?.align))
      ? String(node.attrs?.align)
      : "center";
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
    const style = [
      align === "full" ? "width:100%" : width ? `width:${width}px` : null,
      height ? `height:${height}px` : null,
      height ? `object-fit:${fit === "crop" ? "cover" : "contain"}` : null,
    ]
      .filter(Boolean)
      .join(";");
    const styleAttr = style ? ` style="${escapeHtml(style)}"` : "";
    const fitAttr = fit === "crop" ? ` data-fit="crop"` : "";
    return `<figure data-align="${escapeHtml(align)}"><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${titleAttr}${fitAttr}${styleAttr} loading="eager" decoding="sync" crossorigin="anonymous" /></figure>`;
  }
  if (node.type === "paragraph") return `<p>${renderInline(node.content)}</p>`;
  if (node.type === "hardBreak") return "<br />";
  if (node.type === "codeBlock") return `<pre><code>${escapeHtml(textFromNode(node))}</code></pre>`;
  if (node.type === "blockquote") return `<blockquote>${(node.content ?? []).map(renderNode).join("")}</blockquote>`;
  if (node.type === "horizontalRule") return `<hr />`;
  if (node.type === "bulletList") return `<ul>${(node.content ?? []).map(renderNode).join("")}</ul>`;
  if (node.type === "orderedList") return `<ol>${(node.content ?? []).map(renderNode).join("")}</ol>`;
  if (node.type === "taskList") return `<ul>${(node.content ?? []).map(renderNode).join("")}</ul>`;
  if (node.type === "listItem" || node.type === "taskItem") {
    return `<li>${(node.content ?? []).map(renderNode).join("")}</li>`;
  }
  return `<p>${escapeHtml(textFromNode(node))}</p>`;
}

export function tiptapDocumentToHtml(input: {
  title: string;
  document: unknown;
  pageFormat?: PageFormat;
  customPageSize?: PageSize;
}) {
  const book = normalizeTiptapBookDocument(input.document);
  const body = book.pages
    .map((page) => `<section class="page"><article class="page-body">${(page.doc.content ?? []).map(renderNode).join("\n")}</article></section>`)
    .join("\n");
  const pageCssSize = getPageCssSize(input.pageFormat ?? "ebook", input.customPageSize);
  const pageSpec = getPageFormatSpec(input.pageFormat ?? "ebook", input.customPageSize);
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(input.title)}</title>
    <style>
      @page { size: ${pageCssSize}; margin: 18mm 16mm; }
      * { box-sizing: border-box; }
      html { background: #f7f4ee; }
      body { margin: 0; background: #f7f4ee; color: #17130f; font-family: Georgia, 'Times New Roman', serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      main { max-width: ${Math.max(pageSpec.previewWidth, 720)}px; margin: 0 auto; padding: 32px 24px; }
      .page { width: ${pageSpec.widthMm}mm; min-height: ${pageSpec.heightMm}mm; max-width: 100%; margin: 0 auto 28px; padding: 18mm 16mm; background: #ffffff; box-shadow: 0 18px 50px rgba(31, 22, 14, 0.12); break-after: page; display: flex; flex-direction: column; gap: 10mm; }
      .page:last-child { break-after: auto; }
      .page-body { flex: 1; }
      @media print {
        html, body { background: #fff; }
        main { max-width: none; margin: 0; padding: 0; background: #fff; }
        .page { width: auto; min-height: auto; max-width: none; margin: 0; padding: 0; background: #fff; box-shadow: none; break-after: page; gap: 7mm; }
        .page:last-child { break-after: auto; }
        h1, h2, h3, h4, h5, h6, figure, table, blockquote { break-inside: avoid; }
        p, li { orphans: 3; widows: 3; }
      }
      h1, h2, h3, h4, h5, h6 { font-family: system-ui, sans-serif; letter-spacing: -0.02em; line-height: 1.12; color: #17130f; }
      h1 { font-size: 32px; margin: 0 0 22px; }
      h2 { font-size: 24px; margin: 30px 0 14px; }
      h3, h4, h5, h6 { margin: 24px 0 12px; }
      p, li, blockquote { font-size: 15.5px; line-height: 1.72; }
      p { margin: 0 0 13px; }
      ul, ol { padding-left: 1.35em; margin: 12px 0 16px; }
      li + li { margin-top: 6px; }
      blockquote { border-left: 3px solid #c6a36b; margin-left: 0; padding-left: 18px; color: #5f5347; }
      pre { margin: 18px 0; padding: 14px 16px; overflow-wrap: anywhere; white-space: pre-wrap; border: 1px solid #e8dfd1; border-radius: 6px; background: #faf7f1; color: #2f2a24; font-size: 13px; line-height: 1.55; }
      code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.92em; }
      hr { border: 0; border-top: 1px solid #e4dbcd; margin: 32px 0; }
      figure { margin: 24px 0; }
      figure[data-align='left'] { text-align: left; }
      figure[data-align='center'] { text-align: center; }
      figure[data-align='right'] { text-align: right; }
      figure[data-align='full'] { text-align: center; }
      img { display: block; max-width: 100%; height: auto; margin: 0 auto; border-radius: 4px; object-position: center; }
      figure[data-align='left'] img { margin-left: 0; margin-right: auto; }
      figure[data-align='right'] img { margin-left: auto; margin-right: 0; }
      figure[data-align='full'] img { width: 100%; }
      .media-text { --media-image-width: 44%; display: grid; grid-template-columns: minmax(140px, var(--media-image-width)) minmax(0, 1fr); gap: 18px; align-items: start; margin: 24px 0; break-inside: avoid; }
      .media-text[data-image-side='right'] { grid-template-columns: minmax(0, 1fr) minmax(140px, var(--media-image-width)); }
      .media-text[data-image-side='right'] figure { grid-column: 2; grid-row: 1; }
      .media-text[data-image-side='right'] .media-text-copy { grid-column: 1; grid-row: 1; }
      .media-text figure { margin: 0; }
      .media-text img { width: 100%; margin: 0; }
      .media-text img[data-fit='crop'] { object-fit: cover; }
      .media-text-copy > :first-child { margin-top: 0; }
    </style>
  </head>
  <body>
    <main>${body}</main>
  </body>
</html>`;
}

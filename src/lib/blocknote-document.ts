import type { PartialBlock } from "@blocknote/core";
import { getPageCssSize, type PageFormat, type PageSize } from "@/lib/page-format";

export type BlockNoteDocument = PartialBlock[];

const blockNoteTypes = new Set([
  "audio",
  "bulletListItem",
  "checkListItem",
  "codeBlock",
  "divider",
  "file",
  "heading",
  "image",
  "numberedListItem",
  "paragraph",
  "quote",
  "table",
  "toggleListItem",
  "video",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type TableContentShape = {
  type: "tableContent";
  headerRows?: unknown;
  headerCols?: unknown;
  rows: unknown[];
};

function isTableContent(value: unknown): value is TableContentShape {
  return isRecord(value) && value.type === "tableContent" && Array.isArray(value.rows);
}

function looksLikeBlockNoteBlock(value: unknown): value is PartialBlock {
  if (!isRecord(value)) return false;
  if (typeof value.type !== "string" || !blockNoteTypes.has(value.type)) return false;

  if (
    "content" in value &&
    value.content !== undefined &&
    typeof value.content !== "string" &&
    !Array.isArray(value.content) &&
    !(value.type === "table" && isTableContent(value.content))
  ) {
    return false;
  }

  return true;
}

export function normalizeBlockNoteDocument(input: unknown): BlockNoteDocument {
  const rawBlocks =
    isRecord(input) && Array.isArray(input.blocks)
      ? input.blocks
      : Array.isArray(input)
        ? input
        : [];

  const blocks: PartialBlock[] = [];

  for (const rawBlock of rawBlocks) {
    if (looksLikeBlockNoteBlock(rawBlock)) {
      const block = {
        ...rawBlock,
        children: Array.isArray(rawBlock.children)
          ? normalizeBlockNoteDocument(rawBlock.children)
          : undefined,
      } as PartialBlock;
      blocks.push(block);
    }
  }

  return blocks;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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

function propString(props: unknown, key: string) {
  if (!isRecord(props)) return "";
  const value = props[key];
  return typeof value === "string" ? value.trim() : "";
}

function propNumber(props: unknown, key: string) {
  if (!isRecord(props)) return undefined;
  const value = props[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function safeMediaUrl(value: string) {
  if (!value) return "";
  if (/^data:image\//i.test(value)) return value;
  if (/^blob:/i.test(value)) return value;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : "";
  } catch {
    return "";
  }
}

function renderChildren(block: PartialBlock) {
  return Array.isArray(block.children)
    ? normalizeBlockNoteDocument(block.children).map(renderBlock).join("\n")
    : "";
}

function renderMediaBlock(block: PartialBlock, tag: "audio" | "video" | "file" | "image") {
  const url = safeMediaUrl(propString(block.props, "url"));
  const caption = escapeHtml(propString(block.props, "caption"));
  const name = escapeHtml(propString(block.props, "name") || caption || url || tag);
  const width = propNumber(block.props, "previewWidth");
  const widthAttr = width ? ` style="max-width:${Math.max(120, Math.min(width, 760))}px"` : "";

  if (!url) return `<p>${name}</p>${renderChildren(block)}`;

  if (tag === "image") {
    return `<figure><img src="${escapeHtml(url)}" alt="${name}"${widthAttr} />${
      caption ? `<figcaption>${caption}</figcaption>` : ""
    }</figure>${renderChildren(block)}`;
  }

  if (tag === "video") {
    return `<figure><video controls src="${escapeHtml(url)}"${widthAttr}></video>${
      caption ? `<figcaption>${caption}</figcaption>` : ""
    }</figure>${renderChildren(block)}`;
  }

  if (tag === "audio") {
    return `<figure><audio controls src="${escapeHtml(url)}"></audio>${
      caption ? `<figcaption>${caption}</figcaption>` : ""
    }</figure>${renderChildren(block)}`;
  }

  return `<p><a href="${escapeHtml(url)}">${name}</a></p>${renderChildren(block)}`;
}

function tableCellContent(cell: unknown) {
  if (Array.isArray(cell)) return inlineText(cell);
  if (isRecord(cell)) return inlineText(cell.content);
  return "";
}

function tableCellSpanAttributes(cell: unknown) {
  if (!isRecord(cell) || !isRecord(cell.props)) return "";
  const colspan = Number(cell.props.colspan ?? 1);
  const rowspan = Number(cell.props.rowspan ?? 1);
  return `${Number.isFinite(colspan) && colspan > 1 ? ` colspan="${Math.floor(colspan)}"` : ""}${
    Number.isFinite(rowspan) && rowspan > 1 ? ` rowspan="${Math.floor(rowspan)}"` : ""
  }`;
}

function renderTable(block: PartialBlock) {
  const content = block.content;
  if (!isTableContent(content)) return renderChildren(block);

  const headerRows = Number(content.headerRows ?? 0);
  const headerCols = Number(content.headerCols ?? 0);
  const rows = content.rows
    .map((row, rowIndex) => {
      if (!isRecord(row) || !Array.isArray(row.cells)) return "";

      const cells = row.cells
        .map((cell, cellIndex) => {
          const tag = rowIndex < headerRows || cellIndex < headerCols ? "th" : "td";
          return `<${tag}${tableCellSpanAttributes(cell)}>${escapeHtml(tableCellContent(cell))}</${tag}>`;
        })
        .join("");

      return `<tr>${cells}</tr>`;
    })
    .join("");

  return `<table><tbody>${rows}</tbody></table>${renderChildren(block)}`;
}

function renderBlock(block: PartialBlock): string {
  const type = typeof block.type === "string" ? block.type : "paragraph";
  const text = escapeHtml(inlineText(block.content));
  const children = renderChildren(block);

  if (type === "heading") {
    const props = isRecord(block.props) ? (block.props as Record<string, unknown>) : {};
    const rawLevel = Number(props.level ?? 2);
    const level = Math.min(Math.max(Number.isFinite(rawLevel) ? rawLevel : 2, 1), 6);
    return `<h${level}>${text}</h${level}>${children}`;
  }

  if (type === "quote") return `<blockquote>${text}${children}</blockquote>`;
  if (type === "bulletListItem") return `<ul><li>${text}${children}</li></ul>`;
  if (type === "numberedListItem") return `<ol><li>${text}${children}</li></ol>`;
  if (type === "checkListItem") return `<ul><li>${text}${children}</li></ul>`;
  if (type === "divider") return `<hr />`;
  if (type === "table") return renderTable(block);
  if (type === "image" || type === "video" || type === "audio" || type === "file") {
    return renderMediaBlock(block, type);
  }

  return `<p>${text}</p>${children}`;
}

export function blockNoteDocumentToHtml(input: {
  title: string;
  blocks: unknown;
  pageFormat?: PageFormat;
  customPageSize?: PageSize;
}) {
  const body = normalizeBlockNoteDocument(input.blocks).map(renderBlock).join("\n");
  const pageCssSize = getPageCssSize(input.pageFormat ?? "ebook", input.customPageSize);
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(input.title)}</title>
    <style>
      @page { size: ${pageCssSize}; margin: 16mm; }
      body { margin: 0; background: #f7f4ee; color: #17130f; font-family: Georgia, serif; }
      main { max-width: 640px; margin: 0 auto; padding: 64px 40px; background: #ffffff; box-sizing: border-box; }
      @media print {
        body { background: #fff; }
        main { max-width: none; margin: 0; padding: 0; background: #fff; }
        h1, h2, h3, h4, h5, h6, figure, table, blockquote { break-inside: avoid; }
        p, li { orphans: 3; widows: 3; }
      }
      h1, h2, h3, h4, h5, h6 { font-family: system-ui, sans-serif; letter-spacing: 0; }
      p, li, blockquote { font-size: 16px; line-height: 1.75; }
      blockquote { border-left: 3px solid #c6a36b; margin-left: 0; padding-left: 18px; color: #5f5347; }
      figure { margin: 28px 0; }
      img, video { max-width: 100%; height: auto; display: block; }
      audio { width: 100%; }
      figcaption { margin-top: 8px; font-size: 13px; color: #6f6559; }
      table { width: 100%; border-collapse: collapse; margin: 28px 0; font-size: 14px; }
      th, td { border: 1px solid #e4dbcd; padding: 10px 12px; text-align: left; vertical-align: top; }
      th { background: #f2ede4; font-family: system-ui, sans-serif; font-weight: 700; }
      hr { border: 0; border-top: 1px solid #e4dbcd; margin: 32px 0; }
    </style>
  </head>
  <body>
    <main>${body}</main>
  </body>
</html>`;
}

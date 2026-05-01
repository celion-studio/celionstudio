import type { CelionEbookDocument, CelionEbookPage } from "@/lib/ebook-document";
import { EBOOK_PAGE_SIZE_PX } from "@/lib/ebook-format";
import { sanitizeEbookHtmlForCanvas } from "@/lib/ebook-html";

const DEFAULT_PAGE_HEIGHT: number = EBOOK_PAGE_SIZE_PX.height;
const DEFAULT_PAGE_GAP = 18;
const GENERIC_TITLE_PATTERN = /^(?:slide|page)\s*[-_#]?\s*\d+$/i;
const RUNTIME_TEXT_SELECTOR = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "li",
  "blockquote",
  "figcaption",
  "td",
  "th",
  "span",
  "strong",
  "em",
  "small",
  "div",
].join(",");

export type PageSummary = {
  title: string;
  eyebrow: string;
};

export function normalizeEditorHtml(html: string) {
  return sanitizeEbookHtmlForCanvas(html)
    .replace(/\bdata-page=/g, "data-slide=")
    .replace(/class=(["'])([^"']*)\bpage\b([^"']*)\1/g, (_match, quote: string, before: string, after: string) => {
      const classes = `${before} slide ${after}`.trim().replace(/\s+/g, " ");
      return `class=${quote}${classes}${quote}`;
    })
    .replace(/\.page(?![-\w])/g, ".slide");
}

function stripTags(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function isUsefulPageTitle(value: string) {
  const title = value.trim();
  return title.length > 0 && !GENERIC_TITLE_PATTERN.test(title);
}

function titleFromHtml(html: string) {
  const headingMatch = html.match(/<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/i);
  if (headingMatch?.[1]) {
    const headingText = stripTags(headingMatch[1]);
    if (isUsefulPageTitle(headingText)) return headingText;
  }

  const roleElementPattern = /<([a-z][\w-]*)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  for (const match of html.matchAll(roleElementPattern)) {
    const attrs = match[2] ?? "";
    if (!/\bdata-role\s*=\s*["']?(?:title|headline|cover-title)["']?/i.test(attrs)) continue;

    const roleText = stripTags(match[3] ?? "");
    if (isUsefulPageTitle(roleText)) return roleText;
  }

  return "";
}

function formatRole(role: string, index: number) {
  if (index === 0 || role.toLowerCase() === "cover") return "Cover";
  return role
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase()) || `Page ${index + 1}`;
}

function pageTitle(page: CelionEbookPage, index: number) {
  if (isUsefulPageTitle(page.title)) return page.title.trim();
  return titleFromHtml(page.html) || `Page ${index + 1}`;
}

export function buildPageSummariesFromDocument(document: CelionEbookDocument): PageSummary[] {
  return document.pages.map((page, index) => ({
    title: pageTitle(page, index).slice(0, 42),
    eyebrow: formatRole(page.role, index).slice(0, 24),
  }));
}

export function pickSelectableElement(page: CelionEbookPage, candidateIds: string[]) {
  const manifestById = new Map(page.manifest.editableElements.map((element) => [element.id, element]));
  const candidates = candidateIds
    .map((id) => manifestById.get(id))
    .filter((element): element is NonNullable<typeof element> => Boolean(element));

  return candidates.find((element) => element.type === "text" || element.editableProps.includes("text"))
    ?? candidates[0]
    ?? null;
}

function hasDirectText(element: Element) {
  return Array.from(element.childNodes).some((node) =>
    node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim()),
  );
}

export function getRuntimeTextElements(root: ParentNode) {
  return Array.from(root.querySelectorAll<HTMLElement>(RUNTIME_TEXT_SELECTOR))
    .filter((element) => {
      const text = element.textContent?.trim() ?? "";
      if (!text) return false;
      if (element.closest("script, style")) return false;
      return hasDirectText(element) || !element.querySelector(RUNTIME_TEXT_SELECTOR);
    });
}

export function runtimeTextIndexFromElement(element: Element | null) {
  const value = element?.getAttribute("data-celion-runtime-text-index");
  const index = Number(value);
  return Number.isFinite(index) ? index : null;
}

export function pickRuntimeTextElement(pointedElements: Element[], target: HTMLElement) {
  const candidates = [
    ...pointedElements.map((element) => element.closest<HTMLElement>("[data-celion-runtime-text-index]")),
    target.closest<HTMLElement>("[data-celion-runtime-text-index]"),
  ].filter((element): element is HTMLElement => Boolean(element));

  return candidates[0] ?? null;
}

export function buildPreviewFrameCss(pageGap = DEFAULT_PAGE_GAP) {
  return `
      html, body { overflow: hidden !important; width: 100% !important; }
      body {
        background: #f8f7f4 !important;
      }
      .slide {
        background: #ffffff !important;
        margin-bottom: ${pageGap}px !important;
        outline: none !important;
        box-shadow: none !important;
      }
      .slide:last-of-type { margin-bottom: 0 !important; }
      [data-celion-id] { cursor: pointer !important; pointer-events: auto !important; }
      [data-selected="true"] { outline-offset: 2px !important; }
    `;
}

export function applyPreviewPageSpacing(
  pages: HTMLElement[],
  pageGap = DEFAULT_PAGE_GAP,
) {
  pages.forEach((page, index) => {
    page.style.marginTop = "0";
    page.style.marginRight = "auto";
    page.style.marginBottom = index === pages.length - 1 ? "0" : `${pageGap}px`;
    page.style.marginLeft = "auto";
    page.style.outline = "none";
    page.style.boxShadow = "none";
  });
}

export function estimatePreviewIframeHeight(
  pageCount: number,
  pageHeight = DEFAULT_PAGE_HEIGHT,
  pageGap = DEFAULT_PAGE_GAP,
) {
  if (pageCount <= 0) return pageHeight;
  return Math.max(pageHeight, pageCount * (pageHeight + pageGap) + 40);
}

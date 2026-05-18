import { compileSlideDocumentToHtml, normalizeSlideDocument, sanitizeSlideDocument, validateSlideDocument } from "@/lib/slide-document";
import { sanitizeEbookHtmlForCanvas, validateCelionSlideHtml, validateLegacyEbookHtmlSafety } from "@/lib/slide-html";
import {
  MAX_EBOOK_DOCUMENT_JSON_LENGTH,
  MAX_EBOOK_DOCUMENT_PAGES,
  MAX_EBOOK_PAGE_CSS_LENGTH,
  MAX_EBOOK_PAGE_HTML_LENGTH,
  MAX_EBOOK_THEME_CSS_LENGTH,
  MAX_SAVE_HTML_LENGTH,
} from "@/lib/request-limits";

type PrepareSaveHtmlResult =
  | { ok: true; html: string }
  | { ok: false; message: string };

type PrepareSaveDocumentResult =
  | { ok: true; document: ReturnType<typeof normalizeSlideDocument>; html: string }
  | { ok: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateEbookDocumentSaveSize(document: unknown) {
  const serialized = JSON.stringify(document);
  if (!serialized) return "Invalid ebook document";
  if (serialized.length > MAX_EBOOK_DOCUMENT_JSON_LENGTH) {
    return `Ebook document is too large. Maximum is ${MAX_EBOOK_DOCUMENT_JSON_LENGTH} characters.`;
  }

  if (!isRecord(document)) return null;
  const pages = Array.isArray(document.slides) ? document.slides : [];
  if (pages.length > MAX_EBOOK_DOCUMENT_PAGES) {
    return `Too many ebook pages. Maximum is ${MAX_EBOOK_DOCUMENT_PAGES}.`;
  }

  const themeCss = typeof document.themeCss === "string" ? document.themeCss : "";
  if (themeCss.length > MAX_EBOOK_THEME_CSS_LENGTH) {
    return `Theme CSS is too large. Maximum is ${MAX_EBOOK_THEME_CSS_LENGTH} characters.`;
  }

  for (const page of pages) {
    if (!isRecord(page)) continue;
    const html = typeof page.html === "string" ? page.html : "";
    const css = typeof page.css === "string" ? page.css : "";
    if (html.length > MAX_EBOOK_PAGE_HTML_LENGTH) {
      return `Page HTML is too large. Maximum is ${MAX_EBOOK_PAGE_HTML_LENGTH} characters per page.`;
    }
    if (css.length > MAX_EBOOK_PAGE_CSS_LENGTH) {
      return `Page CSS is too large. Maximum is ${MAX_EBOOK_PAGE_CSS_LENGTH} characters per page.`;
    }
  }

  return null;
}

export function prepareEbookHtmlForSave(html: string): PrepareSaveHtmlResult {
  if (html.length > MAX_SAVE_HTML_LENGTH) {
    return {
      ok: false,
      message: `Ebook HTML is too large. Maximum is ${MAX_SAVE_HTML_LENGTH} characters.`,
    };
  }

  const sanitizedHtml = sanitizeEbookHtmlForCanvas(html);
  const safetyError = validateLegacyEbookHtmlSafety(sanitizedHtml);
  if (safetyError) {
    return {
      ok: false,
      message: safetyError,
    };
  }

  const validation = validateCelionSlideHtml(sanitizedHtml, {
    allowGenericOutlineHeadings: true,
  });

  if (!validation.ok) {
    return {
      ok: false,
      message: validation.errors[0] ?? "Invalid ebook HTML",
    };
  }

  return { ok: true, html: sanitizedHtml };
}

export function prepareEbookDocumentForSave(document: unknown): PrepareSaveDocumentResult {
  const sizeError = validateEbookDocumentSaveSize(document);
  if (sizeError) {
    return {
      ok: false,
      message: sizeError,
    };
  }

  const rawValidation = validateSlideDocument(document);
  if (!rawValidation.ok) {
    return {
      ok: false,
      message: rawValidation.errors[0] ?? "Invalid ebook document",
    };
  }

  const normalizedDocument = sanitizeSlideDocument(document);
  const sanitizedValidation = validateSlideDocument(normalizedDocument);
  if (!sanitizedValidation.ok) {
    return {
      ok: false,
      message: sanitizedValidation.errors[0] ?? "Invalid ebook document",
    };
  }

  const html = compileSlideDocumentToHtml(normalizedDocument);
  const htmlValidation = validateCelionSlideHtml(html, {
    allowGenericOutlineHeadings: true,
  });

  if (!htmlValidation.ok) {
    return {
      ok: false,
      message: htmlValidation.errors[0] ?? "Invalid compiled ebook HTML",
    };
  }

  return { ok: true, document: normalizedDocument, html };
}

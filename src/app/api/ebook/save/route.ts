import { NextResponse } from "next/server";
import { z } from "zod";
import { compileEbookDocumentToHtml, normalizeEbookDocument, sanitizeEbookDocument, validateEbookDocument } from "@/lib/ebook-document";
import { getRouteSession } from "@/lib/session";
import { sanitizeEbookHtmlForCanvas, validateCelionSlideHtml, validateLegacyEbookHtmlSafety } from "@/lib/ebook-html";
import { updateProjectEbookDocument, updateProjectEbookHtml } from "@/lib/projects";
import {
  MAX_EBOOK_DOCUMENT_JSON_LENGTH,
  MAX_EBOOK_DOCUMENT_PAGES,
  MAX_EBOOK_PAGE_CSS_LENGTH,
  MAX_EBOOK_PAGE_HTML_LENGTH,
  MAX_EBOOK_THEME_CSS_LENGTH,
  MAX_SAVE_HTML_LENGTH,
} from "@/lib/request-limits";

const schema = z.object({
  projectId: z.string().min(1),
  html: z.string().min(1).optional(),
  document: z.unknown().optional(),
}).refine((value) => value.html || value.document, { message: "Either html or document is required" });

type SaveRequestBody = z.infer<typeof schema>;

type ParseSaveRequestResult =
  | { ok: true; data: SaveRequestBody }
  | { ok: false; message: string };

type PrepareSaveHtmlResult =
  | { ok: true; html: string }
  | { ok: false; message: string };

type PrepareSaveDocumentResult =
  | { ok: true; document: ReturnType<typeof normalizeEbookDocument>; html: string }
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
  const pages = Array.isArray(document.pages) ? document.pages : [];
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

export async function parseEbookSaveRequest(
  request: Request,
): Promise<ParseSaveRequestResult> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return { ok: false, message: "Invalid JSON" };
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, message: "Invalid request" };
  }

  return { ok: true, data: parsed.data };
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

  const rawValidation = validateEbookDocument(document);
  if (!rawValidation.ok) {
    return {
      ok: false,
      message: rawValidation.errors[0] ?? "Invalid ebook document",
    };
  }

  const normalizedDocument = sanitizeEbookDocument(document);
  const sanitizedValidation = validateEbookDocument(normalizedDocument);
  if (!sanitizedValidation.ok) {
    return {
      ok: false,
      message: sanitizedValidation.errors[0] ?? "Invalid ebook document",
    };
  }

  const html = compileEbookDocumentToHtml(normalizedDocument);
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

export async function POST(request: Request) {
  const session = await getRouteSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseEbookSaveRequest(request);
  if (!parsed.ok) {
    return NextResponse.json({ message: parsed.message }, { status: 400 });
  }

  if (parsed.data.document) {
    const prepared = prepareEbookDocumentForSave(parsed.data.document);
    if (!prepared.ok) {
      return NextResponse.json({ message: prepared.message }, { status: 400 });
    }

    const result = await updateProjectEbookDocument(
      session.user.id,
      parsed.data.projectId,
      prepared.document,
      prepared.html,
    );

    if (!result) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  }

  const prepared = prepareEbookHtmlForSave(parsed.data.html!);
  if (!prepared.ok) {
    return NextResponse.json({ message: prepared.message }, { status: 400 });
  }

  const result = await updateProjectEbookHtml(
    session.user.id,
    parsed.data.projectId,
    prepared.html,
  );

  if (!result) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

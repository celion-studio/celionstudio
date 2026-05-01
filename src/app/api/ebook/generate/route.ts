import { NextResponse } from "next/server";
import { z } from "zod";
import { getRouteSession } from "@/lib/session";
import { EBOOK_BLUEPRINT_GEMINI_MODEL, EBOOK_GEMINI_MODEL } from "@/lib/ai/gemini";
import { EbookGenerationError, generateEbookHtmlWithDiagnostics } from "@/lib/ebook-generation";
import { recordEbookGenerationLog } from "@/lib/ebook-generation-logs";
import { EBOOK_STYLE_IDS } from "@/lib/ebook-style";
import { formatSourcesForPrompt } from "@/lib/source-ingestion";
import { createProjectForUser, getEbookPageCountForHtml } from "@/lib/projects";
import { SOURCE_KIND_IDS } from "@/types/project";

const sourceSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(SOURCE_KIND_IDS),
  name: z.string().min(1),
  content: z.string().min(1),
  excerpt: z.string().default(""),
});

const schema = z.object({
  title: z.string().min(1),
  author: z.string().default(""),
  purpose: z.string().default(""),
  targetAudience: z.string().default(""),
  tone: z.string().default(""),
  sourceText: z.string().default(""),
  sources: z.array(sourceSchema).default([]),
  ebookStyle: z.enum(EBOOK_STYLE_IDS),
  accentColor: z.string().default("#6366f1"),
});

type GenerateRequestBody = z.infer<typeof schema>;

type ParseGenerateRequestResult =
  | { ok: true; data: GenerateRequestBody }
  | { ok: false; message: string };

type EbookGenerationDiagnostics = Awaited<ReturnType<typeof generateEbookHtmlWithDiagnostics>>["diagnostics"];

function sanitizeBlueprintForLog(blueprint: EbookGenerationDiagnostics["blueprint"]) {
  return {
    ...blueprint,
    slideCount: blueprint.slides.length,
    slides: blueprint.slides.map((slide) => ({
      role: slide.role,
      eyebrow: slide.eyebrow,
      headline: slide.headline,
      visualDirection: slide.visualDirection,
    })),
  };
}

export async function parseEbookGenerateRequest(
  request: Request,
): Promise<ParseGenerateRequestResult> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return { ok: false, message: "Invalid JSON" };
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid request",
    };
  }

  return { ok: true, data: parsed.data };
}

export async function POST(request: Request) {
  const session = await getRouteSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseEbookGenerateRequest(request);
  if (!parsed.ok) {
    return NextResponse.json({ message: parsed.message }, { status: 400 });
  }

  const d = parsed.data;
  const sourceText = formatSourcesForPrompt(d.sources, d.sourceText);

  let html: string;
  let diagnostics: EbookGenerationDiagnostics;
  try {
    const result = await generateEbookHtmlWithDiagnostics({
      title: d.title,
      author: d.author,
      purpose: d.purpose,
      targetAudience: d.targetAudience,
      tone: d.tone,
      sourceText,
      ebookStyle: d.ebookStyle,
      accentColor: d.accentColor,
    });
    html = result.html;
    diagnostics = result.diagnostics;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate ebook";
    const status = error instanceof EbookGenerationError && error.status === 429 ? 429 : 500;
    await recordEbookGenerationLog({
      userId: session.user.id,
      status: "failure",
      stage: error instanceof EbookGenerationError ? error.stage ?? "unknown" : "unknown",
      blueprintModel: EBOOK_BLUEPRINT_GEMINI_MODEL,
      htmlModel: EBOOK_GEMINI_MODEL,
      title: d.title,
      purpose: d.purpose,
      targetAudience: d.targetAudience,
      ebookStyle: d.ebookStyle,
      accentColor: d.accentColor,
      sourceCount: d.sources.length,
      sourceTextLength: sourceText.length,
      validation: error instanceof EbookGenerationError ? error.validation : undefined,
      errorReason: error instanceof EbookGenerationError ? error.reason : undefined,
      errorMessage: message,
      errorStatus: status,
      slideCount: error instanceof EbookGenerationError ? error.pageCount : undefined,
    });
    return NextResponse.json({ message }, { status });
  }

  const project = await createProjectForUser(session.user.id, {
    kind: "product",
    title: d.title,
    profile: {
      author: d.author,
      targetAudience: d.targetAudience,
      purpose: d.purpose,
      designMode: "balanced",
      tone: d.tone,
      ebookStyle: d.ebookStyle,
      ebookHtml: html,
      ebookDocument: diagnostics.ebookDocument,
      ebookPageCount: getEbookPageCountForHtml(html),
      accentColor: d.accentColor,
    },
    sources: d.sources.length > 0
      ? d.sources
      : sourceText.trim()
        ? [{ id: crypto.randomUUID(), kind: "pasted_text", name: "Source", content: sourceText, excerpt: sourceText.slice(0, 180) }]
        : [],
  });

  if (!project) {
    return NextResponse.json({ message: "Failed to create project" }, { status: 500 });
  }

  await recordEbookGenerationLog({
    userId: session.user.id,
    projectId: project.id,
    status: "success",
    stage: "complete",
    blueprintModel: diagnostics.blueprintModel,
    htmlModel: diagnostics.htmlModel,
    title: d.title,
    purpose: d.purpose,
    targetAudience: d.targetAudience,
    ebookStyle: d.ebookStyle,
    accentColor: d.accentColor,
    sourceCount: d.sources.length,
    sourceTextLength: sourceText.length,
    blueprint: sanitizeBlueprintForLog(diagnostics.blueprint),
    validation: diagnostics.validation,
    htmlLength: diagnostics.htmlLength,
    slideCount: diagnostics.slideCount,
  });

  return NextResponse.json({ projectId: project.id });
}

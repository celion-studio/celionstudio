import { NextResponse } from "next/server";
import { getRouteSession } from "@/lib/session";
import { EBOOK_GEMINI_MODEL, EBOOK_PLAN_GEMINI_MODEL } from "@/lib/ai/gemini";
import {
  EbookGenerationError,
  generateEbookHtmlFromPlan,
  generateEbookHtmlWithDiagnostics,
  normalizePlan,
  type EbookGenerationDiagnostics,
} from "@/lib/ebook-generation";
import { getEbookGenerationArgs, parseEbookGenerateRequest } from "@/lib/ebook-generate-request";
import { recordEbookGenerationLog } from "@/lib/ebook-generation-logs";
import { isDatabaseUnavailableError } from "@/lib/db";
import {
  createProjectForUser,
  getEbookPageCountForHtml,
  updateProjectWithGeneratedEbook,
} from "@/lib/projects";
import type { ProjectSource } from "@/types/project";

export { parseEbookGenerateRequest } from "@/lib/ebook-generate-request";

function logStageFor(error: unknown) {
  if (!(error instanceof EbookGenerationError)) return "unknown";
  return error.stage ?? "unknown";
}

function logReasonFor(error: unknown) {
  if (!(error instanceof EbookGenerationError)) return undefined;
  return error.reason;
}

export function ebookGenerationFailureStatus(hasSubmittedPlan: boolean, error: unknown) {
  if (!(error instanceof EbookGenerationError)) return 500;
  if (hasSubmittedPlan && error.reason === "plan_invalid") return 400;
  if (error.status === 408 || error.status === 429 || error.status === 503 || error.status === 504) {
    return error.status;
  }
  return 500;
}

function sanitizePlanForLog(plan: EbookGenerationDiagnostics["plan"]) {
  return {
    ...plan,
    slideCount: plan.slides.length,
    slides: plan.slides.map((slide) => ({
      role: slide.role,
      eyebrow: slide.eyebrow,
      headline: slide.headline,
      visualDirection: slide.visualDirection,
    })),
  };
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
  const generationArgs = getEbookGenerationArgs(d);
  const sourceText = generationArgs.sourceText;

  let html: string;
  let diagnostics: EbookGenerationDiagnostics;
  try {
    if (d.plan) {
      const plan = normalizePlan(d.plan, generationArgs);
      const rendered = await generateEbookHtmlFromPlan(generationArgs, plan);
      html = rendered.html;
      diagnostics = {
        planModel: "approved-plan",
        htmlModel: EBOOK_GEMINI_MODEL,
        plan,
        ebookDocument: rendered.ebookDocument,
        validation: rendered.validation,
        generationTrace: rendered.generationTrace,
        htmlLength: rendered.html.length,
        slideCount: rendered.validation.slideCount,
      };
    } else {
      const result = await generateEbookHtmlWithDiagnostics(generationArgs);
      html = result.html;
      diagnostics = result.diagnostics;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate ebook";
    const status = ebookGenerationFailureStatus(Boolean(d.plan), error);
    await recordEbookGenerationLog({
      userId: session.user.id,
      status: "failure",
      stage: logStageFor(error),
      projectId: d.projectId,
      planModel: EBOOK_PLAN_GEMINI_MODEL,
      htmlModel: EBOOK_GEMINI_MODEL,
      title: d.title,
      purpose: d.purpose,
      targetAudience: d.targetAudience,
      ebookStyle: d.ebookStyle,
      accentColor: d.accentColor,
      sourceCount: d.sources.length,
      sourceTextLength: sourceText.length,
      validation: error instanceof EbookGenerationError ? error.validation : undefined,
      generationTrace: error instanceof EbookGenerationError ? error.generationTrace : undefined,
      errorReason: logReasonFor(error),
      errorMessage: message,
      errorStatus: status,
      slideCount: error instanceof EbookGenerationError ? error.slideCount : undefined,
    });
    return NextResponse.json({ message }, { status });
  }

  const projectSources: ProjectSource[] = d.sources.length > 0
    ? d.sources
    : sourceText.trim()
      ? [{ id: crypto.randomUUID(), kind: "pasted_text", name: "Source", content: sourceText, excerpt: sourceText.slice(0, 180) }]
      : [];

  const projectInput = {
    title: d.title,
    profile: {
      author: d.author,
      targetAudience: d.targetAudience,
      purpose: d.purpose,
      designMode: "balanced" as const,
      tone: d.tone,
      ebookStyle: d.ebookStyle,
      ebookHtml: html,
      ebookDocument: diagnostics.ebookDocument,
      ebookPageCount: getEbookPageCountForHtml(html),
      accentColor: d.accentColor,
    },
    sources: projectSources,
  };

  let project: Awaited<ReturnType<typeof createProjectForUser>>;
  try {
    project = d.projectId
      ? await updateProjectWithGeneratedEbook(session.user.id, d.projectId, projectInput)
      : await createProjectForUser(session.user.id, projectInput);
  } catch (error) {
    if (!isDatabaseUnavailableError(error)) {
      throw error;
    }

    const message = "Database is temporarily unavailable. Please retry in a moment.";
    await recordEbookGenerationLog({
      userId: session.user.id,
      projectId: d.projectId,
      status: "failure",
      stage: "persist",
      planModel: diagnostics.planModel,
      htmlModel: diagnostics.htmlModel,
      title: d.title,
      purpose: d.purpose,
      targetAudience: d.targetAudience,
      ebookStyle: d.ebookStyle,
      accentColor: d.accentColor,
      sourceCount: d.sources.length,
      sourceTextLength: sourceText.length,
      plan: sanitizePlanForLog(diagnostics.plan),
      validation: diagnostics.validation,
      generationTrace: diagnostics.generationTrace,
      errorReason: "database_unavailable",
      errorMessage: error instanceof Error ? error.message : message,
      errorStatus: 503,
      htmlLength: diagnostics.htmlLength,
      slideCount: diagnostics.slideCount,
    });

    return NextResponse.json({ message }, { status: 503 });
  }

  if (!project) {
    return NextResponse.json(
      { message: d.projectId ? "Project not found" : "Failed to create project" },
      { status: d.projectId ? 404 : 500 },
    );
  }

  await recordEbookGenerationLog({
    userId: session.user.id,
    projectId: project.id,
    status: "success",
    stage: "complete",
    planModel: diagnostics.planModel,
    htmlModel: diagnostics.htmlModel,
    title: d.title,
    purpose: d.purpose,
    targetAudience: d.targetAudience,
    ebookStyle: d.ebookStyle,
    accentColor: d.accentColor,
    sourceCount: d.sources.length,
    sourceTextLength: sourceText.length,
    plan: sanitizePlanForLog(diagnostics.plan),
    validation: diagnostics.validation,
    generationTrace: diagnostics.generationTrace,
    htmlLength: diagnostics.htmlLength,
    slideCount: diagnostics.slideCount,
  });

  return NextResponse.json({ projectId: project.id, project });
}

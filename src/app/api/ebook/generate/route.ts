import { NextResponse } from "next/server";
import { getRouteSession } from "@/lib/session";
import { EBOOK_GEMINI_MODEL, EBOOK_PLAN_GEMINI_MODEL } from "@/lib/ai/gemini";
import {
  SlideGenerationError,
  generateSlideHtmlFromPlan,
  generateSlideHtmlWithDiagnostics,
  normalizePlan,
  type SlideGenerationDiagnostics,
} from "@/lib/slide-generation";
import { getSlideGenerationArgs, parseSlideGenerateRequest } from "@/lib/slide-generate-request";
import { recordSlideGenerationLog } from "@/lib/slide-generation-logs";
import { isDatabaseUnavailableError } from "@/lib/db";
import {
  createProjectForUser,
  getEbookPageCountForHtml,
  updateProjectWithGeneratedEbook,
} from "@/lib/projects";
import type { ProjectSource } from "@/types/project";

export { parseSlideGenerateRequest } from "@/lib/slide-generate-request";

function logStageFor(error: unknown) {
  if (!(error instanceof SlideGenerationError)) return "unknown";
  return error.stage ?? "unknown";
}

function logReasonFor(error: unknown) {
  if (!(error instanceof SlideGenerationError)) return undefined;
  return error.reason;
}

export function ebookGenerationFailureStatus(hasSubmittedPlan: boolean, error: unknown) {
  if (!(error instanceof SlideGenerationError)) return 500;
  if (hasSubmittedPlan && error.reason === "plan_invalid") return 400;
  if (error.status === 408 || error.status === 429 || error.status === 503 || error.status === 504) {
    return error.status;
  }
  return 500;
}

function sanitizePlanForLog(plan: SlideGenerationDiagnostics["plan"]) {
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

  const parsed = await parseSlideGenerateRequest(request);
  if (!parsed.ok) {
    return NextResponse.json({ message: parsed.message }, { status: 400 });
  }

  const d = parsed.data;
  const generationArgs = getSlideGenerationArgs(d);
  const sourceText = generationArgs.sourceText;

  let html: string;
  let diagnostics: SlideGenerationDiagnostics;
  try {
    if (d.plan) {
      const plan = normalizePlan(d.plan, generationArgs);
      const rendered = await generateSlideHtmlFromPlan(generationArgs, plan);
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
      const result = await generateSlideHtmlWithDiagnostics(generationArgs);
      html = result.html;
      diagnostics = result.diagnostics;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate ebook";
    const status = ebookGenerationFailureStatus(Boolean(d.plan), error);
    await recordSlideGenerationLog({
      userId: session.user.id,
      status: "failure",
      stage: logStageFor(error),
      projectId: d.projectId,
      planModel: EBOOK_PLAN_GEMINI_MODEL,
      htmlModel: EBOOK_GEMINI_MODEL,
      title: d.title,
      purpose: d.purpose,
      targetAudience: d.targetAudience,
      slideStyle: d.slideStyle,
      accentColor: d.accentColor,
      sourceCount: d.sources.length,
      sourceTextLength: sourceText.length,
      validation: error instanceof SlideGenerationError ? error.validation : undefined,
      generationTrace: error instanceof SlideGenerationError ? error.generationTrace : undefined,
      errorReason: logReasonFor(error),
      errorMessage: message,
      errorStatus: status,
      slideCount: error instanceof SlideGenerationError ? error.slideCount : undefined,
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
      slideStyle: d.ebookStyle,
      slideHtml: html,
      slideDocument: diagnostics.slideDocument,
      slideCount: getEbookPageCountForHtml(html),
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
    await recordSlideGenerationLog({
      userId: session.user.id,
      projectId: d.projectId,
      status: "failure",
      stage: "persist",
      planModel: diagnostics.planModel,
      htmlModel: diagnostics.htmlModel,
      title: d.title,
      purpose: d.purpose,
      targetAudience: d.targetAudience,
      slideStyle: d.slideStyle,
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

  await recordSlideGenerationLog({
    userId: session.user.id,
    projectId: project.id,
    status: "success",
    stage: "complete",
    planModel: diagnostics.planModel,
    htmlModel: diagnostics.htmlModel,
    title: d.title,
    purpose: d.purpose,
    targetAudience: d.targetAudience,
    slideStyle: d.slideStyle,
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

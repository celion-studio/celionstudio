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
  beginProjectGenerationForUser,
  createProjectForUser,
  getEbookPageCountForHtml,
  restoreProjectStatusForUser,
  updateProjectWithGeneratedEbook,
} from "@/lib/projects";
import { claimRequestSlot } from "@/lib/request-throttle";
import type { ProjectSource, ProjectStatus } from "@/types/project";

export { parseEbookGenerateRequest } from "@/lib/ebook-generate-request";

function logStageFor(error: unknown) {
  if (!(error instanceof EbookGenerationError)) return "unknown";
  return error.stage ?? "unknown";
}

function logReasonFor(error: unknown) {
  if (!(error instanceof EbookGenerationError)) return undefined;
  return error.reason;
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

function retryAfterResponse(message: string, status: 409 | 429, retryAfterSeconds: number) {
  const response = NextResponse.json({ message }, { status });
  response.headers.set("Retry-After", String(retryAfterSeconds));
  return response;
}

async function restoreGeneratingProjectStatus(
  userId: string,
  projectId: string,
  previousStatus: ProjectStatus,
) {
  try {
    await restoreProjectStatusForUser(userId, projectId, previousStatus);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.warn(`[ebook-generation] status_restore_failed ${JSON.stringify({ projectId, message })}`);
  }
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
  const throttle = claimRequestSlot(`ebook-generate:${session.user.id}`, {
    concurrencyKey: d.projectId
      ? `ebook-generate:project:${d.projectId}`
      : `ebook-generate:user:${session.user.id}`,
    limit: 3,
    windowMs: 15 * 60 * 1000,
  });

  if (!throttle.ok) {
    return retryAfterResponse(throttle.message, throttle.status, throttle.retryAfterSeconds);
  }

  try {
  let previousProjectStatus: ProjectStatus | null = null;

  if (d.projectId) {
    try {
      const claim = await beginProjectGenerationForUser(session.user.id, d.projectId);
      if (!claim.ok) {
        const status = claim.reason === "busy" ? 409 : 404;
        const message = claim.reason === "busy"
          ? "A generation request is already running for this project."
          : "Project not found";
        return status === 409
          ? retryAfterResponse(message, 409, 20)
          : NextResponse.json({ message }, { status });
      }
      previousProjectStatus = claim.previousStatus;
    } catch (error) {
      if (!isDatabaseUnavailableError(error)) {
        throw error;
      }
      return NextResponse.json(
        { message: "Database is temporarily unavailable. Please retry in a moment." },
        { status: 503 },
      );
    }
  }

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
        htmlLength: rendered.html.length,
        slideCount: rendered.validation.slideCount,
      };
    } else {
      const result = await generateEbookHtmlWithDiagnostics(generationArgs);
      html = result.html;
      diagnostics = result.diagnostics;
    }
  } catch (error) {
    if (d.projectId && previousProjectStatus) {
      await restoreGeneratingProjectStatus(session.user.id, d.projectId, previousProjectStatus);
    }

    const message = error instanceof Error ? error.message : "Failed to generate ebook";
    const submittedPlanInvalid = Boolean(d.plan) &&
      error instanceof EbookGenerationError &&
      error.reason === "plan_invalid";
    const status = submittedPlanInvalid
      ? 400
      : error instanceof EbookGenerationError && error.status === 429 ? 429 : 500;
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
      errorReason: logReasonFor(error),
      errorMessage: message,
      errorStatus: status,
      slideCount: error instanceof EbookGenerationError ? error.pageCount : undefined,
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

    if (d.projectId && previousProjectStatus) {
      await restoreGeneratingProjectStatus(session.user.id, d.projectId, previousProjectStatus);
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
      errorReason: "database_unavailable",
      errorMessage: error instanceof Error ? error.message : message,
      errorStatus: 503,
      htmlLength: diagnostics.htmlLength,
      slideCount: diagnostics.slideCount,
    });

    return NextResponse.json({ message }, { status: 503 });
  }

  if (!project) {
    if (d.projectId && previousProjectStatus) {
      await restoreGeneratingProjectStatus(session.user.id, d.projectId, previousProjectStatus);
    }

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
    htmlLength: diagnostics.htmlLength,
    slideCount: diagnostics.slideCount,
  });

  return NextResponse.json({ projectId: project.id, project });
  } finally {
    throttle.release();
  }
}

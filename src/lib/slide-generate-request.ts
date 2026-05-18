import { z } from "zod";
import { EBOOK_STYLE_IDS } from "@/lib/slide-style";
import { SLIDE_FORMATS } from "@/lib/slide-format";
import {
  MAX_EBOOK_PLAN_SLIDES,
  MAX_SOURCE_TEXT_LENGTH,
  MAX_TITLE_LENGTH,
  MIN_EBOOK_PLAN_SLIDES,
  validateSourceLimits,
} from "@/lib/request-limits";
import { formatSourcesForPrompt } from "@/lib/source-ingestion";
import type { SlideGenerationArgs } from "@/lib/slide-generation";
import { SOURCE_KIND_IDS } from "@/types/project";

const MAX_PLAN_LIST_ITEMS = 24;
const MAX_PLAN_ANCHORS = 8;
const MAX_PLAN_SHORT_TEXT_LENGTH = 500;
const MAX_PLAN_LONG_TEXT_LENGTH = 4_000;

const planShortTextSchema = z.string().max(MAX_PLAN_SHORT_TEXT_LENGTH).default("");
const planLongTextSchema = z.string().max(MAX_PLAN_LONG_TEXT_LENGTH).default("");
const planStringListSchema = z.array(planShortTextSchema).max(MAX_PLAN_LIST_ITEMS).default([]);

const sourceSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(SOURCE_KIND_IDS),
  name: z.string().min(1),
  content: z.string().min(1),
  excerpt: z.string().default(""),
});

const planSlideSchema = z.object({
  role: planShortTextSchema,
  eyebrow: planShortTextSchema,
  headline: planShortTextSchema,
  body: planLongTextSchema,
  evidence: planLongTextSchema,
  sourceAnchors: z.array(planShortTextSchema).max(MAX_PLAN_ANCHORS).default([]),
  visualDirection: planLongTextSchema,
});

const planSchema = z.object({
  title: planShortTextSchema,
  subtitle: planShortTextSchema,
  author: planShortTextSchema,
  targetAudience: planShortTextSchema,
  readerPromise: planLongTextSchema,
  language: planShortTextSchema,
  sourceAssessment: z.object({
    sourceScale: planShortTextSchema,
    detectedSections: planStringListSchema,
    essentialSections: planStringListSchema,
    compressionRisk: planShortTextSchema,
    recommendedSlideCount: z.number().int().min(MIN_EBOOK_PLAN_SLIDES).max(MAX_EBOOK_PLAN_SLIDES),
    coveragePlan: planStringListSchema,
    rationale: planLongTextSchema,
  }),
  cover: z.object({
    eyebrow: planShortTextSchema,
    title: planShortTextSchema,
    subtitle: planShortTextSchema,
    promise: planLongTextSchema,
    visualDirection: planLongTextSchema,
  }),
  editorialStrategy: z.object({
    angle: planLongTextSchema,
    readerProblem: planLongTextSchema,
    promisedOutcome: planLongTextSchema,
    narrativeArc: planLongTextSchema,
  }),
  designBrief: z.object({
    mood: planShortTextSchema,
    visualSystem: planLongTextSchema,
    coverConcept: planLongTextSchema,
    layoutRhythm: planLongTextSchema,
    avoid: planStringListSchema,
  }),
  slides: z.array(planSlideSchema).min(MIN_EBOOK_PLAN_SLIDES).max(MAX_EBOOK_PLAN_SLIDES),
});

const schema = z.object({
  projectId: z.string().min(1).optional(),
  title: z.string().min(1),
  author: z.string().default(""),
  purpose: z.string().default(""),
  targetAudience: z.string().default(""),
  tone: z.string().default(""),
  sourceText: z.string().default(""),
  sources: z.array(sourceSchema).default([]),
  ebookStyle: z.enum(EBOOK_STYLE_IDS),
  accentColor: z.string().default("#6366f1"),
  slideFormat: z.enum(["a5_portrait", "16_9_landscape"]).default("a5_portrait"),
  plan: planSchema.optional(),
});

export type SlideGenerateRequestBody = z.infer<typeof schema>;

type ParseGenerateRequestResult =
  | { ok: true; data: SlideGenerateRequestBody }
  | { ok: false; message: string };

function clampNumber(value: unknown, min: number, max: number, fallback?: number) {
  const numericValue = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim()
      ? Number(value)
      : Number.NaN;

  return Number.isFinite(numericValue)
    ? Math.min(max, Math.max(min, Math.round(numericValue)))
    : fallback;
}

function truncateString(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.slice(0, maxLength) : undefined;
}

function truncateStringList(value: unknown) {
  if (!Array.isArray(value)) return undefined;

  return value
    .filter((item): item is string => typeof item === "string")
    .slice(0, MAX_PLAN_LIST_ITEMS)
    .map((item) => item.slice(0, MAX_PLAN_SHORT_TEXT_LENGTH));
}

function normalizeApprovedPlanInput(plan: unknown) {
  if (typeof plan !== "object" || plan === null || Array.isArray(plan)) return plan;

  const record = plan as Record<string, unknown>;
  const sourceAssessment = typeof record.sourceAssessment === "object" && record.sourceAssessment !== null && !Array.isArray(record.sourceAssessment)
    ? record.sourceAssessment as Record<string, unknown>
    : {};
  const cover = typeof record.cover === "object" && record.cover !== null && !Array.isArray(record.cover)
    ? record.cover as Record<string, unknown>
    : {};
  const editorialStrategy = typeof record.editorialStrategy === "object" && record.editorialStrategy !== null && !Array.isArray(record.editorialStrategy)
    ? record.editorialStrategy as Record<string, unknown>
    : {};
  const designBrief = typeof record.designBrief === "object" && record.designBrief !== null && !Array.isArray(record.designBrief)
    ? record.designBrief as Record<string, unknown>
    : {};
  const slides = record.slides;
  const normalizedSlides = Array.isArray(slides)
    ? slides
        .filter((slide): slide is Record<string, unknown> => (
          typeof slide === "object" &&
          slide !== null &&
          !Array.isArray(slide)
        ))
        .slice(0, MAX_EBOOK_PLAN_SLIDES)
        .map((slideRecord) => ({
          ...slideRecord,
          role: truncateString(slideRecord.role, MAX_PLAN_SHORT_TEXT_LENGTH),
          eyebrow: truncateString(slideRecord.eyebrow, MAX_PLAN_SHORT_TEXT_LENGTH),
          headline: truncateString(slideRecord.headline, MAX_PLAN_SHORT_TEXT_LENGTH),
          body: truncateString(slideRecord.body, MAX_PLAN_LONG_TEXT_LENGTH),
          evidence: truncateString(slideRecord.evidence, MAX_PLAN_LONG_TEXT_LENGTH),
          sourceAnchors: truncateStringList(slideRecord.sourceAnchors),
          visualDirection: truncateString(slideRecord.visualDirection, MAX_PLAN_LONG_TEXT_LENGTH),
        }))
    : slides;
  const normalizedSlideCount = Array.isArray(normalizedSlides) ? normalizedSlides.length : undefined;
  const recommendedSlideCount = clampNumber(
    sourceAssessment.recommendedSlideCount,
    MIN_EBOOK_PLAN_SLIDES,
    MAX_EBOOK_PLAN_SLIDES,
    normalizedSlideCount
      ? Math.max(MIN_EBOOK_PLAN_SLIDES, Math.min(MAX_EBOOK_PLAN_SLIDES, normalizedSlideCount))
      : MIN_EBOOK_PLAN_SLIDES,
  );
  const cappedRecommendedSlideCount =
    typeof recommendedSlideCount === "number" && normalizedSlideCount
      ? Math.min(recommendedSlideCount, Math.max(MIN_EBOOK_PLAN_SLIDES, normalizedSlideCount))
      : recommendedSlideCount;

  return {
    ...record,
    title: truncateString(record.title, MAX_PLAN_SHORT_TEXT_LENGTH),
    subtitle: truncateString(record.subtitle, MAX_PLAN_SHORT_TEXT_LENGTH),
    author: truncateString(record.author, MAX_PLAN_SHORT_TEXT_LENGTH),
    targetAudience: truncateString(record.targetAudience, MAX_PLAN_SHORT_TEXT_LENGTH),
    readerPromise: truncateString(record.readerPromise, MAX_PLAN_LONG_TEXT_LENGTH),
    language: truncateString(record.language, MAX_PLAN_SHORT_TEXT_LENGTH),
    sourceAssessment: {
      ...sourceAssessment,
      sourceScale: truncateString(sourceAssessment.sourceScale, MAX_PLAN_SHORT_TEXT_LENGTH),
      detectedSections: truncateStringList(sourceAssessment.detectedSections),
      essentialSections: truncateStringList(sourceAssessment.essentialSections),
      compressionRisk: truncateString(sourceAssessment.compressionRisk, MAX_PLAN_SHORT_TEXT_LENGTH),
      recommendedSlideCount: cappedRecommendedSlideCount,
      coveragePlan: truncateStringList(sourceAssessment.coveragePlan),
      rationale: truncateString(sourceAssessment.rationale, MAX_PLAN_LONG_TEXT_LENGTH),
    },
    cover: {
      ...cover,
      eyebrow: truncateString(cover.eyebrow, MAX_PLAN_SHORT_TEXT_LENGTH),
      title: truncateString(cover.title, MAX_PLAN_SHORT_TEXT_LENGTH),
      subtitle: truncateString(cover.subtitle, MAX_PLAN_SHORT_TEXT_LENGTH),
      promise: truncateString(cover.promise, MAX_PLAN_LONG_TEXT_LENGTH),
      visualDirection: truncateString(cover.visualDirection, MAX_PLAN_LONG_TEXT_LENGTH),
    },
    editorialStrategy: {
      ...editorialStrategy,
      angle: truncateString(editorialStrategy.angle, MAX_PLAN_LONG_TEXT_LENGTH),
      readerProblem: truncateString(editorialStrategy.readerProblem, MAX_PLAN_LONG_TEXT_LENGTH),
      promisedOutcome: truncateString(editorialStrategy.promisedOutcome, MAX_PLAN_LONG_TEXT_LENGTH),
      narrativeArc: truncateString(editorialStrategy.narrativeArc, MAX_PLAN_LONG_TEXT_LENGTH),
    },
    designBrief: {
      ...designBrief,
      mood: truncateString(designBrief.mood, MAX_PLAN_SHORT_TEXT_LENGTH),
      visualSystem: truncateString(designBrief.visualSystem, MAX_PLAN_LONG_TEXT_LENGTH),
      coverConcept: truncateString(designBrief.coverConcept, MAX_PLAN_LONG_TEXT_LENGTH),
      layoutRhythm: truncateString(designBrief.layoutRhythm, MAX_PLAN_LONG_TEXT_LENGTH),
      avoid: truncateStringList(designBrief.avoid),
    },
    slides: normalizedSlides,
  };
}

function validateGenerateRequestLimits(data: SlideGenerateRequestBody): string | null {
  if (data.title.length > MAX_TITLE_LENGTH) {
    return `Title is too long. Maximum is ${MAX_TITLE_LENGTH} characters.`;
  }

  if (data.sources.length === 0 && data.sourceText.length > MAX_SOURCE_TEXT_LENGTH) {
    return `Source text is too long. Maximum is ${MAX_SOURCE_TEXT_LENGTH} characters.`;
  }

  const sourceLimitError = validateSourceLimits(data.sources);
  if (sourceLimitError) return sourceLimitError;

  return null;
}

export async function parseSlideGenerateRequest(
  request: Request,
): Promise<ParseGenerateRequestResult> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return { ok: false, message: "Invalid JSON" };
  }

  const requestBody = typeof json === "object" && json !== null && !Array.isArray(json)
    ? { ...(json as Record<string, unknown>), plan: normalizeApprovedPlanInput((json as Record<string, unknown>).plan) }
    : json;

  const parsed = schema.safeParse(requestBody);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      ok: false,
      message: firstIssue?.path[0] === "plan"
        ? "Plan is too large or invalid."
        : firstIssue?.message ?? "Invalid request",
    };
  }

  const limitError = validateGenerateRequestLimits(parsed.data);
  if (limitError) {
    return { ok: false, message: limitError };
  }

  return { ok: true, data: parsed.data };
}

export function getSlideGenerationArgs(data: SlideGenerateRequestBody): EbookGenerationArgs {
  return {
    title: data.title,
    author: data.author,
    purpose: data.purpose,
    targetAudience: data.targetAudience,
    tone: data.tone,
    sourceText: formatSourcesForPrompt(data.sources, data.sourceText),
    ebookStyle: data.ebookStyle,
    accentColor: data.accentColor,
    slideFormat: data.slideFormat,
  };
}

import { z } from "zod";
import { EBOOK_STYLE_IDS } from "@/lib/ebook-style";
import {
  MAX_SOURCE_TEXT_LENGTH,
  MAX_TITLE_LENGTH,
  validateSourceLimits,
} from "@/lib/request-limits";
import { formatSourcesForPrompt } from "@/lib/source-ingestion";
import type { EbookGenerationArgs } from "@/lib/ebook-generation";
import { SOURCE_KIND_IDS } from "@/types/project";

const MAX_PLAN_SLIDES = 24;
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
    recommendedSlideCount: z.number().int().min(8).max(MAX_PLAN_SLIDES),
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
  slides: z.array(planSlideSchema).min(8).max(MAX_PLAN_SLIDES),
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
  plan: planSchema.optional(),
});

export type EbookGenerateRequestBody = z.infer<typeof schema>;

type ParseGenerateRequestResult =
  | { ok: true; data: EbookGenerateRequestBody }
  | { ok: false; message: string };

function validateGenerateRequestLimits(data: EbookGenerateRequestBody): string | null {
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

export function getEbookGenerationArgs(data: EbookGenerateRequestBody): EbookGenerationArgs {
  return {
    title: data.title,
    author: data.author,
    purpose: data.purpose,
    targetAudience: data.targetAudience,
    tone: data.tone,
    sourceText: formatSourcesForPrompt(data.sources, data.sourceText),
    ebookStyle: data.ebookStyle,
    accentColor: data.accentColor,
  };
}

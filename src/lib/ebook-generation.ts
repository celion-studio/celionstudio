import {
  EBOOK_BLUEPRINT_GEMINI_MODEL,
  EBOOK_GEMINI_MODEL,
  GeminiProviderError,
  generateJsonWithGemini,
} from "@/lib/ai/gemini";
import {
  normalizeEbookHtmlSlideContract,
  sanitizeEbookHtmlForCanvas,
  validateCelionSlideHtml,
} from "@/lib/ebook-html";
import type { EbookStyle } from "@/types/project";

const EBOOK_WIDTH_PX = 559;
const EBOOK_HEIGHT_PX = 794;
const BLUEPRINT_MODEL = EBOOK_BLUEPRINT_GEMINI_MODEL;

const STYLE_PROMPTS: Record<EbookStyle, string> = {
  minimal: "quiet Swiss editorial system, white space, hairline rules, precise labels, restrained accent use",
  editorial: "magazine/report system, confident typographic hierarchy, pull quotes, chapter rhythm, asymmetric editorial grid",
  "neo-brutalism": "raw high-contrast system, hard borders, monospace details, sticker-like labels, practical code/prompt surfaces",
  bold: "oversized type, decisive contrast, energetic pacing, strong color blocks, confident editorial impact",
  elegant: "refined publishing system, serif-led hierarchy, quiet frames, warm paper, subtle proof and note components",
};

const TONE_PROMPTS: Record<string, string> = {
  preserve: "preserve the source's voice and terminology unless clarity requires light editing",
  clear: "make the writing clear, concise, and easy to scan",
  practical: "make the writing direct, useful, and action-oriented",
  editorial: "shape the writing like a polished nonfiction magazine feature",
  friendly: "make the writing warm, approachable, and easy to keep reading",
};

type EbookGenerationArgs = {
  title: string;
  author: string;
  purpose: string;
  targetAudience: string;
  tone?: string;
  sourceText: string;
  ebookStyle: EbookStyle;
  accentColor: string;
};

type EbookBlueprintSlide = {
  role: string;
  eyebrow: string;
  headline: string;
  body: string;
  evidence: string;
  sourceAnchors: string[];
  visualDirection: string;
};

type EbookBlueprint = {
  title: string;
  subtitle: string;
  author: string;
  targetAudience: string;
  readerPromise: string;
  language: string;
  cover: {
    eyebrow: string;
    title: string;
    subtitle: string;
    promise: string;
    visualDirection: string;
  };
  editorialStrategy: {
    angle: string;
    readerProblem: string;
    promisedOutcome: string;
    narrativeArc: string;
  };
  designBrief: {
    mood: string;
    visualSystem: string;
    coverConcept: string;
    layoutRhythm: string;
    avoid: string[];
  };
  slides: EbookBlueprintSlide[];
};

export type EbookGenerationDiagnostics = {
  blueprintModel: string;
  htmlModel: string;
  blueprint: EbookBlueprint;
  validation: ReturnType<typeof validateUsableEbookHtml>;
  htmlLength: number;
  slideCount: number;
};

const BLUEPRINT_SYSTEM = `You are a senior editorial strategist for source-led A5 slide publications.

Create the plan and copy before design. Do not write HTML.
Use the source material as the main authority: extract its argument, examples, numbers, vocabulary, method, warnings, and proof.
The output must be a specific A5 slide publication blueprint, not a generic outline.
The publication may be for selling, teaching, explaining, organizing expertise, or reporting. Do not assume a sales funnel unless the purpose says so.
Return JSON only.`;

const HTML_SYSTEM = `You are a world-class A5 HTML/CSS slide publication designer.

You receive an approved editorial blueprint.
Do not invent a new structure. Do not rename slide headlines. Do not add generic outline pages.
Your job is to turn the blueprint into a beautiful finished A5 HTML/CSS slide document with strong layout variety and editorial taste.
Return JSON only: { "html": "<complete html document string>" }`;

function tonePromptFor(tone?: string) {
  return TONE_PROMPTS[tone ?? ""] ?? tone ?? "use the best tone for the source and reader";
}

function buildBlueprintPrompt(args: EbookGenerationArgs): string {
  const stylePrompt = STYLE_PROMPTS[args.ebookStyle];

  return `Create a source-led A5 slide publication blueprint.

Reader and purpose brief:
- Working title: ${args.title}
- Author / brand: ${args.author || "not specified"}
- Primary reader: ${args.targetAudience || "not specified"}
- Purpose / use case: ${args.purpose || "not specified"}
- Writing tone: ${tonePromptFor(args.tone)}
- Visual mood: ${args.ebookStyle} (${stylePrompt})
- Accent color: ${args.accentColor}

Source material:
${args.sourceText.slice(0, 36000) || "(no source provided)"}

Blueprint requirements:
- Make 8-14 slides total.
- Every slide headline must be specific and reader-facing.
- Do not use abstract planning labels, generic section names, or numbered duplicate titles.
- Cover copy must be rewritten as a strong publication concept for the stated purpose, not a paste of the brief fields.
- Use Korean for visible reader-facing copy when the source or brief is Korean.
- Include practical substance from the source: examples, steps, distinctions, numbers, scripts, or checklists where supported.
- Include design direction per slide, but do not write CSS or HTML.

Return JSON in exactly this shape:
{
  "title": "final publication title",
  "subtitle": "specific subtitle",
  "author": "author or brand",
  "targetAudience": "specific reader",
  "readerPromise": "reader-facing purpose, promise, or outcome",
  "language": "primary visible language",
  "cover": {
    "eyebrow": "short category cue",
    "title": "cover title",
    "subtitle": "cover subtitle",
    "promise": "clear cover promise",
    "visualDirection": "cover composition direction"
  },
  "editorialStrategy": {
    "angle": "specific editorial angle",
    "readerProblem": "problem the reader recognizes",
    "promisedOutcome": "result after reading",
    "narrativeArc": "how the slides should progress"
  },
  "designBrief": {
    "mood": "design mood",
    "visualSystem": "typography, spacing, component, and color strategy",
    "coverConcept": "how the cover should avoid looking templated",
    "layoutRhythm": "how layouts should vary across slides",
    "avoid": ["things the designer must avoid"]
  },
  "slides": [
    {
      "role": "cover | opener | problem | insight | framework | example | checklist | template | proof | transition | cta",
      "eyebrow": "optional short useful label, not generic chrome",
      "headline": "specific slide headline",
      "body": "80-170 words of finished slide copy",
      "evidence": "source-backed detail, example, quote, number, or method",
      "sourceAnchors": ["specific source phrase, example, term, number, or claim used on this slide"],
      "visualDirection": "specific layout/composition direction"
    }
  ]
}`;
}

function buildHtmlPrompt(args: EbookGenerationArgs, blueprint: EbookBlueprint): string {
  const stylePrompt = STYLE_PROMPTS[args.ebookStyle];

  return `Render this approved blueprint as a finished A5 HTML/CSS slide publication.

Design inputs:
- Visual mood: ${args.ebookStyle} (${stylePrompt})
- Accent color: ${args.accentColor}
- Page size: ${EBOOK_WIDTH_PX}px x ${EBOOK_HEIGHT_PX}px

Approved blueprint:
${JSON.stringify(blueprint, null, 2)}

Design direction:
- Follow the blueprint structure and slide order exactly.
- Do not rename slide headlines.
- Use visual hierarchy, spacing, rules, side notes, pull quotes, small tables, timelines, checklists, and typographic contrast when they clarify the content.
- Make the cover feel intentionally designed for this source, not a fixed slot template.
- Vary layouts across slides. Avoid repeating the same header, eyebrow, title, body, box pattern.
- Use the accent color as an accent, not the whole palette.
- If a header, footer, or eyebrow repeats the headline or adds no value, omit it.
- Give every slide deliberate breathing room. Prefer fewer, clearer blocks over dense packing.
- Keep at least 24px vertical space between major content groups, and at least 14px between a heading and its body.
- Keep boxed callouts, lists, captions, and following headings visually separated; never let a box sit directly against the next heading or paragraph.
- Use comfortable Korean/English body typography: line-height 1.55-1.75 for paragraphs and lists, with paragraph margins that make separate ideas visibly distinct.
- If content feels crowded, shorten the copy, split the idea across another slide, or use a simpler layout. Do not reduce spacing to make everything fit.
- Avoid tiny text. Body copy should generally be 14px or larger, and dense notes should still remain readable.

Technical contract:
- Output only JSON with one "html" field.
- Single complete HTML document with one <style> block in <head>.
- Use <div class="slide" data-slide="N"> for every slide.
- Each .slide must be exactly ${EBOOK_WIDTH_PX}px x ${EBOOK_HEIGHT_PX}px and overflow: hidden.
- Use @page size 148mm 210mm, zero page margin, and page-break-after/break-after on every .slide.
- Use only browser-safe CSS colors: hex, rgb, rgba, hsl, hsla, named colors, or variables that resolve to those values.
- Do not use color(), color-mix(), oklch(), lab(), or lch().
- No placeholders, lorem ipsum, markdown fences, scripts, external assets, or generic filler.
- Keep all text readable inside the fixed A5 page.`;
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function stringArrayValue(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim())
    : [];
}

function normalizeBlueprint(raw: unknown, args: EbookGenerationArgs): EbookBlueprint {
  if (typeof raw !== "object" || raw === null) {
    throw new EbookGenerationError("blueprint_invalid", "Gemini Flash did not return an ebook blueprint object.");
  }

  const record = raw as Record<string, unknown>;
  const cover = typeof record.cover === "object" && record.cover !== null
    ? record.cover as Record<string, unknown>
    : {};
  const editorialStrategy = typeof record.editorialStrategy === "object" && record.editorialStrategy !== null
    ? record.editorialStrategy as Record<string, unknown>
    : {};
  const designBrief = typeof record.designBrief === "object" && record.designBrief !== null
    ? record.designBrief as Record<string, unknown>
    : {};
  const slides = Array.isArray(record.slides) ? record.slides : [];

  const normalizedSlides = slides
    .map((slide): EbookBlueprintSlide | null => {
      if (typeof slide !== "object" || slide === null) return null;
      const slideRecord = slide as Record<string, unknown>;
      const headline = stringValue(slideRecord.headline);
      const body = stringValue(slideRecord.body);
      if (!headline || !body) return null;
      return {
        role: stringValue(slideRecord.role, "insight"),
        eyebrow: stringValue(slideRecord.eyebrow),
        headline,
        body,
        evidence: stringValue(slideRecord.evidence),
        sourceAnchors: stringArrayValue(slideRecord.sourceAnchors),
        visualDirection: stringValue(slideRecord.visualDirection),
      };
    })
    .filter((slide): slide is EbookBlueprintSlide => Boolean(slide));

  if (normalizedSlides.length < 8) {
    throw new EbookGenerationError(
      "blueprint_invalid",
      `Gemini Flash returned an ebook blueprint with only ${normalizedSlides.length} usable slides.`,
    );
  }

  return {
    title: stringValue(record.title, args.title),
    subtitle: stringValue(record.subtitle),
    author: stringValue(record.author, args.author || "Celion"),
    targetAudience: stringValue(record.targetAudience, args.targetAudience),
    readerPromise: stringValue(record.readerPromise, args.purpose),
    language: stringValue(record.language, "source language"),
    cover: {
      eyebrow: stringValue(cover.eyebrow),
      title: stringValue(cover.title, stringValue(record.title, args.title)),
      subtitle: stringValue(cover.subtitle, stringValue(record.subtitle)),
      promise: stringValue(cover.promise, args.purpose),
      visualDirection: stringValue(cover.visualDirection),
    },
    editorialStrategy: {
      angle: stringValue(editorialStrategy.angle),
      readerProblem: stringValue(editorialStrategy.readerProblem),
      promisedOutcome: stringValue(editorialStrategy.promisedOutcome),
      narrativeArc: stringValue(editorialStrategy.narrativeArc),
    },
    designBrief: {
      mood: stringValue(designBrief.mood, STYLE_PROMPTS[args.ebookStyle]),
      visualSystem: stringValue(designBrief.visualSystem),
      coverConcept: stringValue(designBrief.coverConcept),
      layoutRhythm: stringValue(designBrief.layoutRhythm),
      avoid: stringArrayValue(designBrief.avoid),
    },
    slides: normalizedSlides,
  };
}

function validateUsableEbookHtml(html: string) {
  return validateCelionSlideHtml(html, {
    minSlides: 8,
    minVisibleTextLength: 500,
    allowGenericOutlineHeadings: true,
  });
}

type EbookFailureReason = "gemini_call_failed" | "missing_html" | "invalid_html" | "blueprint_invalid";

export class EbookGenerationError extends Error {
  readonly reason: EbookFailureReason;
  readonly status?: number;

  constructor(reason: EbookFailureReason, message: string, options: { status?: number } = {}) {
    super(message);
    this.name = "EbookGenerationError";
    this.reason = reason;
    this.status = options.status;
  }
}

function errorDetails(error: unknown) {
  if (typeof error !== "object" || error === null) return undefined;

  const record = error as Record<string, unknown>;
  const errorMessage = error instanceof Error
    ? error.message.replace(/\s+/g, " ").slice(0, 500)
    : undefined;

  return {
    errorName: error instanceof Error ? error.name : undefined,
    errorCode: typeof record.code === "string" ? record.code : undefined,
    status: typeof record.status === "number" ? record.status : undefined,
    errorMessage,
  };
}

function warnEbookGenerationFailure(reason: EbookFailureReason, details: Record<string, unknown> = {}) {
  console.warn(`[ebook-generation] generation_failed ${JSON.stringify({
    reason,
    ...details,
  })}`);
}

function failGeneration(
  reason: EbookFailureReason,
  message: string,
  options: { status?: number } = {},
): never {
  throw new EbookGenerationError(reason, message, options);
}

async function generateEbookBlueprint(args: EbookGenerationArgs) {
  try {
    const raw = await generateJsonWithGemini({
      system: BLUEPRINT_SYSTEM,
      user: buildBlueprintPrompt(args),
      model: BLUEPRINT_MODEL,
      temperature: 0.75,
    });
    return normalizeBlueprint(raw, args);
  } catch (error) {
    if (error instanceof EbookGenerationError) {
      warnEbookGenerationFailure(error.reason, { stage: "blueprint" });
      throw error;
    }

    const details = errorDetails(error);
    warnEbookGenerationFailure("gemini_call_failed", { stage: "blueprint", ...details });
    const status = error instanceof GeminiProviderError ? error.status : undefined;
    return failGeneration(
      "gemini_call_failed",
      status === 429
        ? "Gemini rate limit was reached while planning the ebook. Please wait a bit and try again."
        : "AI ebook planning failed before Gemini returned a usable blueprint.",
      { status },
    );
  }
}

async function generateEbookHtmlFromBlueprint(args: EbookGenerationArgs, blueprint: EbookBlueprint) {
  let raw: unknown;
  try {
    raw = await generateJsonWithGemini({
      system: HTML_SYSTEM,
      user: buildHtmlPrompt(args, blueprint),
      model: EBOOK_GEMINI_MODEL,
      temperature: 1,
    });
  } catch (error) {
    const details = errorDetails(error);
    warnEbookGenerationFailure("gemini_call_failed", { stage: "html", ...details });
    const status = error instanceof GeminiProviderError ? error.status : undefined;
    return failGeneration(
      "gemini_call_failed",
      status === 429
        ? "Gemini rate limit was reached while designing the ebook. Please wait a bit and try again."
        : "AI ebook generation failed before Gemini returned a usable design.",
      { status },
    );
  }

  const result = raw as { html?: unknown };
  if (!result?.html || typeof result.html !== "string") {
    warnEbookGenerationFailure("missing_html", { stage: "html", htmlType: typeof result?.html });
    return failGeneration("missing_html", "Gemini did not return an HTML document.");
  }

  const sanitizedHtml = normalizeEbookHtmlSlideContract(sanitizeEbookHtmlForCanvas(result.html));
  const validation = validateUsableEbookHtml(sanitizedHtml);
  if (!validation.ok) {
    warnEbookGenerationFailure("invalid_html", {
      stage: "html",
      validationErrors: validation.errors,
      slideCount: validation.slideCount,
    });
    return failGeneration(
      "invalid_html",
      `Gemini returned HTML, but it did not pass Celion ebook validation: ${validation.errors.join(" ")}`,
    );
  }

  return {
    html: sanitizedHtml,
    validation,
  };
}

export async function generateEbookHtml(args: EbookGenerationArgs): Promise<string> {
  const result = await generateEbookHtmlWithDiagnostics(args);
  return result.html;
}

export async function generateEbookHtmlWithDiagnostics(
  args: EbookGenerationArgs,
): Promise<{ html: string; diagnostics: EbookGenerationDiagnostics }> {
  const blueprint = await generateEbookBlueprint(args);
  const { html, validation } = await generateEbookHtmlFromBlueprint(args, blueprint);
  return {
    html,
    diagnostics: {
      blueprintModel: BLUEPRINT_MODEL,
      htmlModel: EBOOK_GEMINI_MODEL,
      blueprint,
      validation,
      htmlLength: html.length,
      slideCount: validation.slideCount,
    },
  };
}

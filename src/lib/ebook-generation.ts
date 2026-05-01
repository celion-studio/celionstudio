import {
  EBOOK_BLUEPRINT_GEMINI_MODEL,
  EBOOK_GEMINI_MODEL,
  GeminiProviderError,
  generateJsonWithGemini,
} from "@/lib/ai/gemini";
import { validateCelionSlideHtml } from "@/lib/ebook-html";
import { EBOOK_PAGE_SIZE_CSS_PX, EBOOK_PAGE_SIZE_PX } from "@/lib/ebook-format";
import { EBOOK_STYLE_PROMPTS } from "@/lib/ebook-style";
import {
  compileEbookDocumentToHtml,
  normalizeEbookDocument,
  sanitizeEbookDocument,
  validateEbookDocument,
  type CelionEbookDocument,
} from "@/lib/ebook-document";
import type { EbookStyle } from "@/types/project";

const BLUEPRINT_MODEL = EBOOK_BLUEPRINT_GEMINI_MODEL;

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
  sourceAssessment: {
    sourceScale: string;
    detectedSections: string[];
    essentialSections: string[];
    compressionRisk: string;
    recommendedSlideCount: number;
    coveragePlan: string[];
    rationale: string;
  };
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
  ebookDocument: CelionEbookDocument;
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
Return JSON only: { "document": { "version": 1, "size": { "width": ${EBOOK_PAGE_SIZE_PX.width}, "height": ${EBOOK_PAGE_SIZE_PX.height}, "unit": "px" }, "title": "publication title", "themeCss": "", "pages": [] } }`;

function tonePromptFor(tone?: string) {
  return TONE_PROMPTS[tone ?? ""] ?? tone ?? "use the best tone for the source and reader";
}

function estimateSlideBudgetForSource(sourceText: string) {
  const trimmedSource = sourceText.trim();
  const sourceChars = trimmedSource.length;
  const detectedSections = (trimmedSource.match(/^#{1,3}\s+\S/gm) ?? []).length;

  if (sourceChars >= 12000 || detectedSections >= 18) {
    return { min: 18, max: 22, detectedSections, sourceChars };
  }

  if (sourceChars >= 7000 || detectedSections >= 10) {
    return { min: 14, max: 18, detectedSections, sourceChars };
  }

  if (sourceChars >= 3000 || detectedSections >= 5) {
    return { min: 12, max: 16, detectedSections, sourceChars };
  }

  return { min: 10, max: 14, detectedSections, sourceChars };
}

function buildBlueprintPrompt(args: EbookGenerationArgs): string {
  const stylePrompt = EBOOK_STYLE_PROMPTS[args.ebookStyle];
  const slideBudget = estimateSlideBudgetForSource(args.sourceText);

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
- Recommended slide budget: ${slideBudget.min}-${slideBudget.max} slides.
- Source scale: ${slideBudget.sourceChars} characters, ${slideBudget.detectedSections} detected sections/headings.
- First assess the source, then decide the page count. The blueprint must choose recommendedSlideCount after assessing the source, not before.
- The slides array should contain approximately recommendedSlideCount slides. If you recommend 20 slides, do not return 10.
- Do not compress a long source into 10 slides. If the source has many sections, examples, steps, or warnings, preserve coverage by using the higher end of the recommended budget.
- Cover the source's major sections and methods before summarizing. It is better to make a focused 18-22 slide guide than to discard useful material for artificial brevity.
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
  "sourceAssessment": {
    "sourceScale": "short | medium | long | very_long",
    "detectedSections": ["major source sections, chapters, topics, or methods detected"],
    "essentialSections": ["source sections or methods that must be represented in the final publication"],
    "compressionRisk": "low | medium | high",
    "recommendedSlideCount": 10,
    "coveragePlan": ["how the slides will preserve the source without over-compressing it"],
    "rationale": "why this slide count fits the source and purpose"
  },
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
  const stylePrompt = EBOOK_STYLE_PROMPTS[args.ebookStyle];

  return `Render this approved blueprint as a finished A5 HTML/CSS slide publication.

Design inputs:
- Visual mood: ${args.ebookStyle} (${stylePrompt})
- Accent color: ${args.accentColor}
- Page size: ${EBOOK_PAGE_SIZE_CSS_PX}

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
- Output only JSON with one "document" field.
- Generate all pages in one response. Do not require page-by-page calls.
- The document must have version: 1, title, size: { width: ${EBOOK_PAGE_SIZE_PX.width}, height: ${EBOOK_PAGE_SIZE_PX.height}, unit: "px" }, themeCss, and pages.
- themeCss may be empty or contain only a single :root block with CSS custom properties such as --accent. Do not put selectors, layout rules, imports, or page styles in themeCss.
- Each page includes id, index, title, role, html, css, manifest, and version.
- Each page html has root <section data-celion-page="{pageId}" class="celion-page">.
- Every editable text, shape, image, and container has data-celion-id, data-role, and data-editable="true".
- Never put style="" attributes in HTML. Put every visual rule in the page css field.
- Every page CSS selector starts with [data-celion-page="{pageId}"].
- Do not use script, iframe, object, embed, form, input, textarea, button, video, audio, canvas, external JS, or external CSS.
- Do not use url(), @import, @keyframes, animations, transitions, or markup-like tokens inside CSS.
- Do not use global selectors like html, body, *, h1, p, div, span, section, or unscoped class selectors.
- Manifest includes every editable element.
- Use page CSS to make each [data-celion-page="{pageId}"] exactly ${EBOOK_PAGE_SIZE_CSS_PX} and overflow: hidden.
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
  const sourceAssessment = typeof record.sourceAssessment === "object" && record.sourceAssessment !== null
    ? record.sourceAssessment as Record<string, unknown>
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

  const promptSlideBudget = estimateSlideBudgetForSource(args.sourceText);
  const rawRecommendedSlideCount = typeof sourceAssessment.recommendedSlideCount === "number" && Number.isFinite(sourceAssessment.recommendedSlideCount)
    ? Math.round(sourceAssessment.recommendedSlideCount)
    : Math.min(promptSlideBudget.max, Math.max(promptSlideBudget.min, normalizedSlides.length));
  const recommendedSlideCount = Math.min(24, Math.max(8, rawRecommendedSlideCount));
  if (normalizedSlides.length < recommendedSlideCount - 2) {
    throw new EbookGenerationError(
      "blueprint_invalid",
      `Gemini Flash recommended ${recommendedSlideCount} slides but only returned ${normalizedSlides.length} usable slides.`,
      { stage: "blueprint" },
    );
  }

  return {
    title: stringValue(record.title, args.title),
    subtitle: stringValue(record.subtitle),
    author: stringValue(record.author, args.author || "Celion"),
    targetAudience: stringValue(record.targetAudience, args.targetAudience),
    readerPromise: stringValue(record.readerPromise, args.purpose),
    language: stringValue(record.language, "source language"),
    sourceAssessment: {
      sourceScale: stringValue(sourceAssessment.sourceScale, "medium"),
      detectedSections: stringArrayValue(sourceAssessment.detectedSections),
      essentialSections: stringArrayValue(sourceAssessment.essentialSections),
      compressionRisk: stringValue(sourceAssessment.compressionRisk, "medium"),
      recommendedSlideCount,
      coveragePlan: stringArrayValue(sourceAssessment.coveragePlan),
      rationale: stringValue(sourceAssessment.rationale),
    },
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
      mood: stringValue(designBrief.mood, EBOOK_STYLE_PROMPTS[args.ebookStyle]),
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
type EbookGenerationStage = "blueprint" | "html";
type EbookGenerationErrorOptions = {
  status?: number;
  stage?: EbookGenerationStage;
  validation?: unknown;
  pageCount?: number;
};

export class EbookGenerationError extends Error {
  readonly reason: EbookFailureReason;
  readonly status?: number;
  readonly stage?: EbookGenerationStage;
  readonly validation?: unknown;
  readonly pageCount?: number;

  constructor(reason: EbookFailureReason, message: string, options: EbookGenerationErrorOptions = {}) {
    super(message);
    this.name = "EbookGenerationError";
    this.reason = reason;
    this.status = options.status;
    this.stage = options.stage;
    this.validation = options.validation;
    this.pageCount = options.pageCount;
  }
}

function errorDetails(error: unknown) {
  if (typeof error !== "object" || error === null) return undefined;

  const record = error as Record<string, unknown>;

  return {
    errorName: error instanceof Error ? error.name : undefined,
    errorCode: typeof record.code === "string" ? record.code : undefined,
    status: typeof record.status === "number" ? record.status : undefined,
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
  options: EbookGenerationErrorOptions = {},
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
      { status, stage: "blueprint" },
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
      { status, stage: "html" },
    );
  }

  const result = raw as { document?: unknown };
  if (!result?.document || typeof result.document !== "object") {
    warnEbookGenerationFailure("missing_html", { stage: "html", documentType: typeof result?.document });
    return failGeneration("missing_html", "Gemini did not return an ebook document.", { stage: "html" });
  }

  const ebookDocument = sanitizeEbookDocument(normalizeEbookDocument(result.document));
  const documentValidation = validateEbookDocument(ebookDocument);
  if (!documentValidation.ok) {
    warnEbookGenerationFailure("invalid_html", {
      stage: "html",
      documentValidationErrors: documentValidation.errors,
      pageCount: ebookDocument.pages.length,
    });
    return failGeneration(
      "invalid_html",
      `Gemini returned an ebook document, but it did not pass Celion document validation: ${documentValidation.errors[0] ?? "Unknown document validation error."}`,
      {
        stage: "html",
        validation: {
          ok: false,
          errors: documentValidation.errors,
          pageCount: ebookDocument.pages.length,
        },
        pageCount: ebookDocument.pages.length,
      },
    );
  }

  const html = compileEbookDocumentToHtml(ebookDocument);
  const validation = validateUsableEbookHtml(html);
  if (!validation.ok) {
    warnEbookGenerationFailure("invalid_html", {
      stage: "html",
      validationErrors: validation.errors,
      slideCount: validation.slideCount,
    });
    return failGeneration(
      "invalid_html",
      `Gemini returned HTML, but it did not pass Celion ebook validation: ${validation.errors.join(" ")}`,
      {
        stage: "html",
        validation,
        pageCount: validation.slideCount,
      },
    );
  }

  return {
    html,
    validation,
    ebookDocument,
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
  const { html, validation, ebookDocument } = await generateEbookHtmlFromBlueprint(args, blueprint);
  return {
    html,
    diagnostics: {
      blueprintModel: BLUEPRINT_MODEL,
      htmlModel: EBOOK_GEMINI_MODEL,
      blueprint,
      ebookDocument,
      validation,
      htmlLength: html.length,
      slideCount: validation.slideCount,
    },
  };
}

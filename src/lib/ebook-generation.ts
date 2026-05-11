import {
  EBOOK_GEMINI_MODEL,
  EBOOK_PLAN_GEMINI_MODEL,
  GeminiProviderError,
  generateJsonWithGemini,
} from "@/lib/ai/gemini";
import {
  validateCelionSlideHtml,
} from "@/lib/ebook-html";
import { EBOOK_PAGE_SIZE_CSS_PX, EBOOK_PAGE_SIZE_PX } from "@/lib/ebook-format";
import { EBOOK_STYLE_PROMPTS } from "@/lib/ebook-style";
import {
  compileEbookDocumentToHtml,
  normalizeEbookDocument,
  sanitizeEbookDocument,
  validateEbookDocument,
  type CelionEbookDocument,
  type CelionEbookPage,
} from "@/lib/ebook-document";
import {
  MAX_EBOOK_PLAN_SLIDES,
  MIN_EBOOK_PLAN_SLIDES,
} from "@/lib/request-limits";
import type { EbookStyle } from "@/types/project";

const PLAN_MODEL = EBOOK_PLAN_GEMINI_MODEL;

const TONE_PROMPTS: Record<string, string> = {
  preserve: "preserve the source's voice and terminology unless clarity requires light editing",
  clear: "make the writing clear, concise, and easy to scan",
  practical: "make the writing direct, useful, and action-oriented",
  editorial: "shape the writing like a polished nonfiction magazine feature",
  friendly: "make the writing warm, approachable, and easy to keep reading",
};

export type EbookGenerationArgs = {
  title: string;
  author: string;
  purpose: string;
  targetAudience: string;
  tone?: string;
  sourceText: string;
  ebookStyle: EbookStyle;
  accentColor: string;
};

export type EbookPlanSlide = {
  role: string;
  eyebrow: string;
  headline: string;
  body: string;
  evidence: string;
  sourceAnchors: string[];
  visualDirection: string;
};

export type EbookPlan = {
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
  slides: EbookPlanSlide[];
};

export type EbookGenerationDiagnostics = {
  planModel: string;
  htmlModel: string;
  plan: EbookPlan;
  ebookDocument: CelionEbookDocument;
  validation: ReturnType<typeof validateUsableEbookHtml>;
  generationTrace: EbookGenerationBatchTrace[];
  htmlLength: number;
  slideCount: number;
};

export type EbookGenerationBatchTrace = {
  stage: "html";
  batchNumber: number;
  batchCount: number;
  slideStart: number;
  slideEnd: number;
  totalSlides: number;
  requestedSlideCount: number;
  model: string;
  promptLength: number;
  slideHeadlines: string[];
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  status: "started" | "success" | "failure";
  pageCount?: number;
  pageTitles?: string[];
  errorReason?: string;
  errorMessage?: string;
  errorStatus?: number;
};

const PLAN_SYSTEM = `You are a senior editorial strategist for source-led A5 slide publications.

Create the plan and copy before design. Do not write HTML.
Use the source material as the main authority: extract its argument, examples, numbers, vocabulary, method, warnings, and proof.
The output must be a specific A5 slide publication plan, not a generic outline.
The publication may be for selling, teaching, explaining, organizing expertise, or reporting. Do not assume a sales funnel unless the purpose says so.
Return JSON only.`;

const HTML_SYSTEM = `You are a world-class A5 HTML/CSS slide publication designer.

You receive an approved editorial plan.
Do not invent a new structure. Do not rename slide headlines. Do not add generic outline pages.
Your job is to turn the plan into a beautiful finished A5 HTML/CSS slide document with strong layout variety and editorial taste.
Return JSON only: { "document": { "version": 1, "size": { "width": ${EBOOK_PAGE_SIZE_PX.width}, "height": ${EBOOK_PAGE_SIZE_PX.height}, "unit": "px" }, "title": "publication title", "themeCss": "", "pages": [] } }`;

const PAGE_SYSTEM = `You are a world-class A5 HTML/CSS slide publication designer.

You receive an existing Celion ebook document context and must add exactly one new page that fits the surrounding publication.
Return JSON only: { "page": { "id": "page id", "index": 0, "title": "page title", "role": "page role", "html": "", "css": "", "version": 1 } }`;

function tonePromptFor(tone?: string) {
  return TONE_PROMPTS[tone ?? ""] ?? tone ?? "use the best tone for the source and reader";
}

function buildPlanPrompt(args: EbookGenerationArgs): string {
  const stylePrompt = EBOOK_STYLE_PROMPTS[args.ebookStyle];

  return `Create a source-led A5 slide publication plan.

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

Plan requirements:
- Make 8-14 slides total in one self-contained deck. Do not expand into chapters, batches, appendices, or overflow pages.
- Every slide headline must be specific and reader-facing.
- Do not use abstract planning labels, generic section names, or numbered duplicate titles.
- Cover copy must be rewritten as a strong publication concept for the stated purpose, not a paste of the brief fields.
- Include practical substance from the source: examples, steps, distinctions, numbers, scripts, or checklists where supported.
- Each slide visualDirection must name a concrete visual device, such as an evidence box, three-column framework grid, split comparison, timeline bar, protocol list, roadmap, category bar, score marker, annotated quote, or checklist system.
- Across the deck, do not allow more than two text-led pages in a row; regularly plan grid, comparison, timeline, evidence-box, or checklist pages.
- Avoid vague visualDirection values like "clean typography" or "modern layout". Do not write CSS or HTML in the plan.

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

function planForHtmlPrompt(plan: EbookPlan) {
  return {
    title: plan.title,
    subtitle: plan.subtitle,
    author: plan.author,
    targetAudience: plan.targetAudience,
    readerPromise: plan.readerPromise,
    language: plan.language,
    cover: plan.cover,
    editorialStrategy: plan.editorialStrategy,
    designBrief: plan.designBrief,
    slides: plan.slides,
  };
}

function buildHtmlPrompt(args: EbookGenerationArgs, plan: EbookPlan): string {
  const stylePrompt = EBOOK_STYLE_PROMPTS[args.ebookStyle];

  return `Render this approved plan as a finished A5 HTML/CSS slide publication.

Design inputs:
- Visual mood: ${args.ebookStyle} (${stylePrompt})
- Accent color: ${args.accentColor}
- Page size: ${EBOOK_PAGE_SIZE_CSS_PX}

Approved plan:
${JSON.stringify(planForHtmlPrompt(plan), null, 2)}

Design direction:
- Follow the plan structure and slide order exactly.
- Do not rename slide headlines.
- Treat each page like a polished editorial card, not a plain document page.
- Honor each slide visualDirection with actual CSS-drawn structure, not just prose.
- Every non-cover page must express one primary structural device in CSS, such as a grid, comparison, timeline, evidence box, checklist, scorecard, matrix, or annotated quote.
- Use visual hierarchy, spacing, rules, side notes, pull quotes, small tables, timelines, checklists, diagrams, badges, numbered systems, comparison blocks, and typographic contrast as concrete page structure, not decoration.
- Each page should have one memorable visual idea: a strong typographic composition, structured framework, comparison, timeline, evidence card, checklist, or editorial diagram.
- Make the cover feel intentionally designed for this source, not a fixed slot template.
- Vary layouts across slides. Avoid repeating the same header, eyebrow, title, body, box pattern.
- Across the first 10 pages, use at least five distinct layout families. Reuse typography, spacing, and color as the system; do not reuse the same layout skeleton.
- Do not reuse the same "headline + paragraph + one box" skeleton on consecutive pages.
- Avoid large empty rectangles, generic gradient panels, and flat text-only pages unless the slide is intentionally acting as a dramatic pause.
- For framework and example pages, create concrete visual structures instead of paragraph-only layouts.
- Use the accent color as an accent, not the whole palette.
- If a header, footer, or eyebrow repeats the headline or adds no value, omit it.
- Give every slide deliberate breathing room. Prefer fewer, clearer blocks over dense packing.
- Keep at least 24px vertical space between major content groups, and at least 14px between a heading and its body.
- Keep boxed callouts, lists, captions, and following headings visually separated; never let a box sit directly against the next heading or paragraph.
- Use comfortable body typography: line-height 1.55-1.75 for paragraphs and lists, with paragraph margins that make separate ideas visibly distinct.
- If content feels crowded, trim non-essential copy or simplify the device. Never add pages, merge slides, or fall back to a plain article layout. Do not reduce spacing to make everything fit.
- Avoid tiny text. Body copy should generally be 14px or larger, and dense notes should still remain readable.

Technical contract:
- Output only JSON with one "document" field.
- Generate all pages in one response. Do not require page-by-page calls.
- Generate exactly ${plan.slides.length} pages: one page per approved slide, no more and no fewer.
- The document must have version: 1, title, size: { width: ${EBOOK_PAGE_SIZE_PX.width}, height: ${EBOOK_PAGE_SIZE_PX.height}, unit: "px" }, themeCss, and pages.
- themeCss may be empty or contain only a single :root block with CSS custom properties such as --accent. Do not put selectors, layout rules, imports, or page styles in themeCss.
- Each page includes id, index, title, role, html, css, and version.
- Each page html has root <section data-celion-page="{pageId}" class="celion-page">.
- Use clean semantic HTML with meaningful class names.
- Keep editable text, images, card titles, block titles, labels, captions, badges, and list headings as separate DOM nodes.
- Do not put important editable content in pseudo-elements.
- Do not add Celion editor metadata manually; Celion will normalize editable elements after generation.
- Never put style="" attributes in HTML. Put every visual rule in the page css field.
- Every page CSS selector starts with [data-celion-page="{pageId}"].
- Do not use script, iframe, object, embed, form, input, textarea, button, video, audio, canvas, external JS, or external CSS.
- Do not use url(), @import, @keyframes, animations, transitions, or markup-like tokens inside CSS.
- Do not use global selectors like html, body, *, h1, p, div, span, section, or unscoped class selectors.
- No editable manifest is required from the model.
- Use page CSS to make each [data-celion-page="{pageId}"] exactly ${EBOOK_PAGE_SIZE_CSS_PX} and overflow: hidden.
- Use only browser-safe CSS colors: hex, rgb, rgba, hsl, hsla, named colors, or variables that resolve to those values.
- Do not use color(), color-mix(), oklch(), lab(), or lch().
- No placeholders, lorem ipsum, markdown fences, scripts, external assets, or generic filler.
- Keep all text readable inside the fixed A5 page.`;
}

function isGenerationRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function truncateForPrompt(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}\n...[truncated]`;
}

function htmlTextForPrompt(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pageContextForPrompt(page: CelionEbookPage | undefined) {
  if (!page) return null;

  return {
    title: page.title,
    role: page.role,
    text: truncateForPrompt(htmlTextForPrompt(page.html), 800),
    html: truncateForPrompt(page.html, 2400),
    css: truncateForPrompt(page.css, 2400),
  };
}

function pageOutlineForPrompt(document: CelionEbookDocument) {
  return document.pages.map((page, index) => ({
    index,
    title: page.title,
    role: page.role,
    text: truncateForPrompt(htmlTextForPrompt(page.html), 280),
  }));
}

export type EbookPageGenerationArgs = {
  document: CelionEbookDocument;
  insertIndex: number;
  pageId: string;
  instruction?: string;
};

export type EbookPageGenerationResult = {
  page: CelionEbookPage;
  model: string;
  promptLength: number;
};

function buildPagePrompt({
  document,
  insertIndex,
  pageId,
  instruction,
}: EbookPageGenerationArgs) {
  const normalizedDocument = normalizeEbookDocument(document);
  const clampedIndex = Math.max(0, Math.min(insertIndex, normalizedDocument.pages.length));
  const previousPage = normalizedDocument.pages[clampedIndex - 1];
  const nextPage = normalizedDocument.pages[clampedIndex];

  return `Add one page to this existing A5 ebook.

Request:
- Insert index: ${clampedIndex}
- New page id: ${pageId}
- User instruction: ${instruction?.trim() || "Continue the ebook naturally with the next useful page."}

Document context:
${JSON.stringify({
  title: normalizedDocument.title,
  size: normalizedDocument.size,
  themeCss: truncateForPrompt(normalizedDocument.themeCss, 1200),
  pageOutline: pageOutlineForPrompt(normalizedDocument),
  previousPage: pageContextForPrompt(previousPage),
  nextPage: pageContextForPrompt(nextPage),
}, null, 2)}

Design direction:
- Match the existing visual language, typography, spacing, and editorial rhythm.
- Use the previous and next page as local context; do not rewrite existing pages.
- Make the new page useful, specific, and publication-ready, not a generic filler page.
- If the user instruction is empty, create the page that best continues the surrounding flow.
- Use only the existing document context. Do not invent unsupported facts.

Technical contract:
- Output only JSON with one "page" field.
- Generate exactly one page.
- The page id must be "${pageId}" and index must be ${clampedIndex}.
- Page html has root <section data-celion-page="${pageId}" class="celion-page">.
- Use clean semantic HTML with meaningful class names.
- Keep editable text, images, card titles, block titles, labels, captions, badges, and list headings as separate DOM nodes.
- Do not put important editable content in pseudo-elements.
- Do not add Celion editor metadata manually; Celion will normalize editable elements after generation.
- Never put style="" attributes in HTML. Put every visual rule in the page css field.
- Every page CSS selector starts with [data-celion-page="${pageId}"].
- Do not use script, iframe, object, embed, form, input, textarea, button, video, audio, canvas, external JS, external CSS, url(), @import, @keyframes, animations, or transitions.
- Do not use global selectors like html, body, *, h1, p, div, span, section, or unscoped class selectors.
- No editable manifest is required from the model.
- Use page CSS to make [data-celion-page="${pageId}"] exactly ${EBOOK_PAGE_SIZE_CSS_PX} and overflow: hidden.
- Keep all text readable inside the fixed A5 page.`;
}

function generatedPageCandidate(raw: unknown) {
  if (!isGenerationRecord(raw)) return null;
  const page = raw.page;
  if (isGenerationRecord(page)) return page;
  const document = raw.document;
  if (!isGenerationRecord(document) || !Array.isArray(document.pages)) return null;
  return isGenerationRecord(document.pages[0]) ? document.pages[0] : null;
}

function forceGeneratedPageId(rawPage: Record<string, unknown>, pageId: string, index: number) {
  const normalizedPage = normalizeEbookDocument({ pages: [rawPage] }).pages[0];
  const html = normalizedPage.html.replace(
    /data-celion-page=(["'])[^"']+\1/g,
    `data-celion-page="${pageId}"`,
  );
  const css = normalizedPage.css.replace(
    /\[data-celion-page=(["'])[^"']+\1\]/g,
    `[data-celion-page="${pageId}"]`,
  );

  return {
    ...normalizedPage,
    id: pageId,
    index,
    html,
    css,
  };
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function stringArrayValue(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim())
    : [];
}

export function normalizePlan(raw: unknown, args: EbookGenerationArgs): EbookPlan {
  if (typeof raw !== "object" || raw === null) {
    throw new EbookGenerationError("plan_invalid", "Gemini Flash did not return an ebook plan object.");
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
    .map((slide): EbookPlanSlide | null => {
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
    .filter((slide): slide is EbookPlanSlide => Boolean(slide))
    .slice(0, MAX_EBOOK_PLAN_SLIDES);

  if (normalizedSlides.length < MIN_EBOOK_PLAN_SLIDES) {
    throw new EbookGenerationError(
      "plan_invalid",
      `Gemini Flash returned an ebook plan with only ${normalizedSlides.length} usable slides.`,
    );
  }

  const rawRecommendedSlideCount = typeof sourceAssessment.recommendedSlideCount === "number" && Number.isFinite(sourceAssessment.recommendedSlideCount)
    ? Math.round(sourceAssessment.recommendedSlideCount)
    : normalizedSlides.length;
  const recommendedSlideCount = Math.min(MAX_EBOOK_PLAN_SLIDES, Math.max(MIN_EBOOK_PLAN_SLIDES, rawRecommendedSlideCount));

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

function capEbookDocumentPagesForGeneration(document: CelionEbookDocument, maxPages: number): CelionEbookDocument {
  if (document.pages.length <= maxPages) return document;

  return normalizeEbookDocument({
    ...document,
    pages: document.pages.slice(0, maxPages).map((page, index) => ({
      ...page,
      index,
    })),
  });
}

type EbookFailureReason = "gemini_call_failed" | "missing_html" | "invalid_html" | "plan_invalid";
type EbookGenerationStage = "plan" | "html";
type EbookGenerationErrorOptions = {
  status?: number;
  stage?: EbookGenerationStage;
  validation?: unknown;
  pageCount?: number;
  generationTrace?: EbookGenerationBatchTrace[];
};

export class EbookGenerationError extends Error {
  readonly reason: EbookFailureReason;
  readonly status?: number;
  readonly stage?: EbookGenerationStage;
  readonly validation?: unknown;
  readonly pageCount?: number;
  readonly generationTrace?: EbookGenerationBatchTrace[];

  constructor(reason: EbookFailureReason, message: string, options: EbookGenerationErrorOptions = {}) {
    super(message);
    this.name = "EbookGenerationError";
    this.reason = reason;
    this.status = options.status;
    this.stage = options.stage;
    this.validation = options.validation;
    this.pageCount = options.pageCount;
    this.generationTrace = options.generationTrace;
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

export async function generateEbookPlan(args: EbookGenerationArgs) {
  try {
    const raw = await generateJsonWithGemini({
      system: PLAN_SYSTEM,
      user: buildPlanPrompt(args),
      model: PLAN_MODEL,
      temperature: 0.75,
    });
    return normalizePlan(raw, args);
  } catch (error) {
    if (error instanceof EbookGenerationError) {
      warnEbookGenerationFailure(error.reason, { stage: "plan" });
      throw error;
    }

    const details = errorDetails(error);
    warnEbookGenerationFailure("gemini_call_failed", { stage: "plan", ...details });
    const status = error instanceof GeminiProviderError ? error.status : undefined;
    return failGeneration(
      "gemini_call_failed",
      status === 429
        ? "Gemini rate limit was reached while planning the ebook. Please wait a bit and try again."
        : "AI ebook planning failed before Gemini returned a usable plan.",
      { status, stage: "plan" },
    );
  }
}

export async function generateEbookPage(
  args: EbookPageGenerationArgs,
): Promise<EbookPageGenerationResult> {
  const prompt = buildPagePrompt(args);

  let raw: unknown;
  try {
    raw = await generateJsonWithGemini({
      system: PAGE_SYSTEM,
      user: prompt,
      model: EBOOK_GEMINI_MODEL,
      temperature: 0.85,
    });
  } catch (error) {
    const details = errorDetails(error);
    const status = error instanceof GeminiProviderError ? error.status : undefined;
    warnEbookGenerationFailure("gemini_call_failed", {
      stage: "html",
      ...details,
    });
    return failGeneration(
      "gemini_call_failed",
      status === 429
        ? "Gemini rate limit was reached while adding the page. Please wait a bit and try again."
        : "AI page generation failed before Gemini returned a usable page.",
      { status, stage: "html" },
    );
  }

  const candidate = generatedPageCandidate(raw);
  if (!candidate) {
    warnEbookGenerationFailure("missing_html", {
      stage: "html",
      documentType: typeof raw,
    });
    return failGeneration("missing_html", "Gemini did not return an ebook page.", {
      stage: "html",
    });
  }

  const clampedIndex = Math.max(0, Math.min(args.insertIndex, args.document.pages.length));
  const forcedPage = forceGeneratedPageId(candidate, args.pageId, clampedIndex);
  const pageDocument = sanitizeEbookDocument({
    ...normalizeEbookDocument(args.document),
    pages: [forcedPage],
  });
  const validation = validateEbookDocument(pageDocument);

  if (!validation.ok) {
    warnEbookGenerationFailure("invalid_html", {
      stage: "html",
      documentValidationErrors: validation.errors,
      pageCount: pageDocument.pages.length,
    });
    return failGeneration(
      "invalid_html",
      `Gemini returned a page, but it did not pass Celion document validation: ${validation.errors[0] ?? "Unknown document validation error."}`,
      {
        stage: "html",
        validation: {
          ok: false,
          errors: validation.errors,
          pageCount: pageDocument.pages.length,
        },
        pageCount: pageDocument.pages.length,
      },
    );
  }

  return {
    page: pageDocument.pages[0],
    model: EBOOK_GEMINI_MODEL,
    promptLength: prompt.length,
  };
}

async function generateCompleteEbookDocument(
  args: EbookGenerationArgs,
  plan: EbookPlan,
  generationTrace: EbookGenerationBatchTrace[],
) {
  const startedAtMs = Date.now();
  const prompt = buildHtmlPrompt(args, plan);
  const trace: EbookGenerationBatchTrace = {
    stage: "html",
    batchNumber: 1,
    batchCount: 1,
    slideStart: 1,
    slideEnd: plan.slides.length,
    totalSlides: plan.slides.length,
    requestedSlideCount: plan.slides.length,
    model: EBOOK_GEMINI_MODEL,
    promptLength: prompt.length,
    slideHeadlines: plan.slides.map((slide) => slide.headline),
    startedAt: new Date(startedAtMs).toISOString(),
    status: "started",
  };
  generationTrace.push(trace);

  const completeTrace = (status: EbookGenerationBatchTrace["status"], details: Partial<EbookGenerationBatchTrace> = {}) => {
    const completedAtMs = Date.now();
    Object.assign(trace, {
      ...details,
      status,
      completedAt: new Date(completedAtMs).toISOString(),
      durationMs: completedAtMs - startedAtMs,
    });
  };

  let raw: unknown;
  try {
    raw = await generateJsonWithGemini({
      system: HTML_SYSTEM,
      user: prompt,
      model: EBOOK_GEMINI_MODEL,
      temperature: 1,
    });
  } catch (error) {
    const details = errorDetails(error);
    const status = error instanceof GeminiProviderError ? error.status : undefined;
    completeTrace("failure", {
      errorReason: "gemini_call_failed",
      errorMessage: error instanceof Error ? error.message : "Gemini call failed.",
      errorStatus: status,
    });
    warnEbookGenerationFailure("gemini_call_failed", {
      stage: "html",
      ...details,
    });
    return failGeneration(
      "gemini_call_failed",
      status === 429
        ? "Gemini rate limit was reached while designing the ebook. Please wait a bit and try again."
        : status === 408 || status === 504
          ? "Vertex AI timed out while designing the ebook. Please try again; if it keeps happening, reduce the approved plan length."
          : "AI ebook generation failed before Gemini returned a usable design.",
      { status, stage: "html", generationTrace },
    );
  }

  const result = raw as { document?: unknown };
  if (!result?.document || typeof result.document !== "object") {
    completeTrace("failure", {
      errorReason: "missing_html",
      errorMessage: "Gemini did not return an ebook document.",
    });
    warnEbookGenerationFailure("missing_html", {
      stage: "html",
      documentType: typeof result?.document,
    });
    return failGeneration("missing_html", "Gemini did not return an ebook document.", {
      stage: "html",
      generationTrace,
    });
  }

  const ebookDocument = capEbookDocumentPagesForGeneration(
    sanitizeEbookDocument(normalizeEbookDocument(result.document)),
    plan.slides.length,
  );
  const documentValidation = validateEbookDocument(ebookDocument);
  if (!documentValidation.ok) {
    completeTrace("failure", {
      pageCount: ebookDocument.pages.length,
      pageTitles: ebookDocument.pages.map((page) => page.title),
      errorReason: "invalid_html",
      errorMessage: documentValidation.errors[0] ?? "Unknown document validation error.",
    });
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
        generationTrace,
      },
    );
  }

  if (ebookDocument.pages.length !== plan.slides.length) {
    const message = `Expected ${plan.slides.length} pages but received ${ebookDocument.pages.length}.`;
    completeTrace("failure", {
      pageCount: ebookDocument.pages.length,
      pageTitles: ebookDocument.pages.map((page) => page.title),
      errorReason: "invalid_html",
      errorMessage: message,
    });
    warnEbookGenerationFailure("invalid_html", {
      stage: "html",
      expectedPageCount: plan.slides.length,
      pageCount: ebookDocument.pages.length,
    });
    return failGeneration(
      "invalid_html",
      `Gemini returned ${ebookDocument.pages.length} pages for a ${plan.slides.length}-slide plan.`,
      {
        stage: "html",
        validation: {
          ok: false,
          errors: [message],
          pageCount: ebookDocument.pages.length,
        },
        pageCount: ebookDocument.pages.length,
        generationTrace,
      },
    );
  }

  const html = compileEbookDocumentToHtml(ebookDocument);
  const validation = validateUsableEbookHtml(html);

  completeTrace("success", {
    pageCount: ebookDocument.pages.length,
    pageTitles: ebookDocument.pages.map((page) => page.title),
  });

  return { html, validation, ebookDocument };
}

export async function generateEbookHtmlFromPlan(args: EbookGenerationArgs, plan: EbookPlan) {
  const generationTrace: EbookGenerationBatchTrace[] = [];
  const { html, validation, ebookDocument } = await generateCompleteEbookDocument(args, plan, generationTrace);
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
        generationTrace,
      },
    );
  }

  return {
    html,
    validation,
    ebookDocument,
    generationTrace,
  };
}

export async function generateEbookHtml(args: EbookGenerationArgs): Promise<string> {
  const result = await generateEbookHtmlWithDiagnostics(args);
  return result.html;
}

export async function generateEbookHtmlWithDiagnostics(
  args: EbookGenerationArgs,
): Promise<{ html: string; diagnostics: EbookGenerationDiagnostics }> {
  const plan = await generateEbookPlan(args);
  const { html, validation, ebookDocument, generationTrace } = await generateEbookHtmlFromPlan(args, plan);
  return {
    html,
    diagnostics: {
      planModel: PLAN_MODEL,
      htmlModel: EBOOK_GEMINI_MODEL,
      plan,
      ebookDocument,
      validation,
      generationTrace,
      htmlLength: html.length,
      slideCount: validation.slideCount,
    },
  };
}

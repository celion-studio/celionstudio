import {
  EBOOK_GEMINI_MODEL,
  EBOOK_PLAN_GEMINI_MODEL,
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
import {
  MAX_EBOOK_GENERATION_PAGES,
  MAX_EBOOK_PLAN_SLIDES,
  MIN_EBOOK_PLAN_SLIDES,
} from "@/lib/request-limits";
import type { EbookStyle } from "@/types/project";

const PLAN_MODEL = EBOOK_PLAN_GEMINI_MODEL;
const HTML_PLAN_BODY_LIMIT = 900;
const HTML_PLAN_EVIDENCE_LIMIT = 500;
const HTML_PLAN_VISUAL_DIRECTION_LIMIT = 500;
const HTML_PLAN_TEXT_LIMIT = 240;
const HTML_PLAN_ARRAY_ITEM_LIMIT = 140;

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

function buildPlanPrompt(args: EbookGenerationArgs): string {
  const stylePrompt = EBOOK_STYLE_PROMPTS[args.ebookStyle];
  const slideBudget = estimateSlideBudgetForSource(args.sourceText);

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
- Recommended slide budget: ${slideBudget.min}-${slideBudget.max} slides.
- Source scale: ${slideBudget.sourceChars} characters, ${slideBudget.detectedSections} detected sections/headings.
- First assess the source, then decide the page count. The plan must choose recommendedSlideCount after assessing the source, not before.
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

function compactTextForHtmlPrompt(value: string, maxLength: number) {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength).trimEnd()}...`;
}

function compactArrayForHtmlPrompt(values: string[], maxItems: number, maxItemLength = HTML_PLAN_ARRAY_ITEM_LIMIT) {
  return values
    .slice(0, maxItems)
    .map((value) => compactTextForHtmlPrompt(value, maxItemLength))
    .filter(Boolean);
}

function compactPlanForHtmlPrompt(plan: EbookPlan) {
  return {
    title: compactTextForHtmlPrompt(plan.title, HTML_PLAN_TEXT_LIMIT),
    subtitle: compactTextForHtmlPrompt(plan.subtitle, HTML_PLAN_TEXT_LIMIT),
    author: compactTextForHtmlPrompt(plan.author, HTML_PLAN_TEXT_LIMIT),
    targetAudience: compactTextForHtmlPrompt(plan.targetAudience, HTML_PLAN_TEXT_LIMIT),
    readerPromise: compactTextForHtmlPrompt(plan.readerPromise, HTML_PLAN_TEXT_LIMIT),
    language: compactTextForHtmlPrompt(plan.language, 80),
    sourceAssessment: {
      sourceScale: compactTextForHtmlPrompt(plan.sourceAssessment.sourceScale, 40),
      detectedSections: compactArrayForHtmlPrompt(plan.sourceAssessment.detectedSections, 12),
      essentialSections: compactArrayForHtmlPrompt(plan.sourceAssessment.essentialSections, 12),
      compressionRisk: compactTextForHtmlPrompt(plan.sourceAssessment.compressionRisk, 40),
      recommendedSlideCount: plan.sourceAssessment.recommendedSlideCount,
      coveragePlan: compactArrayForHtmlPrompt(plan.sourceAssessment.coveragePlan, 8, 180),
      rationale: compactTextForHtmlPrompt(plan.sourceAssessment.rationale, 360),
    },
    cover: {
      eyebrow: compactTextForHtmlPrompt(plan.cover.eyebrow, 80),
      title: compactTextForHtmlPrompt(plan.cover.title, HTML_PLAN_TEXT_LIMIT),
      subtitle: compactTextForHtmlPrompt(plan.cover.subtitle, HTML_PLAN_TEXT_LIMIT),
      promise: compactTextForHtmlPrompt(plan.cover.promise, HTML_PLAN_TEXT_LIMIT),
      visualDirection: compactTextForHtmlPrompt(plan.cover.visualDirection, HTML_PLAN_VISUAL_DIRECTION_LIMIT),
    },
    editorialStrategy: {
      angle: compactTextForHtmlPrompt(plan.editorialStrategy.angle, 360),
      readerProblem: compactTextForHtmlPrompt(plan.editorialStrategy.readerProblem, 360),
      promisedOutcome: compactTextForHtmlPrompt(plan.editorialStrategy.promisedOutcome, 360),
      narrativeArc: compactTextForHtmlPrompt(plan.editorialStrategy.narrativeArc, 420),
    },
    designBrief: {
      mood: compactTextForHtmlPrompt(plan.designBrief.mood, HTML_PLAN_TEXT_LIMIT),
      visualSystem: compactTextForHtmlPrompt(plan.designBrief.visualSystem, 420),
      coverConcept: compactTextForHtmlPrompt(plan.designBrief.coverConcept, 360),
      layoutRhythm: compactTextForHtmlPrompt(plan.designBrief.layoutRhythm, 420),
      avoid: compactArrayForHtmlPrompt(plan.designBrief.avoid, 8),
    },
    slides: plan.slides.map((slide) => ({
      role: compactTextForHtmlPrompt(slide.role, 60),
      eyebrow: compactTextForHtmlPrompt(slide.eyebrow, 80),
      headline: compactTextForHtmlPrompt(slide.headline, HTML_PLAN_TEXT_LIMIT),
      body: compactTextForHtmlPrompt(slide.body, HTML_PLAN_BODY_LIMIT),
      evidence: compactTextForHtmlPrompt(slide.evidence, HTML_PLAN_EVIDENCE_LIMIT),
      sourceAnchors: compactArrayForHtmlPrompt(slide.sourceAnchors, 4, 120),
      visualDirection: compactTextForHtmlPrompt(slide.visualDirection, HTML_PLAN_VISUAL_DIRECTION_LIMIT),
    })),
  };
}

type HtmlBatchContext = {
  batchNumber: number;
  batchCount: number;
  slideStart: number;
  slideEnd: number;
  totalSlides: number;
};

function buildHtmlPrompt(args: EbookGenerationArgs, plan: EbookPlan, batch?: HtmlBatchContext): string {
  const stylePrompt = EBOOK_STYLE_PROMPTS[args.ebookStyle];
  const batchDirection = batch
    ? `
Batch:
- Batch ${batch.batchNumber} of ${batch.batchCount}.
- This batch covers approved slides ${batch.slideStart}-${batch.slideEnd} of ${batch.totalSlides}.
- Render only the ${plan.slides.length} slides included in this approved plan batch.
- Do not create, skip, merge, rename, or summarize slides outside this batch.`
    : "";

  return `Render this approved plan as a finished A5 HTML/CSS slide publication.

Design inputs:
- Visual mood: ${args.ebookStyle} (${stylePrompt})
- Accent color: ${args.accentColor}
- Page size: ${EBOOK_PAGE_SIZE_CSS_PX}
${batchDirection}

Approved plan:
${JSON.stringify(compactPlanForHtmlPrompt(plan))}

Design direction:
- Follow the plan structure and slide order exactly.
- Do not rename slide headlines.
- Treat each page like a polished editorial card, not a plain document page.
- Use visual hierarchy, spacing, rules, side notes, pull quotes, small tables, timelines, checklists, diagrams, badges, numbered systems, comparison blocks, and typographic contrast when they clarify the content.
- Each page should have one memorable visual idea: a strong typographic composition, structured framework, comparison, timeline, evidence card, checklist, or editorial diagram.
- Make the cover feel intentionally designed for this source, not a fixed slot template.
- Vary layouts across slides. Avoid repeating the same header, eyebrow, title, body, box pattern.
- Avoid large empty rectangles, generic gradient panels, and flat text-only pages unless the slide is intentionally acting as a dramatic pause.
- For framework and example pages, create concrete visual structures instead of paragraph-only layouts.
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
- Generate all pages in one response for this batch. Do not require page-by-page calls.
- Generate exactly ${plan.slides.length} pages for this batch.
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

  const promptSlideBudget = estimateSlideBudgetForSource(args.sourceText);
  const rawRecommendedSlideCount = typeof sourceAssessment.recommendedSlideCount === "number" && Number.isFinite(sourceAssessment.recommendedSlideCount)
    ? Math.round(sourceAssessment.recommendedSlideCount)
    : Math.min(promptSlideBudget.max, Math.max(promptSlideBudget.min, normalizedSlides.length));
  const recommendedSlideCount = Math.min(MAX_EBOOK_PLAN_SLIDES, Math.max(MIN_EBOOK_PLAN_SLIDES, rawRecommendedSlideCount));
  if (normalizedSlides.length < recommendedSlideCount - 2) {
    throw new EbookGenerationError(
      "plan_invalid",
      `Gemini Flash recommended ${recommendedSlideCount} slides but only returned ${normalizedSlides.length} usable slides.`,
      { stage: "plan" },
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

function chunkSlidesForHtmlGeneration(slides: EbookPlanSlide[]) {
  const batches: EbookPlanSlide[][] = [];
  for (let index = 0; index < slides.length; index += MAX_EBOOK_GENERATION_PAGES) {
    batches.push(slides.slice(index, index + MAX_EBOOK_GENERATION_PAGES));
  }
  return batches;
}

function planForHtmlBatch(plan: EbookPlan, slides: EbookPlanSlide[]): EbookPlan {
  return {
    ...plan,
    sourceAssessment: {
      ...plan.sourceAssessment,
      recommendedSlideCount: slides.length,
    },
    slides,
  };
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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceAttributeValue(value: string, attributeName: string, replacements: Map<string, string>) {
  if (replacements.size === 0) return value;

  const attributePattern = new RegExp(`(${attributeName}\\s*=\\s*)(["'])(.*?)\\2`, "gi");
  return value.replace(attributePattern, (match, prefix: string, quote: string, currentValue: string) => {
    const nextValue = replacements.get(currentValue);
    return nextValue ? `${prefix}${quote}${nextValue}${quote}` : match;
  });
}

function htmlEditableIdsForPage(html: string) {
  return [...html.matchAll(/\sdata-celion-id\s*=\s*(?:"([^"]+)"|'([^']+)')/gi)]
    .map((match) => match[1] ?? match[2] ?? "")
    .filter(Boolean);
}

function editableIdForMergedPage(oldId: string, oldPageId: string, newPageId: string, fallbackIndex: number) {
  const oldPrefix = `${oldPageId}-`;
  const suffix = oldId.startsWith(oldPrefix) ? oldId.slice(oldPrefix.length) : oldId;
  const normalizedSuffix = suffix
    .replace(/[^\w:-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || `element-${fallbackIndex + 1}`;

  return normalizedSuffix.startsWith(`${newPageId}-`)
    ? normalizedSuffix
    : `${newPageId}-${normalizedSuffix}`;
}

function buildEditableIdReplacements(page: CelionEbookDocument["pages"][number], newPageId: string) {
  const replacements = new Map<string, string>();
  const usedIds = new Set<string>();
  const htmlIds = htmlEditableIdsForPage(page.html);

  htmlIds.forEach((oldId, index) => {
    if (replacements.has(oldId)) return;

    const baseId = editableIdForMergedPage(oldId, page.id, newPageId, index);
    let nextId = baseId;
    let duplicateIndex = 2;
    while (usedIds.has(nextId)) {
      nextId = `${baseId}-${duplicateIndex}`;
      duplicateIndex += 1;
    }

    usedIds.add(nextId);
    replacements.set(oldId, nextId);
  });

  return replacements;
}

function replacePageScope(value: string, oldPageId: string, newPageId: string) {
  const replacements = new Map([[oldPageId, newPageId]]);
  return replaceAttributeValue(value, "data-celion-page", replacements);
}

function replaceEditableIds(value: string, replacements: Map<string, string>) {
  return replaceAttributeValue(value, "data-celion-id", replacements);
}

function replaceEditableSelectors(value: string, replacements: Map<string, string>) {
  let nextValue = value;

  for (const [oldId, newId] of replacements) {
    const oldIdPattern = escapeRegExp(oldId);
    nextValue = nextValue
      .replace(new RegExp(`\\[data-celion-id="${oldIdPattern}"\\]`, "g"), `[data-celion-id="${newId}"]`)
      .replace(new RegExp(`\\[data-celion-id='${oldIdPattern}'\\]`, "g"), `[data-celion-id="${newId}"]`);
  }

  return nextValue;
}

function reindexEbookPageForMerge(page: CelionEbookDocument["pages"][number], index: number) {
  const nextPageId = `page-${index + 1}`;
  const editableIdReplacements = buildEditableIdReplacements(page, nextPageId);
  const htmlWithPageScope = replacePageScope(page.html, page.id, nextPageId);
  const cssWithPageScope = replacePageScope(page.css, page.id, nextPageId);

  return {
    ...page,
    id: nextPageId,
    index,
    html: replaceEditableIds(htmlWithPageScope, editableIdReplacements),
    css: replaceEditableSelectors(cssWithPageScope, editableIdReplacements),
    manifest: {
      editableElements: page.manifest.editableElements.map((element) => {
        const nextId = editableIdReplacements.get(element.id) ?? element.id;
        return {
          ...element,
          id: nextId,
          selector: `[data-celion-id="${nextId}"]`,
        };
      }),
    },
  };
}

function mergeEbookDocumentsForGeneration(documents: CelionEbookDocument[], title: string): CelionEbookDocument {
  const firstDocument = documents[0];
  const pages = documents.flatMap((document) => document.pages);

  return normalizeEbookDocument({
    version: 1,
    title: firstDocument?.title || title,
    size: firstDocument?.size ?? {
      width: EBOOK_PAGE_SIZE_PX.width,
      height: EBOOK_PAGE_SIZE_PX.height,
      unit: "px",
    },
    themeCss: documents.map((document) => document.themeCss.trim()).find(Boolean) ?? "",
    pages: pages.map(reindexEbookPageForMerge),
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

async function generateEbookDocumentBatch(
  args: EbookGenerationArgs,
  plan: EbookPlan,
  batch: HtmlBatchContext,
  generationTrace: EbookGenerationBatchTrace[],
): Promise<CelionEbookDocument> {
  const startedAtMs = Date.now();
  const prompt = buildHtmlPrompt(args, plan, batch);
  const trace: EbookGenerationBatchTrace = {
    stage: "html",
    batchNumber: batch.batchNumber,
    batchCount: batch.batchCount,
    slideStart: batch.slideStart,
    slideEnd: batch.slideEnd,
    totalSlides: batch.totalSlides,
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
      batch: `${batch.batchNumber}/${batch.batchCount}`,
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
      batch: `${batch.batchNumber}/${batch.batchCount}`,
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
      batch: `${batch.batchNumber}/${batch.batchCount}`,
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

  if (ebookDocument.pages.length < plan.slides.length) {
    completeTrace("failure", {
      pageCount: ebookDocument.pages.length,
      pageTitles: ebookDocument.pages.map((page) => page.title),
      errorReason: "invalid_html",
      errorMessage: `Expected ${plan.slides.length} pages but received ${ebookDocument.pages.length}.`,
    });
    warnEbookGenerationFailure("invalid_html", {
      stage: "html",
      batch: `${batch.batchNumber}/${batch.batchCount}`,
      expectedPageCount: plan.slides.length,
      pageCount: ebookDocument.pages.length,
    });
    return failGeneration(
      "invalid_html",
      `Gemini returned only ${ebookDocument.pages.length} pages for a ${plan.slides.length}-slide batch.`,
      {
        stage: "html",
        validation: {
          ok: false,
          errors: [`Expected ${plan.slides.length} pages but received ${ebookDocument.pages.length}.`],
          pageCount: ebookDocument.pages.length,
        },
        pageCount: ebookDocument.pages.length,
        generationTrace,
      },
    );
  }

  completeTrace("success", {
    pageCount: ebookDocument.pages.length,
    pageTitles: ebookDocument.pages.map((page) => page.title),
  });

  return ebookDocument;
}

export async function generateEbookHtmlFromPlan(args: EbookGenerationArgs, plan: EbookPlan) {
  const slideBatches = chunkSlidesForHtmlGeneration(plan.slides);
  const batchDocuments: CelionEbookDocument[] = [];
  const generationTrace: EbookGenerationBatchTrace[] = [];

  for (const [batchIndex, slides] of slideBatches.entries()) {
    const slideStart = batchIndex * MAX_EBOOK_GENERATION_PAGES + 1;
    const batchPlan = planForHtmlBatch(plan, slides);
    batchDocuments.push(await generateEbookDocumentBatch(args, batchPlan, {
      batchNumber: batchIndex + 1,
      batchCount: slideBatches.length,
      slideStart,
      slideEnd: slideStart + slides.length - 1,
      totalSlides: plan.slides.length,
    }, generationTrace));
  }

  const ebookDocument = mergeEbookDocumentsForGeneration(batchDocuments, plan.title || args.title);
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
        generationTrace,
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

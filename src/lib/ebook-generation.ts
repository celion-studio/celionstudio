import { EBOOK_GEMINI_MODEL, generateJsonWithGemini } from "@/lib/ai/gemini";
import {
  CELION_A5_SLIDE_HTML_SPEC,
  sanitizeEbookHtmlForCanvas,
  validateCelionSlideHtml,
} from "@/lib/ebook-html";
import type { EbookStyle } from "@/types/project";

const EBOOK_WIDTH_PX = 559;
const EBOOK_HEIGHT_PX = 794;
const EBOOK_ASPECT_RATIO = "559 / 794";

type SalesSection = {
  title: string;
  summary: string;
  slideCount: number;
};

const STYLE_PROMPTS: Record<EbookStyle, string> = {
  minimal: "quiet Swiss editorial system, white space, hairline rules, precise labels, restrained accent use",
  editorial: "magazine/report system, confident typographic hierarchy, pull quotes, chapter rhythm, asymmetric editorial grid",
  "neo-brutalism": "raw high-contrast system, hard borders, monospace details, sticker-like labels, practical code/prompt surfaces",
  bold: "sales-led visual system, oversized type, decisive contrast, proof chips, strong preview/CTA moments",
  elegant: "refined publishing system, serif-led hierarchy, quiet frames, warm paper, subtle proof and note components",
};

const STYLE_RULES: Record<EbookStyle, string> = {
  minimal: [
    "Prefer white paper, black text, one accent, hairline rules, small uppercase labels, and disciplined spacing.",
    "Let the composition feel useful, calm, and premium rather than decorative.",
    "Use boxes, rules, and metadata sparingly; make empty space part of the design.",
  ].join("\n"),
  editorial: [
    "Prefer strong section labels, pull quotes, chapter dividers, and confident editorial grids.",
    "Allow asymmetry, sidebars, and bold type scale when the content earns it.",
    "Use the accent for editorial hierarchy: labels, rules, margins, side notes, or one typographic highlight.",
  ].join("\n"),
  "neo-brutalism": [
    "Prefer high contrast, thick borders, raw layout blocks, code blocks, and monospace or condensed type.",
    "Use the accent as a hard block, label, proof chip, or command surface.",
    "Keep the result intentional, sellable, and premium; rough does not mean careless.",
  ].join("\n"),
  bold: [
    "Prefer oversized typography, strong contrast, decisive accent blocks, stats, and punchy teaser moments.",
    "Every slide should feel energetic but still editorial and legible.",
    "Use visual weight to sell the promise, not to decorate empty content.",
  ].join("\n"),
  elegant: [
    "Prefer refined serif typography, warm paper, quiet rules, framed notes, and generous margins.",
    "Use the accent sparingly for hierarchy, proof, or chapter rhythm.",
    "Let the product feel composed, trustworthy, and expensive without becoming sleepy.",
  ].join("\n"),
};

const EBOOK_SYSTEM = `You are an expert editorial product designer and conversion copywriter. Generate one complete A5 HTML/CSS slide document for a paid-product free preview. Return JSON with a single "html" field containing the full HTML string.

Celion A5 Slide HTML format:
${CELION_A5_SLIDE_HTML_SPEC.map((rule) => `- ${rule}`).join("\n")}
- Never rely on scrolling, hidden overflow, or unreadably tiny text to make content fit

Product goal:
- This is not a generic document. It is a free-preview sales asset for a paid product.
- The preview must give real value while making the full version feel concrete and desirable.
- Use the source as material, but transform it into a persuasive reader journey.
- Think in A5 slides, not long-form essay pages: each slide should feel intentionally composed.

Creative autonomy:
- Choose the exact composition, spacing, type scale, cover structure, header/footer contents, and component proportions.
- Use slide chrome when it helps orientation: headers, footers, numbers, progress marks, brand marks, or section cues are all acceptable.
- Design components should feel native to the selected style, not copied from a fixed template.
- Decide what belongs in the cover, chapter dividers, contents, proof, useful preview, friction/help, teaser, and CTA slides.
- Decide the final slide count after reading the source. Most previews should land around 10-18 slides; go shorter for a focused source and longer only when the source earns it.

Internal method:
- Before writing HTML, internally derive the preview journey: sellable cover promise, reader tension, credibility proof, useful sample, friction relief, full-version teaser, and CTA.
- Transform raw inputs into design/copy roles instead of pasting them into fixed slots.
- Treat title, author, target audience, and core message as briefing inputs. Rewrite cover copy when it makes the offer sharper.
- Return JSON: { "html": "<complete html string>" }`;

function sourceHeadings(sourceText: string) {
  return sourceText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^#{1,3}\s+\S/.test(line))
    .map((line) => line.replace(/^#{1,3}\s+/, "").trim())
    .filter(Boolean)
    .slice(0, 4);
}

function buildSalesSections(args: {
  title: string;
  coreMessage: string;
  targetAudience: string;
  sourceText: string;
}): SalesSection[] {
  const sourceDensity = Math.ceil(args.sourceText.trim().length / 900);
  const targetSlides = Math.max(8, Math.min(24, 8 + sourceDensity * 2));
  const availableSlides = Math.max(4, targetSlides - 2);
  const headings = sourceHeadings(args.sourceText);
  const chapterTitles =
    headings.length >= 3
      ? headings
      : [
          "Why this matters now",
          "The core idea",
          "How to apply it",
          "Common mistakes",
          "Next steps",
        ];
  const chapterCount = Math.min(chapterTitles.length, Math.max(3, Math.min(4, availableSlides)));
  const baseSlides = Math.max(1, Math.floor(Math.max(3, availableSlides - 5) / chapterCount));
  let remainingSlides = availableSlides - baseSlides * chapterCount;

  const sections = chapterTitles.slice(0, chapterCount).map((title, index) => {
    const slideCount = baseSlides + (remainingSlides > 0 ? 1 : 0);
    remainingSlides -= 1;

    return {
      title,
      summary:
        index === 0
          ? `Frame ${args.coreMessage || args.title} for ${args.targetAudience || "the reader"}.`
          : "Develop the ebook's central argument with practical, source-grounded detail.",
      slideCount,
    };
  });

  return [
    { title: "Cover", summary: `Compress ${args.title} into a sellable promise, proof signal, and visual hook.`, slideCount: 1 },
    { title: "Prologue", summary: "Open with the reader's tension, fear, desire, or change moment.", slideCount: 2 },
    { title: "Credibility", summary: "Show why this source, method, author, or proof should be trusted.", slideCount: 1 },
    { title: "Preview map", summary: "Show what the reader gets now and what the full product unlocks later.", slideCount: 1 },
    ...sections,
    { title: "Useful sample", summary: "Give one immediately useful prompt, checklist, script, template, or command sequence from the source.", slideCount: 1 },
    { title: "Friction relief", summary: "Address a likely beginner failure point or objection before the CTA.", slideCount: 1 },
    { title: "Full-version teaser", summary: "Tease deeper strategy, examples, workflows, or checklists without hiding the value already given.", slideCount: 1 },
    { title: "CTA", summary: "Close with a clear next step and a reason to continue.", slideCount: 1 },
  ];
}

function buildEbookPrompt(args: {
  title: string;
  author: string;
  coreMessage: string;
  targetAudience: string;
  sourceText: string;
  ebookStyle: EbookStyle;
  accentColor: string;
}): string {
  const stylePrompt = STYLE_PROMPTS[args.ebookStyle];
  const sections = buildSalesSections(args);
  const sectionsText = sections
    .map((section, i) => `Beat ${i + 1}: ${section.title} - ${section.summary}`)
    .join("\n");

  return `Generate a complete HTML/CSS A5 slide preview.

Title: ${args.title}
Author: ${args.author}
Core message: ${args.coreMessage}
Target audience: ${args.targetAudience}
Accent color: ${args.accentColor}
Style: ${args.ebookStyle} - ${stylePrompt}
Style rules:
${STYLE_RULES[args.ebookStyle]}

Suggested preview journey, not a fixed outline:
${sectionsText}

Source material:
${args.sourceText.slice(0, 36000) || "(no source provided)"}

Hard requirements:
- Output only JSON with one "html" field
- Use <div class="slide" data-slide="N"> for every slide
- Each .slide must be exactly ${EBOOK_WIDTH_PX}px x ${EBOOK_HEIGHT_PX}px and overflow: hidden
- Use @page size 148mm 210mm, zero page margin, and page-break-after/break-after on every .slide
- Use only browser-safe CSS colors: hex, rgb, rgba, hsl, hsla, named colors, or variables that resolve to those values
- Do not use color(), color-mix(), oklch(), lab(), or lch()
- Include a cover, a contents/map slide, at least one chapter divider, at least one practical sample, at least one full-version teaser, and a final CTA
- Write real content from the source; no placeholders, lorem ipsum, or generic filler

Creative brief:
- Treat this as a paid-product free preview, closer to a compact sales deck than a plain document.
- Design the cover as a conversion surface: category cue, memorable promise, proof signal, byline/brand, and a strong visual gesture may all be used, but choose the exact arrangement yourself.
- Shape the main slides as a reader journey: tension, credibility, useful value, friction relief, full-version desire, next step.
- Use editorial components as needed: labels, rules, proof chips, dotted contents rows, quote blocks, note boxes, command/code blocks, timelines, checklists, locked/full-version teasers, CTA panels.
- Use components because they clarify, sell, or teach. Do not decorate every slide with the same boxes or badges.
- Decide header/footer chrome per slide based on orientation and style. It may contain section cues, progress, page number, author mark, compact title, or nothing when the slide design is stronger without it.
- Keep visual autonomy: choose margins, type sizes, grid, contrast, density, component mix, and cover composition to fit the selected style.
- Make the selected style visibly affect the system, not only the colors.
- Rewrite weak input copy into stronger cover and slide copy. Keep names, facts, proof, and claims accurate, but do not paste briefing fields into a fixed template.
- Choose the final slide count yourself after reading the source. A focused free preview is usually 10-18 slides; use more only when the source has enough distinct, useful material.
- If source text is too long, rewrite and compress; do not reduce text below readable size to force fit.
- Use the accent color ${args.accentColor} as one part of the design system, not the entire design.
- Import typography that fits the style and content language.
- Return { "html": "complete html document string" }`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sourceParagraphs(sourceText: string) {
  return sourceText
    .split(/\n{2,}|\r?\n/)
    .map((line) => line.replace(/^#{1,6}\s+/, "").trim())
    .filter((line) => line.length > 24)
    .slice(0, 40);
}

function slidesFromSalesSections(sections: SalesSection[], requestedSlideCount: number) {
  const slides = sections.flatMap((section, sectionIndex) => {
    const count = Math.max(1, Math.min(8, Math.round(Number(section.slideCount) || 1)));
    return Array.from({ length: count }, (_, index) => ({
      title: index === 0 ? section.title : `${section.title} ${index + 1}`,
      summary: section.summary,
      sectionTitle: section.title,
      sectionIndex,
      sectionSlideIndex: index,
    }));
  });

  return slides.slice(0, Math.max(1, requestedSlideCount));
}

function salesSectionSlideCount(sections: SalesSection[]) {
  const count = sections.reduce((sum, section) => sum + Math.max(1, Math.round(Number(section.slideCount) || 1)), 0);
  return Math.max(1, count);
}

function isUsableEbookHtml(html: string) {
  return validateCelionSlideHtml(html, {
    minSlides: 8,
    minVisibleTextLength: 500,
  }).ok;
}

function styleClassName(style: EbookStyle) {
  return `style-${style.replace(/[^a-z0-9-]/gi, "-")}`;
}

function fallbackStyleCss(style: EbookStyle, accent: string) {
  const base = `
    @page { size: 148mm 210mm; margin: 0; }
    :root { --accent: ${accent}; --ink: #18181b; --muted: #71717a; --paper: #ffffff; --line: #e4e4e7; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body { margin: 0; padding: 0; }
    body { background: #e5e7eb; color: var(--ink); font-family: "Segoe UI", Arial, sans-serif; word-break: keep-all; }
    .slide { position: relative; width: ${EBOOK_WIDTH_PX}px; height: ${EBOOK_HEIGHT_PX}px; aspect-ratio: ${EBOOK_ASPECT_RATIO}; margin: 0 auto 18px; padding: 52px 46px 64px; overflow: hidden; background: var(--paper); box-shadow: 0 8px 28px rgba(24, 24, 27, 0.13); page-break-after: always; break-after: page; }
    .cover { display: flex; flex-direction: column; justify-content: flex-end; }
    .visual-mark { position: absolute; pointer-events: none; }
    .kicker, .eyebrow, .label { margin: 0 0 14px; color: var(--accent); font-size: 10px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; }
    h1 { max-width: 410px; margin: 0 0 20px; font-size: 48px; line-height: 0.98; font-weight: 800; letter-spacing: -0.03em; }
    h2 { margin: 0 0 18px; font-size: 34px; line-height: 1.04; font-weight: 760; letter-spacing: -0.025em; }
    p { margin: 0 0 12px; max-width: 430px; font-size: 15px; line-height: 1.62; }
    .lead { font-size: 18px; line-height: 1.45; color: #3f3f46; }
    .summary { color: #52525b; font-weight: 520; }
    .meta { margin-top: 56px; padding-top: 14px; border-top: 1px solid #d4d4d8; color: #71717a; font-size: 12px; }
    .rule { width: 62px; height: 4px; margin: 0 0 28px; background: var(--accent); }
    .slide-header { position: absolute; left: 46px; right: 46px; top: 28px; display: flex; justify-content: space-between; gap: 18px; color: #a1a1aa; font-size: 9px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
    .slide-footer { position: absolute; left: 46px; right: 46px; bottom: 28px; display: flex; justify-content: space-between; gap: 18px; color: #a1a1aa; font-size: 10px; }
    .slide-number { color: inherit; }
    .chapter-divider { display: flex; flex-direction: column; justify-content: center; background: #18181b; color: #ffffff; }
    .chapter-divider h2 { color: #ffffff; font-size: 40px; }
    .chapter-divider .summary { color: rgba(255,255,255,0.68); }
    .component-box, .proof-grid, .toc-list, .cta-panel, .locked-teaser, .code-block { border: 1px solid var(--line); padding: 18px; margin-top: 20px; }
    .proof-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .proof-grid strong { display: block; color: var(--accent); font-size: 20px; line-height: 1; margin-bottom: 6px; }
    .toc-list { display: grid; gap: 9px; }
    .toc-row { display: flex; align-items: baseline; gap: 10px; font-size: 13px; }
    .toc-row span:first-child { color: var(--accent); font-weight: 800; width: 28px; flex: 0 0 auto; }
    .code-block { background: #18181b; color: #f8fafc; font-family: "Courier New", monospace; font-size: 11px; line-height: 1.7; white-space: pre-wrap; }
    .locked-teaser { border-color: var(--accent); background: #f8fafc; }
    .cta-panel { background: #18181b; color: #ffffff; border-color: #18181b; }
    .cta-panel p { color: rgba(255,255,255,0.72); }
    .cta-button { display: inline-block; margin-top: 12px; padding: 10px 18px; background: #ffffff; color: #18181b; font-size: 12px; font-weight: 800; text-decoration: none; }
    [data-selected="true"] { outline: 2px solid var(--accent) !important; outline-offset: 2px; }
  `;

  if (style === "editorial") {
    return `${base}
      body { font-family: Georgia, "Times New Roman", serif; }
      .slide { padding: 54px 46px 64px; background: #fbfbf8; }
      .cover { background: linear-gradient(90deg, #111111 0 32%, #fbfbf8 32% 100%); padding-left: 190px; }
      .cover .visual-mark { left: 46px; top: 58px; bottom: 58px; width: 96px; border: 1px solid rgba(255,255,255,0.42); border-top: 14px solid var(--accent); }
      h1, h2 { font-family: Georgia, "Times New Roman", serif; font-weight: 500; letter-spacing: -0.02em; }
      h1 { font-size: 48px; }
      h2 { font-size: 38px; max-width: 430px; }
      .lead, p { font-family: "Segoe UI", Arial, sans-serif; }
      .eyebrow, .kicker { font-family: "Segoe UI", Arial, sans-serif; }
      .summary { padding-left: 16px; border-left: 3px solid var(--accent); font-size: 16px; color: #27272a; }
    `;
  }

  if (style === "neo-brutalism") {
    return `${base}
      body { background: #d9d9d9; font-family: "Courier New", monospace; }
      .slide { padding: 46px; border: 4px solid #111111; box-shadow: 8px 8px 0 #111111; }
      .cover { background: #f8f21c; border-top: 4px solid #111111; }
      .cover .visual-mark { top: 44px; right: 44px; width: 120px; height: 120px; background: var(--accent); border: 4px solid #111111; box-shadow: 8px 8px 0 #111111; }
      h1, h2 { font-family: "Courier New", monospace; text-transform: uppercase; letter-spacing: -0.01em; }
      h1 { font-size: 42px; line-height: 0.98; }
      h2 { font-size: 30px; border-bottom: 4px solid #111111; padding-bottom: 14px; }
      .kicker, .eyebrow { display: inline-block; color: #111111; background: var(--accent); border: 3px solid #111111; padding: 6px 8px; }
      .lead, .summary { color: #111111; font-weight: 700; }
      .meta { border-top: 4px solid #111111; color: #111111; font-weight: 700; }
      .rule { height: 10px; width: 108px; border: 3px solid #111111; }
    `;
  }

  if (style === "bold") {
    return `${base}
      body { background: #101010; }
      .slide { background: #111111; color: #f8fafc; box-shadow: 0 24px 64px rgba(0,0,0,0.28); }
      .cover { background: radial-gradient(circle at 76% 16%, var(--accent) 0 18%, transparent 19%), #111111; }
      .cover .visual-mark { left: 0; top: 0; width: 100%; height: 26px; background: var(--accent); }
      h1 { font-size: 54px; color: #ffffff; }
      h2 { font-size: 40px; color: #ffffff; }
      p { color: #e4e4e7; }
      .lead { color: #fafafa; font-size: 20px; }
      .summary { color: #ffffff; padding: 16px; background: rgba(255,255,255,0.08); border-left: 6px solid var(--accent); }
      .meta { color: #d4d4d8; border-top-color: rgba(255,255,255,0.24); }
      .slide-number { color: rgba(255,255,255,0.42); }
      .rule { width: 142px; height: 8px; }
      .component-box, .proof-grid, .toc-list, .locked-teaser { border-color: rgba(255,255,255,0.18); background: rgba(255,255,255,0.07); }
    `;
  }

  if (style === "elegant") {
    return `${base}
      body { background: #e9e4dc; font-family: Garamond, Georgia, serif; }
      .slide { padding: 62px 54px 68px; background: #fffdf8; box-shadow: 0 12px 36px rgba(72, 59, 42, 0.13); }
      .cover { background: #fffdf8; border: 1px solid #d9d0c1; }
      .cover .visual-mark { inset: 34px; border: 1px solid #d9d0c1; border-top: 6px solid var(--accent); }
      h1, h2 { font-family: Garamond, Georgia, serif; font-weight: 400; letter-spacing: -0.01em; }
      h1 { font-size: 50px; }
      h2 { font-size: 38px; }
      p { font-size: 16px; color: #3d372f; }
      .lead { color: #4a443b; }
      .summary { color: #5b5146; font-style: italic; }
      .kicker, .eyebrow { color: #6b5e4d; letter-spacing: 0.18em; }
      .meta { border-top-color: #d9d0c1; color: #7c7062; }
      .rule { height: 1px; width: 160px; background: #c8bba8; }
    `;
  }

  return `${base}
    .cover { background: #ffffff; border-top: 14px solid var(--accent); }
    .cover .visual-mark { top: 58px; right: 46px; width: 118px; height: 118px; border: 1px solid #d4d4d8; border-top: 8px solid var(--accent); }
    .slide { border: 1px solid #e4e4e7; box-shadow: 0 10px 32px rgba(24, 24, 27, 0.08); }
  `;
}

function slideRole(slide: ReturnType<typeof slidesFromSalesSections>[number], index: number, total: number) {
  const title = slide.sectionTitle.toLowerCase();
  if (index === 0 || title.includes("cover")) return "cover";
  if (index === total - 1 || title.includes("cta")) return "cta";
  if (title.includes("content")) return "contents";
  if (title.includes("proof") || title.includes("author")) return "proof";
  if (title.includes("asset") || title.includes("prompt") || title.includes("code")) return "code";
  if (title.includes("locked") || title.includes("teaser") || title.includes("full")) return "locked";
  if (slide.sectionSlideIndex === 0 && slide.sectionIndex > 3) return "chapter";
  return "body";
}

function buildFallbackEbookHtml(args: {
  title: string;
  author: string;
  coreMessage: string;
  targetAudience: string;
  sourceText: string;
  ebookStyle: EbookStyle;
  accentColor: string;
}) {
  const accent = /^#[0-9a-f]{6}$/i.test(args.accentColor) ? args.accentColor : "#6366f1";
  const styleClass = styleClassName(args.ebookStyle);
  const sourceLines = sourceParagraphs(args.sourceText);
  const sections = buildSalesSections(args);
  const slideCount = salesSectionSlideCount(sections);
  const slides = slidesFromSalesSections(sections, slideCount);

  const slideHtml = slides.map((slide, index) => {
    const sourceLine = sourceLines[index % Math.max(sourceLines.length, 1)] ?? args.coreMessage;
    const role = slideRole(slide, index, slides.length);

    if (role === "cover") {
      return `
        <div class="slide cover ${styleClass}" data-slide="${index + 1}">
          <div class="visual-mark"></div>
          <div class="kicker" data-text-editable="true">Free preview - ${escapeHtml(args.targetAudience || args.ebookStyle)}</div>
          <h1 data-text-editable="true">${escapeHtml(args.title)}</h1>
          <p class="lead" data-text-editable="true">${escapeHtml(args.coreMessage || slide.summary)}</p>
          <div class="meta" data-text-editable="true">${escapeHtml(args.author || "Celion")} - ${escapeHtml(args.targetAudience || "Readers")}</div>
        </div>`;
    }

    if (role === "chapter") {
      return `
      <div class="slide chapter-divider ${styleClass}" data-slide="${index + 1}">
        <div class="eyebrow" data-text-editable="true">Chapter ${slide.sectionIndex - 3}</div>
        <div class="rule"></div>
        <h2 data-text-editable="true">${escapeHtml(slide.sectionTitle)}</h2>
        <p class="summary" data-text-editable="true">${escapeHtml(slide.summary)}</p>
        <div class="slide-footer">
          <span>${escapeHtml(args.author || "Celion")}</span>
          <span class="slide-number">${index + 1} / ${slides.length}</span>
        </div>
      </div>`;
    }

    if (role === "contents") {
      return `
      <div class="slide ${styleClass}" data-slide="${index + 1}">
        <div class="slide-header"><span>Contents</span><span>${escapeHtml(args.title)}</span></div>
        <div class="slide-footer"><span>${escapeHtml(args.author || "Celion")}</span><span class="slide-number">${index + 1} / ${slides.length}</span></div>
        <p class="eyebrow" data-text-editable="true">Contents</p>
        <h2 data-text-editable="true">What you will get</h2>
        <div class="toc-list">
          ${sections.slice(1, 8).map((section, sectionIndex) => `<div class="toc-row"><span>${String(sectionIndex + 1).padStart(2, "0")}</span><p data-text-editable="true">${escapeHtml(section.title)}</p></div>`).join("")}
        </div>
      </div>`;
    }

    if (role === "proof") {
      return `
      <div class="slide ${styleClass}" data-slide="${index + 1}">
        <div class="slide-header"><span>Proof</span><span>${escapeHtml(args.title)}</span></div>
        <div class="slide-footer"><span>${escapeHtml(args.author || "Celion")}</span><span class="slide-number">${index + 1} / ${slides.length}</span></div>
        <p class="eyebrow" data-text-editable="true">Why trust this</p>
        <h2 data-text-editable="true">${escapeHtml(slide.title)}</h2>
        <p class="summary" data-text-editable="true">${escapeHtml(slide.summary || sourceLine)}</p>
        <div class="proof-grid">
          <p data-text-editable="true"><strong>01</strong> Source-backed method</p>
          <p data-text-editable="true"><strong>02</strong> Practical enough to apply</p>
          <p data-text-editable="true"><strong>03</strong> Built for ${escapeHtml(args.targetAudience || "readers")}</p>
          <p data-text-editable="true"><strong>04</strong> Clear next step</p>
        </div>
      </div>`;
    }

    if (role === "code") {
      return `
      <div class="slide ${styleClass}" data-slide="${index + 1}">
        <div class="slide-header"><span>Copy-paste asset</span><span>${escapeHtml(args.title)}</span></div>
        <div class="slide-footer"><span>${escapeHtml(args.author || "Celion")}</span><span class="slide-number">${index + 1} / ${slides.length}</span></div>
        <p class="eyebrow" data-text-editable="true">Use this now</p>
        <h2 data-text-editable="true">${escapeHtml(slide.title)}</h2>
        <div class="code-block" data-text-editable="true">${escapeHtml(sourceLine || `Turn this source into a practical guide for ${args.targetAudience || "my reader"}.\nKeep it specific, proof-led, and easy to act on.`)}</div>
      </div>`;
    }

    if (role === "locked") {
      return `
      <div class="slide ${styleClass}" data-slide="${index + 1}">
        <div class="slide-header"><span>Full version</span><span>${escapeHtml(args.title)}</span></div>
        <div class="slide-footer"><span>${escapeHtml(args.author || "Celion")}</span><span class="slide-number">${index + 1} / ${slides.length}</span></div>
        <p class="eyebrow" data-text-editable="true">Locked section</p>
        <h2 data-text-editable="true">${escapeHtml(slide.title)}</h2>
        <p class="summary" data-text-editable="true">${escapeHtml(slide.summary)}</p>
        <div class="locked-teaser">
          <p data-text-editable="true">The full version can expand this into deeper examples, templates, implementation notes, and final checklists.</p>
        </div>
      </div>`;
    }

    if (role === "cta") {
      return `
      <div class="slide ${styleClass}" data-slide="${index + 1}">
        <div class="cta-panel">
          <p class="eyebrow" data-text-editable="true">Next step</p>
          <h2 data-text-editable="true">${escapeHtml(slide.title)}</h2>
          <p data-text-editable="true">${escapeHtml(slide.summary || "If this preview helped, continue with the full workflow and turn it into a finished result.")}</p>
          <span class="cta-button" data-text-editable="true">Continue with the full version</span>
        </div>
      </div>`;
    }

    return `
      <div class="slide ${styleClass}" data-slide="${index + 1}">
        <div class="slide-header">
          <span>${escapeHtml(slide.sectionTitle)}</span>
          <span>${escapeHtml(args.title)}</span>
        </div>
        <div class="slide-footer">
          <span>${escapeHtml(args.author || "Celion")}</span>
          <span class="slide-number">${index + 1} / ${slides.length}</span>
        </div>
        <div class="rule"></div>
        <p class="eyebrow" data-text-editable="true">${escapeHtml(slide.sectionTitle)}</p>
        <h2 data-text-editable="true">${escapeHtml(slide.title)}</h2>
        <p class="summary" data-text-editable="true">${escapeHtml(slide.summary || args.coreMessage)}</p>
        <p data-text-editable="true">${escapeHtml(sourceLine || "Use this slide to refine the key idea with your own source material.")}</p>
        <div class="component-box"><p data-text-editable="true">${escapeHtml("Make this immediately useful: show the action, the reason it works, and the reader's next move.")}</p></div>
      </div>`;
  }).join("\n");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(args.title)}</title>
  <style>
${fallbackStyleCss(args.ebookStyle, accent)}
  </style>
</head>
<body>
${slideHtml}
</body>
</html>`;
}

export async function generateEbookHtml(args: {
  title: string;
  author: string;
  coreMessage: string;
  targetAudience: string;
  sourceText: string;
  ebookStyle: EbookStyle;
  accentColor: string;
}): Promise<string> {
  let raw: unknown;
  try {
    raw = await generateJsonWithGemini({
      system: EBOOK_SYSTEM,
      user: buildEbookPrompt(args),
      model: EBOOK_GEMINI_MODEL,
      temperature: 0.65,
    });
  } catch {
    return sanitizeEbookHtmlForCanvas(buildFallbackEbookHtml(args));
  }

  const result = raw as { html?: unknown };
  if (!result?.html || typeof result.html !== "string") {
    return sanitizeEbookHtmlForCanvas(buildFallbackEbookHtml(args));
  }

  if (!isUsableEbookHtml(result.html)) {
    return sanitizeEbookHtmlForCanvas(buildFallbackEbookHtml(args));
  }

  return sanitizeEbookHtmlForCanvas(result.html);
}

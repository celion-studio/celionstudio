import { generateJsonWithGemini } from "@/lib/ai/gemini";
import type { EbookOutline, EbookStyle } from "@/types/project";

const STYLE_PROMPTS: Record<EbookStyle, string> = {
  minimal: "clean white space, Inter or system sans-serif, single accent color, generous margins, minimal decoration, lots of breathing room",
  editorial: "magazine layout, strong typographic hierarchy, pull quotes, bold chapter headers, editorial grid, professional and polished",
  "neo-brutalism": "thick black borders, high contrast black and white with one bold accent, monospace or condensed font, raw asymmetric grid, brutalist stark feel",
  bold: "large impactful typography, vibrant color blocks, strong visual weight, modern sans-serif, energetic and dynamic",
  elegant: "serif fonts, refined spacing, subtle color palette, classic book feel, muted tones, timeless and sophisticated",
};

const OUTLINE_SYSTEM = `You are an expert ebook architect. Given a topic and source material, generate a detailed chapter outline for an ebook. Return valid JSON only.`;

const EBOOK_SYSTEM = `You are an expert ebook designer and writer. Generate a complete, beautiful HTML/CSS ebook as a single HTML document. Return JSON with a single "html" field containing the full HTML string.

Rules:
- All CSS must be in a single <style> block in <head>
- Each page is a <div class="page" data-page="N"> element
- A4 dimensions: exactly 794px wide × 1123px tall per page, overflow hidden
- Use Google Fonts via @import for typography
- Include a stunning cover page as page 1
- Make it visually beautiful and professional
- Fill all pages with real, substantive content from the outline
- Return JSON: { "html": "<complete html string>" }`;

function buildOutlinePrompt(args: {
  title: string;
  author: string;
  coreMessage: string;
  targetAudience: string;
  sourceText: string;
  pageCount: number;
  ebookStyle: EbookStyle;
}): string {
  return `Create a chapter outline for this ebook:

Title: ${args.title}
Author: ${args.author}
Core message: ${args.coreMessage}
Target audience: ${args.targetAudience}
Total pages: ${args.pageCount}
Visual style: ${args.ebookStyle}

Source material:
${args.sourceText.slice(0, 3000) || "(no source provided)"}

Return JSON:
{
  "chapters": [
    { "title": "string", "summary": "string", "pageCount": number }
  ]
}

Make pageCount values sum to approximately ${args.pageCount}. Include a cover page (1 page) and a conclusion.`;
}

function buildEbookPrompt(args: {
  title: string;
  author: string;
  coreMessage: string;
  targetAudience: string;
  sourceText: string;
  pageCount: number;
  ebookStyle: EbookStyle;
  accentColor: string;
  outline: EbookOutline;
}): string {
  const stylePrompt = STYLE_PROMPTS[args.ebookStyle];
  const chaptersText = args.outline.chapters
    .map((ch, i) => `Chapter ${i + 1}: ${ch.title} (${ch.pageCount} pages) — ${ch.summary}`)
    .join("\n");

  return `Generate a complete HTML/CSS ebook.

Title: ${args.title}
Author: ${args.author}
Core message: ${args.coreMessage}
Target audience: ${args.targetAudience}
Total pages: ${args.pageCount}
Accent color: ${args.accentColor}
Style: ${args.ebookStyle} — ${stylePrompt}

Outline:
${chaptersText}

Source material:
${args.sourceText.slice(0, 4000) || "(no source provided)"}

Requirements:
- Each <div class="page"> must be exactly 794px × 1123px
- Use the accent color ${args.accentColor} for highlights
- Import Google Fonts appropriate for ${args.ebookStyle} style
- Page 1 = stunning cover with title, author, visual design
- Last page = conclusion / call to action
- Write FULL content for each chapter, not placeholders
- Return { "html": "complete html document string" }`;
}

export async function generateEbookOutline(args: {
  title: string;
  author: string;
  coreMessage: string;
  targetAudience: string;
  sourceText: string;
  pageCount: number;
  ebookStyle: EbookStyle;
}): Promise<EbookOutline> {
  const raw = await generateJsonWithGemini({
    system: OUTLINE_SYSTEM,
    user: buildOutlinePrompt(args),
  });

  const result = raw as { chapters?: unknown[] };
  if (!result?.chapters || !Array.isArray(result.chapters)) {
    throw new Error("AI returned invalid outline structure.");
  }

  return {
    chapters: result.chapters.map((ch: unknown) => {
      const c = ch as { title?: string; summary?: string; pageCount?: number };
      return {
        title: String(c.title ?? "Untitled"),
        summary: String(c.summary ?? ""),
        pageCount: Number(c.pageCount ?? 2),
      };
    }),
  };
}

export async function generateEbookHtml(args: {
  title: string;
  author: string;
  coreMessage: string;
  targetAudience: string;
  sourceText: string;
  pageCount: number;
  ebookStyle: EbookStyle;
  accentColor: string;
  outline: EbookOutline;
}): Promise<string> {
  const raw = await generateJsonWithGemini({
    system: EBOOK_SYSTEM,
    user: buildEbookPrompt(args),
  });

  const result = raw as { html?: unknown };
  if (!result?.html || typeof result.html !== "string") {
    throw new Error("AI returned invalid ebook HTML.");
  }

  return result.html;
}

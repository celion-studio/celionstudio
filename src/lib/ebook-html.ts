import {
  EBOOK_PAGE_SIZE_CSS_MM,
  EBOOK_PAGE_SIZE_MM,
  EBOOK_PAGE_SIZE_PX,
} from "./ebook-format";

const UNSUPPORTED_COLOR_FUNCTIONS = ["color-mix", "oklch", "lab", "lch", "color"] as const;

export const CELION_A5_SLIDE_HTML_SPEC = [
  "Single complete HTML document with one <style> block in <head>",
  'Every page is <div class="slide" data-slide="N">',
  `Each .slide is fixed at ${EBOOK_PAGE_SIZE_PX.width}px x ${EBOOK_PAGE_SIZE_PX.height}px or ${EBOOK_PAGE_SIZE_MM.width}mm x ${EBOOK_PAGE_SIZE_MM.height}mm`,
  "Each .slide uses overflow: hidden and page-break-after/break-after",
  `@page is ${EBOOK_PAGE_SIZE_CSS_MM} with zero margin`,
  "CSS colors are export-safe: hex, rgb, rgba, hsl, hsla, named colors, or variables resolving to those values",
  "Unsupported CSS color functions are not part of the format: color(), color-mix(), oklch(), lab(), lch()",
] as const;

type ValidateCelionSlideHtmlOptions = {
  minSlides?: number;
  minVisibleTextLength?: number;
  allowGenericOutlineHeadings?: boolean;
};

export type CelionSlideHtmlValidation = {
  ok: boolean;
  errors: string[];
  slideCount: number;
};

export function countCelionSlides(html: string) {
  return [...html.matchAll(/<div[^>]+class=["']([^"']*)["'][^>]*>/gi)]
    .filter((match) => match[1]?.split(/\s+/).includes("slide"))
    .length;
}

export function normalizeEbookHtmlSlideContract(html: string) {
  return html
    .replace(/\sdata-page=(["'])([^"']+)\1/gi, ' data-slide="$2"')
    .replace(/\.page(?![-_a-z0-9])/gi, ".slide")
    .replace(/\bclass=(["'])([^"']*)\1/gi, (_match, quote: string, className: string) => {
      const classes = className
        .split(/\s+/)
        .map((item) => (item === "page" ? "slide" : item))
        .filter(Boolean);
      return `class=${quote}${[...new Set(classes)].join(" ")}${quote}`;
    });
}

function hasUnsupportedColorFunction(html: string) {
  for (let index = 0; index < html.length; index += 1) {
    if (findUnsupportedColorFunction(html, index)) return true;
  }

  return false;
}

function visibleTextLength(html: string) {
  return visibleText(html).length;
}

function visibleText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, "\"")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function hasGenericOutlineHeadings(html: string) {
  const text = visibleText(html).toLowerCase();
  return [
    /\bthe core idea(?:\s+\d+)?\b/,
    /\bwhy this matters now(?:\s+\d+)?\b/,
    /\bhow to apply it(?:\s+\d+)?\b/,
    /\bcommon mistakes(?:\s+\d+)?\b/,
    /\bprologue(?:\s+\d+)?\b/,
    /\bslide\s+\d+\b/,
  ].some((pattern) => pattern.test(text));
}

function hasPageClassToken(html: string) {
  return [...html.matchAll(/\bclass=(["'])([^"']*)\1/gi)]
    .some((match) => match[2]?.split(/\s+/).includes("page"));
}

export function validateCelionSlideHtml(
  html: string,
  options: ValidateCelionSlideHtmlOptions = {},
): CelionSlideHtmlValidation {
  const errors: string[] = [];
  const slideCount = countCelionSlides(html);
  const minSlides = options.minSlides ?? 1;
  const minVisibleTextLength = options.minVisibleTextLength ?? 0;

  if (!/<!doctype html>|<html[\s>]/i.test(html)) {
    errors.push("Output must be a complete HTML document.");
  }
  if (!/<style[\s\S]*?<\/style>/i.test(html)) {
    errors.push("Output must include a <style> block.");
  }
  if (slideCount < minSlides) {
    errors.push(`Output must include at least ${minSlides} .slide elements.`);
  }
  if (hasPageClassToken(html) || /\bdata-page=/i.test(html)) {
    errors.push("Output must use .slide/data-slide, not .page/data-page.");
  }
  const pageSizePattern = new RegExp(`@page\\s*\\{[^}]*${EBOOK_PAGE_SIZE_MM.width}mm\\s+${EBOOK_PAGE_SIZE_MM.height}mm[^}]*margin\\s*:\\s*0`, "i");
  const fixedWidthPattern = new RegExp(`width\\s*:\\s*(${EBOOK_PAGE_SIZE_PX.width}px|${EBOOK_PAGE_SIZE_MM.width}mm)`, "i");
  const fixedHeightPattern = new RegExp(`height\\s*:\\s*(${EBOOK_PAGE_SIZE_PX.height}px|${EBOOK_PAGE_SIZE_MM.height}mm)`, "i");

  if (!pageSizePattern.test(html)) {
    errors.push(`Output must include @page { size: ${EBOOK_PAGE_SIZE_CSS_MM}; margin: 0; }.`);
  }
  if (!fixedWidthPattern.test(html) || !fixedHeightPattern.test(html)) {
    errors.push("Slides must declare fixed A5 dimensions.");
  }
  if (!/\.slide\b[\s\S]*?overflow\s*:\s*hidden/i.test(html)) {
    errors.push("Slides must use overflow: hidden.");
  }
  if (!/\.slide\b[\s\S]*?(page-break-after|break-after)\s*:\s*(always|page)/i.test(html)) {
    errors.push("Slides must declare page-break-after or break-after.");
  }
  if (hasUnsupportedColorFunction(html)) {
    errors.push("Output uses CSS color functions unsupported by html2canvas.");
  }
  if (!options.allowGenericOutlineHeadings && hasGenericOutlineHeadings(html)) {
    errors.push("Output must not use repeated generic outline headings as visible slide copy.");
  }
  if (visibleTextLength(html) < minVisibleTextLength) {
    errors.push(`Output must include at least ${minVisibleTextLength} visible text characters.`);
  }

  return { ok: errors.length === 0, errors, slideCount };
}

function isNameBoundary(value: string, index: number) {
  if (index < 0 || index >= value.length) return true;
  return !/[a-z0-9_-]/i.test(value[index] ?? "");
}

function findUnsupportedColorFunction(value: string, index: number) {
  for (const name of UNSUPPORTED_COLOR_FUNCTIONS) {
    if (
      value.slice(index, index + name.length).toLowerCase() === name &&
      isNameBoundary(value, index - 1) &&
      value[index + name.length] === "("
    ) {
      return name;
    }
  }

  return undefined;
}

function findMatchingParen(value: string, openIndex: number) {
  let depth = 0;
  for (let i = openIndex; i < value.length; i += 1) {
    const char = value[i];
    if (char === "(") depth += 1;
    if (char === ")") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }

  return -1;
}

function fallbackColorForContext(value: string, index: number) {
  const declarationStart = Math.max(value.lastIndexOf(";", index), value.lastIndexOf("{", index));
  const declaration = value.slice(declarationStart + 1, index).toLowerCase();

  if (declaration.includes("box-shadow") || declaration.includes("shadow")) {
    return "rgba(0,0,0,0.14)";
  }
  if (declaration.includes("background")) {
    return "#f8fafc";
  }
  if (declaration.includes("border")) {
    return "#e4e4e7";
  }

  return "#18181b";
}

export function sanitizeEbookHtmlForCanvas(html: string) {
  let result = "";
  let index = 0;

  while (index < html.length) {
    const functionName = findUnsupportedColorFunction(html, index);
    if (!functionName) {
      result += html[index] ?? "";
      index += 1;
      continue;
    }

    const openIndex = index + functionName.length;
    const closeIndex = findMatchingParen(html, openIndex);
    if (closeIndex === -1) {
      result += html[index] ?? "";
      index += 1;
      continue;
    }

    result += fallbackColorForContext(html, index);
    index = closeIndex + 1;
  }

  return result;
}

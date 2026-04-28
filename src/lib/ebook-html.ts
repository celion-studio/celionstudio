const UNSUPPORTED_COLOR_FUNCTIONS = ["color-mix", "oklch", "lab", "lch", "color"] as const;

export const CELION_A5_SLIDE_HTML_SPEC = [
  "Single complete HTML document with one <style> block in <head>",
  'Every page is <div class="slide" data-slide="N">',
  "Each .slide is fixed at 559px x 794px or 148mm x 210mm",
  "Each .slide uses overflow: hidden and page-break-after/break-after",
  "@page is 148mm 210mm with zero margin",
  "CSS colors are export-safe: hex, rgb, rgba, hsl, hsla, named colors, or variables resolving to those values",
  "Unsupported CSS color functions are not part of the format: color(), color-mix(), oklch(), lab(), lch()",
] as const;

type ValidateCelionSlideHtmlOptions = {
  minSlides?: number;
  minVisibleTextLength?: number;
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

function hasUnsupportedColorFunction(html: string) {
  for (let index = 0; index < html.length; index += 1) {
    if (findUnsupportedColorFunction(html, index)) return true;
  }

  return false;
}

function visibleTextLength(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .length;
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
  if (/\bclass=["'][^"']*\bpage\b/i.test(html) || /\bdata-page=/i.test(html)) {
    errors.push("Output must use .slide/data-slide, not .page/data-page.");
  }
  if (!/@page\s*\{[^}]*148mm\s+210mm[^}]*margin\s*:\s*0/i.test(html)) {
    errors.push("Output must include @page { size: 148mm 210mm; margin: 0; }.");
  }
  if (!/width\s*:\s*(559px|148mm)/i.test(html) || !/height\s*:\s*(794px|210mm)/i.test(html)) {
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

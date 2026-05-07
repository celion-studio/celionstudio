import type { ProjectSource } from "@/types/project";

export const MAX_TITLE_LENGTH = 200;
export const MAX_SOURCE_TEXT_LENGTH = 100_000;
export const MAX_SOURCES = 8;
export const MAX_SOURCE_CONTENT_LENGTH = 50_000;
export const MAX_TOTAL_SOURCE_CONTENT_LENGTH = 120_000;

export const MAX_SAVE_HTML_LENGTH = 1_000_000;
export const MAX_EBOOK_DOCUMENT_JSON_LENGTH = 1_250_000;
export const MAX_EBOOK_DOCUMENT_PAGES = 30;
export const MAX_EBOOK_PAGE_HTML_LENGTH = 90_000;
export const MAX_EBOOK_PAGE_CSS_LENGTH = 90_000;
export const MAX_EBOOK_THEME_CSS_LENGTH = 30_000;

type SourceLimitInput = Pick<ProjectSource, "content">;

export function validateSourceLimits(sources: SourceLimitInput[]) {
  if (sources.length > MAX_SOURCES) {
    return `Too many sources. Maximum is ${MAX_SOURCES}.`;
  }

  let totalSourceContentLength = 0;
  for (const source of sources) {
    if (source.content.length > MAX_SOURCE_CONTENT_LENGTH) {
      return `Source content is too long. Maximum is ${MAX_SOURCE_CONTENT_LENGTH} characters per source.`;
    }
    totalSourceContentLength += source.content.length;
  }

  if (totalSourceContentLength > MAX_TOTAL_SOURCE_CONTENT_LENGTH) {
    return `Total source content is too long. Maximum is ${MAX_TOTAL_SOURCE_CONTENT_LENGTH} characters.`;
  }

  return null;
}

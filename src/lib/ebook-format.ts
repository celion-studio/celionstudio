export const EBOOK_PAGE_SIZE_PX = {
  width: 559,
  height: 794,
  unit: "px",
} as const;

export const EBOOK_PAGE_SIZE_MM = {
  width: 148,
  height: 210,
  unit: "mm",
} as const;

export const EBOOK_PDF_A5_SIZE_PT = {
  width: 419.53,
  height: 595.28,
  unit: "pt",
} as const;

export const EBOOK_PAGE_SIZE_CSS_PX = `${EBOOK_PAGE_SIZE_PX.width}px x ${EBOOK_PAGE_SIZE_PX.height}px`;
export const EBOOK_PAGE_SIZE_CSS_MM = `${EBOOK_PAGE_SIZE_MM.width}mm ${EBOOK_PAGE_SIZE_MM.height}mm`;

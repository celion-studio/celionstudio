export const SLIDE_SIZE_PX = {
  width: 559,
  height: 794,
  unit: "px",
} as const;

export const SLIDE_SIZE_MM = {
  width: 148,
  height: 210,
  unit: "mm",
} as const;

export const EBOOK_PDF_A5_SIZE_PT = {
  width: 419.53,
  height: 595.28,
  unit: "pt",
} as const;

export const SLIDE_SIZE_CSS_PX = `${SLIDE_SIZE_PX.width}px x ${SLIDE_SIZE_PX.height}px`;
export const SLIDE_SIZE_CSS_MM = `${SLIDE_SIZE_MM.width}mm ${SLIDE_SIZE_MM.height}mm`;

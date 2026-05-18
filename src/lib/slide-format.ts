export type CelionSlideFormat = "a5_portrait" | "16_9_landscape";

export const SLIDE_FORMATS = {
  a5_portrait: {
    width: 559,
    height: 794,
    label: "A5 세로",
    unit: "px",
  },
  "16_9_landscape": {
    width: 1280,
    height: 720,
    label: "16:9 가로",
    unit: "px",
  },
} as const;

export const SLIDE_SIZE_PX = SLIDE_FORMATS.a5_portrait;

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

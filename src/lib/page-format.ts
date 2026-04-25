export type PageFormat =
  | "ebook"
  | "kindle"
  | "tablet"
  | "mobile"
  | "a5"
  | "a4"
  | "a3"
  | "a2"
  | "custom";

export type PageSize = {
  widthMm: number;
  heightMm: number;
};

export type PageFormatSpec = {
  id: PageFormat;
  label: string;
  group: "ebook" | "print" | "custom";
  description: string;
  widthMm: number;
  heightMm: number;
  previewWidth: number;
  pagePadding: string;
  headerHeightPx: number;
  footerHeightPx: number;
};

export const DEFAULT_PAGE_FORMAT: PageFormat = "ebook";
export const DEFAULT_CUSTOM_PAGE_SIZE: PageSize = { widthMm: 152, heightMm: 229 };

export const PAGE_FORMATS: PageFormatSpec[] = [
  {
    id: "ebook",
    label: "Ebook",
    group: "ebook",
    description: "Default 6x9 reader format",
    widthMm: 152,
    heightMm: 229,
    previewWidth: 720,
    pagePadding: "28px 72px 36px",
    headerHeightPx: 32,
    footerHeightPx: 32,
  },
  {
    id: "kindle",
    label: "Kindle",
    group: "ebook",
    description: "Compact e-reader preview",
    widthMm: 108,
    heightMm: 162,
    previewWidth: 620,
    pagePadding: "16px 48px 22px",
    headerHeightPx: 28,
    footerHeightPx: 28,
  },
  {
    id: "tablet",
    label: "Tablet",
    group: "ebook",
    description: "Wide tablet reading layout",
    widthMm: 180,
    heightMm: 240,
    previewWidth: 800,
    pagePadding: "28px 76px 36px",
    headerHeightPx: 32,
    footerHeightPx: 32,
  },
  {
    id: "mobile",
    label: "Mobile",
    group: "ebook",
    description: "Tall phone reader preview",
    widthMm: 86,
    heightMm: 160,
    previewWidth: 520,
    pagePadding: "10px 32px 14px",
    headerHeightPx: 24,
    footerHeightPx: 24,
  },
  {
    id: "a5",
    label: "A5",
    group: "print",
    description: "Small printable booklet",
    widthMm: 148,
    heightMm: 210,
    previewWidth: 700,
    pagePadding: "32px 80px 40px",
    headerHeightPx: 36,
    footerHeightPx: 36,
  },
  {
    id: "a4",
    label: "A4",
    group: "print",
    description: "Standard print sheet",
    widthMm: 210,
    heightMm: 297,
    previewWidth: 820,
    pagePadding: "36px 88px 48px",
    headerHeightPx: 40,
    footerHeightPx: 40,
  },
  {
    id: "a3",
    label: "A3",
    group: "print",
    description: "Large print sheet",
    widthMm: 297,
    heightMm: 420,
    previewWidth: 980,
    pagePadding: "40px 96px 54px",
    headerHeightPx: 44,
    footerHeightPx: 44,
  },
  {
    id: "a2",
    label: "A2",
    group: "print",
    description: "Poster-scale sheet",
    widthMm: 420,
    heightMm: 594,
    previewWidth: 1120,
    pagePadding: "48px 104px 60px",
    headerHeightPx: 48,
    footerHeightPx: 48,
  },
];

const pageFormatIds = new Set<PageFormat>([
  "ebook",
  "kindle",
  "tablet",
  "mobile",
  "a5",
  "a4",
  "a3",
  "a2",
  "custom",
]);

function clampMm(value: unknown, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(Math.max(Math.round(numeric), 50), 800);
}

export function normalizePageFormat(value: unknown): PageFormat {
  return typeof value === "string" && pageFormatIds.has(value as PageFormat)
    ? (value as PageFormat)
    : DEFAULT_PAGE_FORMAT;
}

export function normalizePageSize(value: unknown): PageSize {
  if (typeof value !== "object" || value === null) return DEFAULT_CUSTOM_PAGE_SIZE;
  const raw = value as Partial<PageSize>;
  const widthMm = clampMm(raw.widthMm, DEFAULT_CUSTOM_PAGE_SIZE.widthMm);
  const heightMm = clampMm(raw.heightMm, DEFAULT_CUSTOM_PAGE_SIZE.heightMm);

  return {
    widthMm: Math.min(widthMm, heightMm),
    heightMm: Math.max(widthMm, heightMm),
  };
}

export function getPageFormatSpec(
  value: unknown,
  customPageSize?: unknown,
): PageFormatSpec {
  const pageFormat = normalizePageFormat(value);
  if (pageFormat === "custom") {
    const size = normalizePageSize(customPageSize);
    const ratio = size.heightMm > 0 ? size.widthMm / size.heightMm : 0.66;
    const previewWidth = Math.min(Math.max(Math.round(760 * ratio), 520), 1040);

    return {
      id: "custom",
      label: "Custom",
      group: "custom",
      description: `${size.widthMm} x ${size.heightMm} mm`,
      widthMm: size.widthMm,
      heightMm: size.heightMm,
      previewWidth,
      pagePadding: "28px 72px 36px",
      headerHeightPx: 32,
      footerHeightPx: 32,
    };
  }

  return (
    PAGE_FORMATS.find((format) => format.id === pageFormat) ?? PAGE_FORMATS[0]!
  );
}

export function getPageCssSize(format: PageFormat, customPageSize?: PageSize) {
  const spec = getPageFormatSpec(format, customPageSize);
  return `${spec.widthMm}mm ${spec.heightMm}mm`;
}

export const EBOOK_STYLE_IDS = [
  "minimal",
  "editorial",
  "neo-brutalism",
  "bold",
  "elegant",
] as const;

export type EbookStyle = (typeof EBOOK_STYLE_IDS)[number];

export const EBOOK_STYLE_OPTIONS: Array<{
  id: EbookStyle;
  label: string;
  desc: string;
  preview: string;
}> = [
  {
    id: "minimal",
    label: "Minimal",
    desc: "Clean white space, generous margins, single accent",
    preview: "bg-white border-2 border-gray-100",
  },
  {
    id: "editorial",
    label: "Editorial",
    desc: "Magazine-style, strong type hierarchy, bold headers",
    preview: "bg-gray-50 border-2 border-gray-200",
  },
  {
    id: "neo-brutalism",
    label: "Neo Brutalism",
    desc: "Thick borders, high contrast, stark typography",
    preview: "bg-yellow-50 border-4 border-black",
  },
  {
    id: "bold",
    label: "Bold",
    desc: "Large impactful type, vibrant color blocks",
    preview: "bg-gray-900 border-2 border-gray-700",
  },
  {
    id: "elegant",
    label: "Elegant",
    desc: "Serif fonts, refined spacing, classic book feel",
    preview: "bg-stone-50 border-2 border-stone-200",
  },
];

export const EBOOK_STYLE_LABELS = Object.fromEntries(
  EBOOK_STYLE_OPTIONS.map((style) => [style.id, style.label]),
) as Record<EbookStyle, string>;

export const EBOOK_STYLE_PROMPTS: Record<EbookStyle, string> = {
  minimal: "quiet Swiss editorial system, white space, hairline rules, precise labels, restrained accent use",
  editorial: "magazine/report system, confident typographic hierarchy, pull quotes, chapter rhythm, asymmetric editorial grid",
  "neo-brutalism": "raw high-contrast system, hard borders, monospace details, sticker-like labels, practical code/prompt surfaces",
  bold: "oversized type, decisive contrast, energetic pacing, strong color blocks, confident editorial impact",
  elegant: "refined publishing system, serif-led hierarchy, quiet frames, warm paper, subtle proof and note components",
};

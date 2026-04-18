# Celion — Quiet Editorial Redesign

## Overview

Redesign Celion's frontend to a "Quiet Editorial" aesthetic: Perplexity/Claude clean + celon.ai warmth. Light theme, Instrument Serif display, Geist Sans body, warm amber-terracotta accent.

## Design Tokens

| Token | Value | Usage |
|---|---|---|
| `--color-bg` | `#FAF9F5` | Page background |
| `--color-surface` | `#FFFFFF` | Cards, panels |
| `--color-surface-subtle` | `#F4F2EC` | Nested regions, sidebar |
| `--color-text` | `#1F1F1F` | Primary text |
| `--color-muted` | `#7A7670` | Labels, secondary text |
| `--color-line` | `#E8E4DB` | Borders, dividers |
| `--color-accent` | `#C4622D` | Terracotta amber — CTA, active states |
| `--color-accent-soft` | `#FBF0E8` | Accent background tint |

## Typography

- **Display**: Instrument Serif (Google Fonts) — h1, h2, card titles
- **Body**: Geist Sans (next/font/google) — all UI text, labels, descriptions
- **Mono**: IBM Plex Mono — unchanged (tags, status badges)

## What Changes

### Removed
- `bg-mesh` radial gradient (lime + orange) → solid `#FAF9F5`
- Large rounded containers (`rounded-[36px]`, `rounded-[34px]`) → `rounded-2xl`
- `shadow-float` → `shadow-sm` + border

### Landing (Hero)
- Remove outer container card — page is the canvas
- h1: Instrument Serif 72px, tight leading
- CTA button: `bg-accent` (#C4622D), white text
- Feature cards: `bg-white border border-line rounded-2xl shadow-sm`

### Dashboard
- Remove wrapper card — direct layout on `#FAF9F5`
- "Your guides" heading: Instrument Serif 40px
- New guide button: accent
- Guide cards: `bg-white border border-line rounded-2xl`, hover → `border-accent`

### Builder
- Top bar: thinner (py-3), `bg-white`, border-bottom only
- SourcePanel: `bg-[#F4F2EC]`
- PreviewPanel: `bg-white`
- ActionPanel: `bg-white`, border-left only
- Primary buttons: accent; secondary: ghost (border only)

### Wizard
- Overlay: `bg-black/40`
- Container: `bg-white rounded-2xl`
- Step sidebar: `bg-[#F4F2EC]`, active step `bg-accent text-white`

## Files to Change

1. `src/styles/globals.css` — CSS variables
2. `src/app/layout.tsx` — swap fonts (add Instrument Serif, Geist)
3. `tailwind.config.ts` — update token names, remove mesh gradient
4. `src/components/marketing/Hero.tsx`
5. `src/components/dashboard/DashboardShell.tsx`
6. `src/components/dashboard/GuideList.tsx`
7. `src/components/dashboard/NewGuideButton.tsx`
8. `src/components/builder/BuilderShell.tsx`
9. `src/components/builder/SourcePanel.tsx`
10. `src/components/builder/PreviewPanel.tsx`
11. `src/components/builder/ActionPanel.tsx`
12. `src/components/wizard/GuideWizard.tsx`
13. `src/components/wizard/SourceStep.tsx`
14. `src/components/wizard/ProfileStep.tsx`
15. `src/components/wizard/StyleStep.tsx`

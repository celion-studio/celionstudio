# Celion Design System

## Overview

Celion is an AI-powered publishing workspace that turns source material into polished ebooks. The product feels like quiet publishing software: muted, precise, editorial, and operational.

**North Star**: Muted Minimalist Swiss Editorial SaaS — restrained, useful, exact.

## Product Personality

Celion reads as quiet (not empty), editorial (not decorative), precise (not sterile), premium (not luxury), useful (not promotional), and structured (not card-heavy).

Good references: editorial design tools, manuscript review environments, Swiss grid systems, quiet productivity software, print-specimen layouts.

Avoid: generic AI landing pages, purple/blue gradient SaaS, Notion-like beige dashboards, colorful status badges, oversized rounded cards, decorative blobs, glassmorphism, bokeh.

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19
- **Styling**: Tailwind CSS 3, PostCSS, CSS custom properties
- **Language**: TypeScript 5
- **State**: Zustand
- **Icons**: Lucide React
- **AI**: Google Gemini (Flash-Lite for planning, Pro for generation)
- **Fonts**: Geist (body), Inter (display) via `next/font/google`
- **Exports**: html2canvas + jsPDF (client-side PDF/PNG/JPG)
- **Storage**: Cloudflare R2
- **Auth**: Neon Auth

## Color System

The canonical color tokens are defined in `src/styles/globals.css` as CSS custom properties:

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | `#f6f7f8` | App background |
| `--color-surface` | `#ffffff` | Panels, cards, inputs |
| `--color-surface-subtle` | `#f1f2f4` | Secondary surfaces |
| `--color-muted` | `#858b93` | Secondary text, labels |
| `--color-muted-soft` | `#b6bbc2` | Placeholders, disabled text |
| `--color-text` | `#1f1f1f` | Primary body text |
| `--color-ink` | `#24272c` | Primary heading text |
| `--color-ink-soft` | `#4b515a` | Supporting text |
| `--color-accent` | `#34373d` | Active elements, icons |
| `--color-accent-deep` | `#17191d` | Primary buttons, strong accents |
| `--color-accent-soft` | `#eef0f3` | Subtle accent backgrounds |
| `--color-line` | `#e3e5e8` | Borders, dividers |
| `--color-line-soft` | `#eef0f2` | Subtle dividers |

Tailwind maps these to utility classes: `bg-bg`, `text-text`, `text-muted`, `bg-surface`, `border-line`, `text-accent`, `bg-accent`, etc.

### Rules

- Prefer cool neutral gray over beige, cream, sand, or brown.
- Use black/ink as the primary action color.
- Use borders and hairlines before shadows.
- Use color sparingly and only when it adds meaning.
- Do not introduce blue, green, orange, or purple status pills unless a high-risk warning truly needs attention.
- Avoid semantic bright badges for normal workflow states.

### Component-Level Tokens

Defined in `src/components/ui/celion-style.ts`:

- `CELION_COLOR.appBg`: `#f3f2ef` (editor background)
- `CELION_COLOR.textStrong`: `#18181b` (primary button background)
- `CELION_COLOR.panel`: `#ffffff`
- `CELION_COLOR.panelSoft`: `#f8f7f4`
- `CELION_COLOR.muted`: `#71717A`
- `CELION_COLOR.mutedSoft`: `#A1A1AA`
- `CELION_COLOR.line`: `rgba(28,25,23,0.08)`
- `CELION_COLOR.lineSoft`: `#ECEAE5`

## Typography

Fonts are loaded in `src/app/layout.tsx`:

```ts
// Geist — body text (300, 400, 500, 600)
// Inter — display/heading text (200, 300, 400, 500, 600)
```

| Role | Font | Variable |
|------|------|----------|
| Body | Geist | `--font-body` |
| Display | Inter | `--font-display` |
| Mono | — | `--font-mono` (reserved) |

Tailwind utility classes: `font-body`, `font-display`, `font-mono`.

### Rules

- Prefer weights 400, 500, and 600. Avoid bold-heavy hierarchy.
- Use small, exact labels for operational UI (12–13px).
- Use larger editorial type only for genuinely editorial/brand-led surfaces (landing page, hero).
- Keep letter-spacing at `0` for body text.
- Uppercase micro-labels may use modest tracking: `0.06em` to `0.14em`.
- Do not use oversized marketing typography inside dashboards, panels, cards, or inspector surfaces.
- Global `font-feature-settings: "ss01", "cv11"` on body for refined rendering.

## Spacing & Layout

- **Container**: `max-width: 1180px` (landing), `1120px` (pricing)
- **App panels**: Full-width work surfaces over floating card stacks.
- **Grid**: Use alignment and negative space instead of decoration.
- **Dividers**: 1px hairline dividers, gradient-faded hairline available via `.hairline` class.
- **Cards**: Use only for repeated items, modals, or clearly framed tools. Do not nest cards inside cards.
- **Lists and documents** should be the main visual object.
- Align panels, headers, and tables on clear vertical axes.

### Editor Layout (core product surface)

```
┌─────────────────────────────────────────────────┐
│ Top Bar (56px)                                   │
│  ←Back | Title | Save state | View/Edit | Export │
├──────┬──────────────────────────────┬────────────┤
│ Page │     Preview (640px wide)     │ Inspector  │
│ Rail │     iframe-rendered pages    │ (Edit only)│
│      │                              │            │
└──────┴──────────────────────────────┴────────────┘
```

- Page rail: compact vertical page thumbnails/numbers
- Preview: dominant surface, iframe-based rendering
- Inspector: opens only in Edit mode, shows element text and style controls
- Editor background: `#f3f2ef`

## Radius

| Context | Value |
|---------|-------|
| Controls, buttons, fields, badges, pricing cards | `4px` |
| Segmented controls, inputs (wizard) | `6px` |
| App shells, preview frames, panels | `6px` |
| Larger containers needing softer boundary | `8px` |
| Round elements (avatars) | `50%` |

Avoid radius above `8px` unless there is a specific product reason.

## Borders & Shadows

- **Default**: `1px` neutral borders (`#e3e5e8` or `rgba(28,25,23,0.08)`).
- **Shadows**: Rare and subtle. The only defined shadow is `float`: `0 4px 24px rgba(31, 31, 31, 0.08)`.
- **Pricing cards**: `box-shadow: 0 10px 24px rgba(17, 17, 15, 0.1)`.
- Avoid floating, pillowy SaaS cards with heavy shadows.
- Editor panels use borders only, no box-shadows.

## Buttons & Controls

Defined in `src/components/ui/celion-controls.tsx`:

### Variants

- **Primary** (`CelionButton variant="primary"`): Ink background (`#18181b`), white text, hover: `#2f3034`.
- **Secondary** (`CelionButton variant="secondary"`): White background, `#dfe3e8` border, muted text, hover: `#f4f4f5`.
- **Ghost** (`CelionButton variant="ghost"`): Transparent, muted text, hover: `#f4f4f5`.

### Sizes

- **sm**: 30px min-height, 12.5px font, 0 11px padding.
- **md**: 34px min-height, 13px font, 0 14px padding.

### Icon Button

- 30×30px, transparent background, border appears on hover, used for tool actions.

### Segmented Control

- White background, 1px `#dedee3` border, 30px height.
- Dark tone: ink background for active segment.
- Soft tone: `#eeeeef` background for active segment.

## Wizard (Onboarding)

The wizard is a brief-building flow for ebook creation. Defined in `src/styles/globals.css` under `.wizard-*` classes:

- **Inputs**: 1px `#d9dde2` border, 6px radius, white background, 13.5px font, hover darkens border, focus shows ink border + subtle ring.
- **Purpose selector**: Custom `<details>`-based dropdown. Selected state: `#17191d` background, white text. Dropdown menu: white card with shadow.
- **Tone cards**: White cards with border, active state: `#17191d` background, white text.
- **Labels**: 12.5px, weight 500, color `--color-ink-soft`.
- **Step transitions**: `.step-in` class — 0.32s opacity + translateY animation.

Keep the first step light, group inputs by meaningful briefing decisions, avoid artificial one-field steps, avoid redundant inline validation when buttons already block progression.

## Dashboard

The dashboard should feel like a manuscript desk, not an analytics product.

- Project list is the hero element.
- Keep stats minimal.
- Rows should be quiet, scannable, and table-like.
- Metadata: dates, titles, audience, status.
- Empty states: calm and useful, not promotional.
- Loading: centered muted text, 72px vertical padding.
- Error states: warm neutral alert (`#FFF5F2` background, `#9b4c19` text).

## Editor

The editor is the core product surface. Key characteristics:

- **Modes**: `View` (default, inspector hidden, preview dominant) and `Edit` (inspector visible, elements selectable).
- **Preview**: iframe-rendered, 640px wide, pages stacked with 28px gaps.
- **Page model**: `CelionEbookDocument` — page-level JSON with scoped HTML/CSS per page, manifest-driven element selection.
- **Selection**: Click-to-select in iframe, outlined with `2px solid #18181b`, 2px offset.
- **Inspector**: Text content, font size, weight, alignment, color, background, opacity, border, margin, padding controls.
- **Top bar**: Back navigation, project title, save indicator (saving/saved dots + "saved" label), View/Edit toggle, Export dropdown.
- **Page rail**: Left sidebar with page thumbnails, active page highlighted.

Design rules: keep the center preview dominant, keep the right panel as an inspector (not a workflow launcher), verify multi-page visual consistency.

## Landing Page

Editorial but restrained. Defined in `src/styles/editorial.css`:

- **Hero**: Center-aligned, Geist headings up to 76px, tight line-height (1.05), minimal letter-spacing (-0.05em).
- **Hero CTA cluster**: Primary (dark button with shadow) + Secondary (light button).
- **Navigation**: Sticky dark bar (`#151412` background, 4px radius), 120px gap between brand and actions.
- **Carousel**: 5 ebook cover cards in a radial arrangement with rotation transforms and book-spine pseudo-elements.
- **Process section**: Alternating left/right layout with numbered background (huge faded numerals).
- **Preview band**: Layered paper effect with rotated pseudo-elements.
- **Footer**: Dark `#151412` background, 4-column grid, muted text.

Rules: lead with Celion as a publishing OS, show real document/page objects (not abstract AI graphics), prefer static editorial compositions, avoid gradient backgrounds and decorative blobs.

## Pricing Page

Defined in `src/styles/editorial.css` under `.pricing-*`:

- **Background**: Subtle gradient from `#f6f7f8` through `#f1f2f1`.
- **Hero**: Center-aligned, 76px Geist heading.
- **Proof line**: Horizontal bar with feature labels separated by borders.
- **Plan cards**: 4-column grid, 10px gap, min-height 548px, semi-transparent white background. Featured card: dark `#151412` background.
- **Plan labels**: Uppercase, 10px font, bordered pill.
- **Pricing**: 43px Geist number, cadence in muted text.
- **Feature lists**: Muted text with green check icons.
- **CTAs**: Ink border, hover fills background, featured card has white button.
- **FAQ**: 2-column grid rows, semi-transparent white background.
- **Responsive**: 2-column at 1080px, single-column at 760px.

## Status UI

Workflow status should be quiet. Use neutral backgrounds, neutral text, thin borders, and optional monochrome dots.

Reference pattern:
```
inline-flex items-center gap-1.5 rounded-[4px] border border-line
bg-surface-subtle px-2 py-0.5 text-[11.5px] font-medium text-muted
```
with a 5px accent-colored dot.

Never use: green "Ready", blue "Generating", yellow "Revising", red/orange routine alerts, colorful badge systems.

## Motion

Motion should be quiet and functional.

| Animation | Duration | Easing | Usage |
|-----------|----------|--------|-------|
| `stepIn` | 0.32s | `cubic-bezier(0.22, 1, 0.36, 1)` | Wizard step transitions |
| `rise` | 0.8s | `cubic-bezier(0.22, 1, 0.36, 1)` | Landing page reveals |
| `fade` | 1.6s | `ease-out` | Slow landing reveals |
| `scroll-x` | 50s | `linear` | Marquee tracks |
| `celion-ai-card-in` | 0.18s | `cubic-bezier(0.16, 1, 0.3, 1)` | AI revision card entrance |

### Rules

- Prefer short fades and small vertical transitions.
- Use subtle hover responses (150–200ms transitions).
- Avoid springy/bouncy interactions, dramatic reveal choreography, constant carousel movement in operational UI.
- Respect `prefers-reduced-motion: reduce` — disable all animations.

## Selection Bubble Menu

Used in the landing page editor demo. Dark floating toolbar:

- Background: `#1a1916`, white text at 65% opacity.
- Buttons: 30×28px, transparent, hover: 10% white overlay.
- Dividers: 1px semi-transparent white.
- Active state: 14% white overlay.
- AI button gets extra hover emphasis.

## AI Revision Card

Floating card UI for inline AI revision prompts:

- White background, ink border, subtle shadow.
- Geist input, 14px, 38px height, placeholder in muted.
- Send button: 30×30px ink square top-right, hover: black + lift.
- Focus ring: ink border + subtle outer ring.
- Error: red-tinted bar with 2px left accent.

## Icons

Use **Lucide React** (`lucide-react`) for all icons. Prefer icons for tool actions when a known icon exists. Use text buttons for clear commands.

## Implementation Rules

1. Check `src/styles/globals.css` for existing tokens before adding new styles.
2. Reuse the neutral palette unless there is a clear reason not to.
3. Prefer local consistency over inventing a new visual pattern.
4. Remove beige, colorful badges, excessive radius, unnecessary shadows when touching nearby UI.
5. For editor changes, inspect page 2+ behavior, not just the first page.
6. When uncertain, choose the quieter option.

## Quick Checklist

Before finishing any UI change, verify:

- Does this still look like publishing software?
- Did I add color where structure would have worked?
- Did I create another card when a divider or row would be better?
- Are badges neutral?
- Are controls compact and precise?
- Is the typography calm, with limited weight hierarchy?
- Does this screen match the editor and dashboard language?
- Would this still feel right after the user creates 50 ebooks?
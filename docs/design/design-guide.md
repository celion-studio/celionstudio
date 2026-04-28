# Celion Design Guide

Celion should feel like quiet publishing software: muted, precise, editorial, and operational. The product is not a generic AI SaaS dashboard. It is a calm workspace for turning source material into finished ebooks.

## North Star

**Muted Minimalist Swiss Editorial SaaS**

Use the discipline of Swiss editorial design with the ergonomics of a serious SaaS tool. The UI should feel restrained, useful, and exact. Every screen should look like it belongs to the same publishing system.

Celion should read as:

- quiet, not empty
- editorial, not decorative
- precise, not sterile
- premium, not luxury
- useful, not promotional
- structured, not card-heavy

## Product Personality

Celion is a publishing workspace, not a campaign site and not an admin panel.

Good references:

- editorial design tools
- manuscript review environments
- Swiss grid systems
- quiet productivity software
- print-specimen layouts
- restrained document systems

Bad references:

- generic AI landing pages
- purple/blue gradient SaaS
- Notion-like beige dashboards
- colorful status dashboards
- oversized rounded cards
- decorative blobs, orbs, glassmorphism, or bokeh

## Color

Use the app tokens from `src/styles/globals.css` as the source of truth.

Core palette:

- Background: `#f6f7f8`
- Surface: `#ffffff`
- Subtle surface: `#f1f2f4`
- Ink: `#24272c`
- Soft ink: `#4b515a`
- Muted text: `#858b93`
- Soft muted text: `#b6bbc2`
- Accent: `#34373d`
- Deep accent: `#17191d`
- Line: `#e3e5e8`
- Soft line: `#eef0f2`

Rules:

- Prefer cool neutral gray over beige, cream, sand, or brown.
- Use black/ink as the primary action color.
- Use borders and hairlines before shadows.
- Use color sparingly and only when it adds meaning.
- Avoid semantic bright badges for normal workflow states.
- Do not introduce blue, green, orange, or purple status pills unless a high-risk warning truly needs attention.

## Typography

Current app fonts are Geist and Inter through Next font variables. Use them consistently until a full typography pass is planned.

Rules:

- Prefer 400, 500, and 600 weights.
- Avoid bold-heavy hierarchy.
- Use small, exact labels for operational UI.
- Use larger editorial type only where the page is genuinely editorial or brand-led.
- Keep letter spacing at `0` for body text.
- Uppercase micro-labels may use modest tracking, around `0.06em` to `0.14em`.
- Do not use oversized marketing typography inside dashboards, panels, cards, or inspector surfaces.

## Layout

Celion should use grid, alignment, and negative space instead of decoration.

Rules:

- Prefer full-width work surfaces over floating card stacks.
- Use cards only for repeated items, modals, or clearly framed tools.
- Do not put cards inside cards.
- Keep operational screens dense enough to scan.
- Let lists and documents be the main visual object.
- Align panels, headers, and tables on clear vertical axes.
- Use 1px dividers and quiet section boundaries.

## Radius, Borders, Shadows

Default shape:

- Small controls: `4px` to `6px`
- Cards and modals: `6px` to `8px`
- Avoid radius above `10px` unless there is a specific product reason.

Rules:

- Prefer `1px` neutral borders.
- Shadows should be rare and subtle.
- Avoid floating, pillowy SaaS cards.
- Avoid highly rounded badges and buttons.

## Status UI

Workflow status should be quiet.

Use:

- neutral background
- neutral text
- thin border
- optional monochrome dot

Do not use:

- green `Ready`
- blue `Generating`
- yellow `Revising`
- red/orange routine alerts
- colorful dashboard badge systems

Recommended status pattern:

```tsx
<span className="inline-flex items-center gap-1.5 rounded-[5px] border border-line bg-surface-subtle px-2 py-0.5 text-[11.5px] font-medium text-muted">
  <span className="h-[5px] w-[5px] rounded-full bg-accent" />
  Ready
</span>
```

Use stronger color only for destructive or blocking states, and even then keep it restrained.

## Buttons And Controls

Primary actions:

- ink background
- white text
- small radius
- compact height

Secondary actions:

- white or transparent background
- neutral border
- muted text

Rules:

- Use icons for tool actions when a known icon exists.
- Use text buttons for clear commands such as `Generate ebook`, `Export`, or `Create first ebook`.
- Avoid large CTA styling inside the working app.
- Disabled states should be muted, not explained with redundant text.

## Dashboard

The dashboard should feel like a manuscript desk, not an analytics product.

Rules:

- Project list is the hero.
- Keep stats minimal or remove them when they compete with drafts.
- Avoid colorful status badges.
- Keep rows quiet, scannable, and table-like.
- Use dates, titles, audience, and status as precise metadata.
- Empty states should be calm and useful, not promotional.

## Wizard

The wizard is a brief-building flow, not a generic onboarding funnel.

Rules:

- Keep the first step light.
- Group inputs by meaningful briefing decisions.
- Do not create artificial one-field steps.
- Ask for high-signal inputs that improve the generated draft.
- Avoid redundant inline validation copy when disabled buttons already block progression.
- The visual frame should feel like an editorial brief sheet, not a marketing card.

Good input categories:

- title
- author
- target reader
- core message
- tone
- source material
- page format
- length or depth, when needed

## Editor

The editor is the core product surface. Keep it calm and tool-like.

Rules:

- The right panel is an inspector, not a workflow launcher.
- Do not put save, generate, or revise controls in the right panel unless the workflow changes.
- Avoid outline UI unless the document model truly needs it.
- Keep the center manuscript area dominant.
- Page thumbnails should look consistent across page 1, page 2, and later pages.
- Verify multi-page visual consistency before calling editor UI done.

## Landing Page

The landing page can be more editorial than the app, but it should still be restrained.

Rules:

- Lead with Celion as a publishing OS.
- Show real document/page/ebook objects, not abstract AI graphics.
- Prefer static editorial compositions over flashy motion.
- Avoid gradient hero backgrounds and decorative abstract blobs.
- If motion is used, it should feel deliberate and slow.
- The first viewport should make the product category obvious.

## Motion

Motion should be quiet and functional.

Use:

- short fades
- small vertical transitions
- subtle hover response

Avoid:

- constant carousel movement in operational UI
- springy/bouncy interactions
- dramatic reveal choreography
- decorative motion that distracts from writing or editing

## Implementation Rules

Before adding or changing UI:

1. Check `src/styles/globals.css` for existing tokens.
2. Reuse the neutral palette unless there is a clear reason not to.
3. Prefer local consistency over inventing a new visual pattern.
4. Remove beige, colorful badges, excessive radius, and unnecessary shadows when touching nearby UI.
5. For editor changes, inspect page 2+ behavior, not just the first page.

When uncertain, choose the quieter option.

## Quick Checklist

Before finishing a UI change, ask:

- Does this still look like publishing software?
- Did I add color where structure would have worked?
- Did I create another card when a divider or row would be better?
- Are badges neutral?
- Are controls compact and precise?
- Is the typography calm, with limited weight?
- Does this screen match the editor and dashboard language?
- Would this still feel right after the user creates 50 drafts?


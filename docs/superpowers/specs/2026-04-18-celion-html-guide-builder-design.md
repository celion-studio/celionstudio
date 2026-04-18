# Celion HTML Guide Builder Design

## Goal

Celion v1 is an AI-first tool for experts and creators who already have their own knowledge, notes, drafts, and documents. Users bring their raw source material into Celion, and Celion turns that material into a polished, full-HTML guide that can be previewed, exported to PDF, or handed off to Figma for further visual refinement.

The product is not a blank-page writing assistant. It is a source-first guide builder.

## Product Positioning

- Celion helps users turn existing expertise into a structured digital guide.
- Celion should feel closer to a builder/studio than a text editor.
- The user should not need to write from scratch inside the app.
- The main output is a full HTML guide document.
- PDF export is part of the core value.
- Detailed manual design editing happens outside Celion through Figma handoff.

## v1 Information Architecture

Celion v1 has only three top-level surfaces:

1. Landing Page
2. Dashboard
3. Builder

There are no separate top-level pages for outline, draft, export, automations, billing, or analytics in v1.

## Core User Flow

1. User lands on the marketing page and starts a new guide.
2. User enters the dashboard and sees recent guides.
3. User clicks create guide.
4. A start wizard collects source materials and generation preferences.
5. Celion processes the uploaded and pasted materials.
6. Celion generates a first full-HTML guide draft.
7. The user reviews the HTML preview inside the Builder.
8. The user requests AI revisions or section-level rewrites.
9. The user exports to PDF or sends the result to Figma.

## Start Wizard

The wizard is not an optional setup screen. It is the required start point for every new guide.

The wizard should be full-screen and short. It should feel like a launch sequence, not a settings form.

### Wizard step 1: Source intake

Users can provide multiple sources for a single guide.

Allowed inputs:

- pasted text
- PDF
- MD
- TXT
- DOCX

Excluded input:

- HWP

Users should be able to combine multiple files and pasted notes in one guide creation flow.

### Wizard step 2: Guide direction

Users define the intent of the guide:

- target audience
- goal of the guide
- depth

The app should treat these inputs as shaping instructions, not as the source of truth. The source of truth is the user-provided material.

### Wizard step 3: Style selection

Users choose how the guide should feel and read.

Required style controls:

- tone
- structure style
- reader level
- depth/intensity

Example style directions:

- expert
- coach-like
- practical
- concise
- roadmap
- checklist
- step-by-step
- concept-first
- beginner
- practitioner
- advanced

## Builder

Celion should not present itself as a classic editor.

The Builder is a preview-first workspace centered on the rendered HTML result.

Recommended Builder layout:

- left panel: sources, audience/style settings, guide metadata
- center panel: rendered HTML preview
- right panel: AI actions, revision actions, export actions

The center panel should show something close to the final result, not a raw markdown or raw text editing surface.

## Source Handling

Celion accepts multiple source items and normalizes them before generation.

Normalization responsibilities:

- extract text from supported files
- merge multiple source inputs into a working corpus
- remove obvious duplication where useful
- preserve the user's unique knowledge and phrasing when possible
- flag empty or too-thin inputs

The system must bias toward preserving user expertise, not replacing it with generic LLM filler.

## Output Model

The system stores the guide as full HTML, not as JSON blocks.

However, the HTML should contain stable section markers so AI revisions can target a region reliably.

Example pattern:

```html
<section data-section="hero">
  ...
</section>

<section data-section="intro">
  ...
</section>

<section data-section="lesson-1">
  ...
</section>
```

This keeps the stored output as one full HTML document while still enabling section-level revision.

## Revision Model

Celion supports two core revision patterns:

1. Natural-language AI revisions
2. Section-targeted regeneration

Examples:

- make this more practical
- tighten the intro
- rewrite this for beginners
- shorten lesson 2
- make the CTA more persuasive

Users do not edit raw HTML in v1.

Instead:

- Celion rewrites the current HTML
- or rewrites a marked section inside the current HTML
- and saves the result as a new HTML version

## Figma Handoff

Celion should support a handoff path for users who want detailed manual control after generation.

Principles:

- Celion creates and revises the guide structure and initial presentation
- Figma is used for higher-touch design polishing
- the handoff should use the generated HTML output

Celion does not become a full visual design tool in v1.

## PDF Export

PDF export is a first-class output path in v1.

Principles:

- render from the current HTML version
- preserve the overall layout and readability
- keep the export pipeline simple and dependable

The export experience should feel native to the product, not like a bolt-on utility.

## Data Model

v1 data entities should stay simple.

### Guide

Represents a single guide project.

Suggested fields:

- id
- title
- status
- currentHtmlVersionId
- createdAt
- updatedAt

### SourceItem

Represents one pasted or uploaded source.

Suggested fields:

- id
- guideId
- sourceType
- originalFilename
- extractedText
- createdAt

### GuideProfile

Represents the shaping preferences for the guide.

Suggested fields:

- guideId
- targetAudience
- goal
- tone
- structureStyle
- readerLevel
- depth

### HtmlVersion

Represents one full HTML snapshot.

Suggested fields:

- id
- guideId
- html
- createdAt
- createdByRunId

### AiRun

Represents one AI generation or revision request.

Suggested fields:

- id
- guideId
- runType
- prompt
- targetSection
- status
- createdAt

## State Flow

Guide lifecycle states:

- draft
- processing_sources
- generating
- ready
- revising
- exported

The important product rule is that the Builder always centers the current HTML result. State changes should support that experience, not interrupt it with unnecessary mode switching.

## v1 Non-Goals

These are explicitly out of scope for v1:

- DM automation
- payment integrations
- analytics dashboard
- raw HTML editing
- HWP upload
- team collaboration
- template marketplace
- advanced drag-and-drop layout editing
- in-app visual design tooling

## Product Principles

- source-first, not prompt-first
- preview-first, not editor-first
- full HTML output, not JSON block storage
- AI-assisted revision, not manual HTML authoring
- Figma handoff for polish, not in-app design tooling
- simple information architecture with only landing, dashboard, and builder

## Initial Build Direction

The first implementation should prioritize:

1. landing page
2. dashboard with guide list and create flow
3. full-screen wizard for source intake and style selection
4. builder with HTML preview
5. AI generation into full HTML
6. section-targeted AI revisions using `data-section`
7. PDF export
8. Figma handoff

Anything that does not directly improve that flow should wait.

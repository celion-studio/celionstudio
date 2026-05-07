# 2026-05-07 Editor Direction Notes

## Summary

The editor should stay simple in the short term and evolve toward an AI-assisted workspace later.

Current priority:

- Keep the existing editor shell.
- Keep setup/generation inside the editor for new projects.
- Keep preview as the dominant surface.
- Keep edits in the inspector instead of editing text directly inside the preview.

Future direction:

- Add a clear `View` / `Edit` mode split.
- Add an assistant panel only when the LLM workflow is real.
- Move toward a Replit-like workbench only after the left assistant has useful behavior.

## Current Editor Shape

The current editor has four practical areas:

- Top bar: navigation, project title, save state, export.
- Page rail: compact page navigation.
- Preview: iframe-rendered project preview.
- Inspector: selected-element editing controls.

For new empty projects, the setup wizard opens inside the editor instead of sending the user through a separate `/new` page. This is the right default for now because it reduces redirect noise and makes project creation feel connected to the final output.

## Product Decision

Keep the current structure for now:

```text
Top bar
Page rail | Preview | Inspector
```

Do not add the LLM panel yet. Without real assistant behavior, a permanent left panel would make the editor look heavier without giving the user a better workflow.

The future target can become:

```text
Top bar
Assistant | Page rail | Preview | Inspector
```

That layout makes sense when the assistant can ask questions, revise the plan, regenerate sections, explain edits, and operate on selected pages or elements.

## Mode Model

Add modes before adding heavier editing features.

### View Mode

Default state for opening a finished or generated project.

- Preview is the main focus.
- Page rail stays visible.
- Inspector is hidden.
- Selection outlines should be absent or very quiet.
- Export remains available.

### Edit Mode

State for changing copy, styles, or layout.

- Inspector opens on the right.
- Preview elements can be selected.
- Text and style changes happen through the inspector.
- Save behavior remains automatic.
- The user should be able to return to View mode quickly.

`View` and `Edit` are better labels than `Design` for now. `Design` suggests a deeper design-tool promise than the current editor should make.

## Preview Editing Position

Do not make the preview directly contenteditable yet.

Inspector-first editing is safer for the current product because it avoids early complexity around:

- iframe focus and text selection
- caret behavior
- undo and redo history
- mapping DOM edits back to the ebook document model
- accidental layout damage
- save timing during inline edits

Direct preview editing can be reconsidered later, but only after the editor has a clear mode split, a stable undo model, and reliable document-model updates.

## Assistant Direction

When the LLM workflow is added, use the left panel for the assistant.

The assistant should not be a generic chat box. It should understand the project and offer actions such as:

- ask setup questions for a new project
- regenerate the plan
- revise a selected page
- rewrite selected copy
- suggest section structure
- explain why a generated page was written a certain way
- apply changes only after the user confirms

The assistant should work with the same project model as the editor. It should not create a separate parallel state that the preview cannot explain.

## Setup And Planning Flow

The setup wizard should remain simple.

Expected flow:

1. User creates a project.
2. Editor opens with setup visible.
3. User enters basics, style, source, and planning inputs.
4. App generates a plan.
5. User can review, edit, regenerate, or go back to source.
6. App generates the ebook pages from the accepted plan.
7. Editor opens in View mode after generation.

The planning step should use `plan` as the user-facing term. Avoid `blueprint` in UI and docs unless referring to old implementation history.

## Performance Notes

The editor should feel stable before it becomes more powerful.

Watch these areas:

- iframe reloads caused by unnecessary `srcDoc` changes
- repeated DOM preparation inside the iframe
- scroll handlers that update React state too often
- page rail renders caused by preview scrolling
- large generated HTML or image payloads
- inspector updates that re-render the preview

The preferred direction is to keep iframe preparation predictable and lightweight, throttle scroll work, memoize stable panels, and avoid rebuilding the preview unless the document actually changes.

## Implementation Phases

### Phase 1: Stabilize Current Editor

- Keep the current page rail, preview, and inspector.
- Keep setup inside the editor.
- Fix selection, inspector, export, and preview performance issues.
- Avoid large layout changes.

### Phase 2: Add View / Edit Mode

- Default existing projects to View mode.
- Show the inspector only in Edit mode.
- Keep page navigation visible in both modes.
- Make the mode switch obvious but compact.

### Phase 3: Add Assistant Panel

- Add the left assistant only when it can perform real project actions.
- Let the assistant drive setup questions for new projects.
- Let the assistant operate on the current plan, page, or selected element.
- Keep assistant output tied to confirmable edits.

### Phase 4: Consider Direct Preview Editing

- Revisit inline editing after the mode split and undo model exist.
- Start with text-only inline editing if needed.
- Keep inspector editing as the fallback.

## Non-Goals For Now

- Do not clone a full design tool.
- Do not add an empty LLM panel.
- Do not make preview contenteditable.
- Do not keep the inspector open in the default reading state.
- Do not add another standalone editor onboarding page unless the editor setup flow becomes too crowded.

## Design Rules

- Keep the UI minimal, quiet, and publishing-oriented.
- The preview should always feel like the main object.
- The page rail should be compact and consistent.
- The inspector should feel like a tool panel, not a dashboard.
- Buttons and controls should stay compact with neutral hover states.
- Avoid adding panels just because another product has them.

## Open Questions

- Should the mode switch live in the top bar or near the inspector edge?
- Should the assistant replace the setup wizard later, or only augment it?
- Should page-level revisions happen from the assistant, the inspector, or both?
- How much layout control should the inspector expose before it becomes too complex?

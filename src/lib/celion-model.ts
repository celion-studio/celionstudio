import type { GuideProfile, GuideRecord, GuideSource } from "@/types/guide";

function toSlug(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function firstSentence(input: string) {
  return input.split(/[.!?\n]/)[0]?.trim() ?? "";
}

function buildIntro(sources: GuideSource[], profile: GuideProfile) {
  const first = sources[0]?.content ?? "";
  const line = firstSentence(first) || "This guide was assembled from your own source material.";

  return `
    <section data-section="intro" class="guide-section">
      <p class="eyebrow">Positioning</p>
      <h2>What this guide is trying to solve</h2>
      <p>${line}</p>
      <p>This version is tuned for <strong>${profile.targetAudience}</strong> with a <strong>${profile.tone}</strong> tone, a <strong>${profile.structureStyle}</strong> structure, and <strong>${profile.depth}</strong> depth.</p>
    </section>
  `;
}

function buildSourceSection(source: GuideSource, index: number) {
  const paragraphs = source.content
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((line) => `<p>${line}</p>`)
    .join("");

  return `
    <section data-section="source-${index + 1}" class="guide-section">
      <p class="eyebrow">Source ${index + 1}</p>
      <h2>${source.name}</h2>
      ${paragraphs || "<p>No extractable text was available for this source yet.</p>"}
    </section>
  `;
}

function collectSourceParagraphs(sources: GuideSource[]) {
  const paragraphs = sources.flatMap((source) =>
    source.content
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean),
  );

  return paragraphs.length > 0
    ? paragraphs
    : ["This chapter will be expanded from your source material in the next revision pass."];
}

function buildOutlineSections(sources: GuideSource[], profile: GuideProfile) {
  const outline = profile.outline?.filter((chapter) => chapter.trim()) ?? [];
  if (outline.length === 0) {
    return sources.map((source, index) => buildSourceSection(source, index)).join("");
  }

  const paragraphs = collectSourceParagraphs(sources);
  const slugCount = new Map<string, number>();

  return outline
    .map((chapter, index) => {
      const baseId = toSlug(chapter) || `chapter-${index + 1}`;
      const duplicateCount = (slugCount.get(baseId) ?? 0) + 1;
      slugCount.set(baseId, duplicateCount);
      const sectionId =
        duplicateCount === 1 ? baseId : `${baseId}-${duplicateCount}`;
      const primary = paragraphs[index % paragraphs.length];
      const secondary = paragraphs[(index + 1) % paragraphs.length];
      const supportingCopy =
        secondary && secondary !== primary
          ? `<p>${secondary}</p>`
          : `<p>Frame this chapter for ${profile.targetAudience} and keep the payoff tied to ${profile.goal}.</p>`;

      return `
        <section data-section="${sectionId}" class="guide-section">
          <p class="eyebrow">Chapter ${index + 1}</p>
          <h2>${chapter}</h2>
          <p>${primary}</p>
          ${supportingCopy}
        </section>
      `;
    })
    .join("");
}

function buildActionSection(profile: GuideProfile) {
  return `
    <section data-section="next-steps" class="guide-section">
      <p class="eyebrow">Execution</p>
      <h2>How to use this as a working draft</h2>
      <ul>
        <li>Ask AI to tighten the pacing for ${profile.readerLevel} readers.</li>
        <li>Regenerate one section when you want a stronger ${profile.structureStyle} flow.</li>
        <li>Export this version to PDF or push it into Figma for final design polish.</li>
      </ul>
    </section>
  `;
}

export function createGuideHtml(input: {
  title: string;
  profile: GuideProfile;
  sources: GuideSource[];
  revisionPrompt?: string;
}) {
  const revisionNotice = input.revisionPrompt
    ? `<p class="revision-note">Latest revision prompt: ${input.revisionPrompt}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${input.title}</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #1a1814;
        --muted: #726a5d;
        --paper: #f7f3ea;
        --panel: #fffdf8;
        --accent: #d3ff3f;
        --line: rgba(26, 24, 20, 0.12);
      }

      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 56px 28px;
        font-family: Georgia, "Times New Roman", serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(211, 255, 63, 0.22), transparent 30%),
          linear-gradient(180deg, #fffcf6 0%, var(--paper) 100%);
      }
      main {
        max-width: 860px;
        margin: 0 auto;
        padding: 48px;
        border: 1px solid var(--line);
        border-radius: 30px;
        background: rgba(255, 253, 248, 0.92);
        box-shadow: 0 24px 80px rgba(18, 17, 14, 0.08);
      }
      .eyebrow {
        margin: 0 0 10px;
        font-family: "IBM Plex Mono", monospace;
        font-size: 11px;
        letter-spacing: 0.24em;
        text-transform: uppercase;
        color: var(--muted);
      }
      h1, h2 {
        margin: 0;
        font-weight: 600;
        line-height: 1.05;
      }
      h1 {
        max-width: 12ch;
        font-size: 56px;
      }
      h2 {
        font-size: 32px;
      }
      p, li {
        font-family: Arial, sans-serif;
        font-size: 17px;
        line-height: 1.75;
        color: rgba(26, 24, 20, 0.9);
      }
      .hero {
        padding-bottom: 28px;
        border-bottom: 1px solid var(--line);
      }
      .hero-grid {
        display: grid;
        gap: 24px;
        grid-template-columns: 1.2fr 0.8fr;
        margin-top: 28px;
      }
      .hero-card {
        padding: 24px;
        border: 1px solid var(--line);
        border-radius: 24px;
        background: linear-gradient(180deg, rgba(255,255,255,0.7), rgba(211,255,63,0.18));
      }
      .guide-section {
        padding-top: 28px;
        margin-top: 28px;
        border-top: 1px solid var(--line);
      }
      .guide-section ul {
        padding-left: 18px;
      }
      .revision-note {
        margin-top: 18px;
        padding: 14px 16px;
        border-radius: 18px;
        background: rgba(211, 255, 63, 0.18);
        font-family: Arial, sans-serif;
      }
      @media (max-width: 720px) {
        body { padding: 20px; }
        main { padding: 24px; }
        h1 { font-size: 42px; }
        .hero-grid { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <main>
      <section data-section="hero" class="hero">
        <p class="eyebrow">Celion Draft</p>
        <h1>${input.title}</h1>
        <div class="hero-grid">
          <div>
            <p>This guide was assembled from your own knowledge base, not a generic topic prompt. Use it as the working HTML draft for revision, export, and design handoff.</p>
            ${revisionNotice}
          </div>
          <aside class="hero-card">
            <p class="eyebrow">Profile</p>
            <p><strong>Audience</strong><br />${input.profile.targetAudience}</p>
            <p><strong>Goal</strong><br />${input.profile.goal}</p>
            <p><strong>Tone</strong><br />${input.profile.tone}</p>
          </aside>
        </div>
      </section>
      ${buildIntro(input.sources, input.profile)}
      ${buildOutlineSections(input.sources, input.profile)}
      ${buildActionSection(input.profile)}
    </main>
  </body>
</html>`;
}

export function createGuideRecord(args: {
  title: string;
  profile: GuideProfile;
  sources: GuideSource[];
}) {
  const title = args.title.trim();
  const now = new Date().toISOString();
  const id = `${toSlug(title)}-${crypto.randomUUID().slice(0, 8)}`;

  const guide: GuideRecord = {
    id,
    title,
    status: "draft",
    createdAt: now,
    updatedAt: now,
    sources: args.sources,
    profile: args.profile,
    html: "",
  };

  return guide;
}

export function withGeneratedHtml(
  guide: GuideRecord,
  options?: { revisionPrompt?: string; targetSection?: string },
) {
  const nextGuide: GuideRecord = {
    ...guide,
    status: options?.revisionPrompt ? "revising" : "ready",
    revisionPrompt: options?.revisionPrompt,
    updatedAt: new Date().toISOString(),
  };

  if (options?.targetSection && guide.html) {
    const replacement = `
      <section data-section="${options.targetSection}" class="guide-section">
        <p class="eyebrow">Refined section</p>
        <h2>${options.targetSection.replace(/-/g, " ")}</h2>
        <p>${options.revisionPrompt || "This section was regenerated locally for the current shell."}</p>
        <p>Next slice will replace this deterministic mock with the actual AI revision pipeline.</p>
      </section>
    `;

    nextGuide.html = guide.html.replace(
      new RegExp(
        `<section data-section="${options.targetSection}"[\\s\\S]*?<\\/section>`,
        "i",
      ),
      replacement,
    );
  } else {
    nextGuide.html = createGuideHtml({
      title: nextGuide.title,
      profile: nextGuide.profile,
      sources: nextGuide.sources,
      revisionPrompt: options?.revisionPrompt,
    });
  }

  return {
    ...nextGuide,
    status: options?.revisionPrompt ? "ready" : nextGuide.status,
  };
}

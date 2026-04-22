import type {
  DesignMode,
  PlanChapter,
  ProjectPlan,
  ProjectProfile,
  ProjectRecord,
  ProjectSource,
} from "@/types/project";

function idPart() {
  return crypto.randomUUID().slice(0, 8);
}

function toSlug(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function sentences(text: string, max = 3) {
  return text
    .split(/[.!?\n]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .slice(0, max);
}

export function createProjectRecord(args: {
  title: string;
  profile: ProjectProfile;
  sources: ProjectSource[];
}) {
  const title = args.title.trim();
  const now = new Date().toISOString();
  const id = `${toSlug(title)}-${idPart()}`;

  return {
    id,
    title,
    status: "draft",
    createdAt: now,
    updatedAt: now,
    sources: args.sources,
    profile: args.profile,
    html: "",
  } as ProjectRecord;
}

export function buildDraftPlan(input: {
  title: string;
  author: string;
  targetAudience: string;
  coreMessage: string;
  designMode: DesignMode;
  sources: ProjectSource[];
}): ProjectPlan {
  const hook =
    `${input.coreMessage || input.title}, written for ${input.targetAudience}.`.slice(0, 160);

  const sourceSentences = input.sources.flatMap((source) => sentences(source.content, 4));
  const seed = sourceSentences.length > 0 ? sourceSentences : [`${input.title} content`];

  const chapterTemplates: { title: string; summary: string; keyPoints: string[] }[] = [
    {
      title: "Why this matters now",
      summary:
        "Sets the stage: what is broken, what is at stake, and why your reader needs to act.",
      keyPoints: ["The core problem", "Who is affected", "What changes if nothing is done"],
    },
    {
      title: "The foundational concept",
      summary:
        "Establishes the mental model readers will use throughout the rest of the book.",
      keyPoints: ["Define key terms", "The central idea in plain language", "Common misconceptions"],
    },
    {
      title: "How it works in practice",
      summary:
        "Moves from theory to the practical mechanics: what the process actually looks like.",
      keyPoints: ["Step-by-step overview", "Real-world example", "What to watch out for"],
    },
    {
      title: "Getting started",
      summary:
        "Low-friction first actions your reader can take immediately after finishing this chapter.",
      keyPoints: ["The first move", "Minimum viable setup", "Early wins to build momentum"],
    },
    {
      title: "Advanced tactics",
      summary: "For readers who have nailed the basics and want to go further, faster.",
      keyPoints: ["Level-up techniques", "Avoiding the expert trap", "Measuring progress"],
    },
    {
      title: "Common pitfalls",
      summary: "What most people get wrong and how to avoid the same mistakes.",
      keyPoints: ["Top 3 mistakes", "Why they happen", "The fix for each"],
    },
    {
      title: "Putting it all together",
      summary: "Integrates everything into a cohesive action plan the reader can run tomorrow.",
      keyPoints: ["The full-stack workflow", "Sequencing decisions", "What success looks like"],
    },
  ];

  const chapters: PlanChapter[] = chapterTemplates.map((template, index) => ({
    id: `ch-${index + 1}`,
    title: template.title,
    summary: template.summary,
    keyPoints: template.keyPoints,
  }));

  chapters.slice(0, Math.min(3, seed.length)).forEach((chapter, index) => {
    const snippet = seed[index] ?? "";
    if (snippet.length > 20) {
      chapter.keyPoints = [...chapter.keyPoints, `From your material: "${snippet.slice(0, 80)}..."`];
    }
  });

  return { hook, chapters };
}

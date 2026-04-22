import { generateJsonWithGemini } from "@/lib/ai/gemini";
import {
  blockNoteDocumentToHtml,
  normalizeBlockNoteDocument,
  type BlockNoteDocument,
} from "@/lib/blocknote-document";
import { buildDraftPlan } from "@/lib/project-planning";
import {
  BLOCKS_SYSTEM_PROMPT,
  REVISION_SYSTEM_PROMPT,
  buildBlocksUserMessage,
  buildRevisionUserMessage,
} from "@/lib/prompts";
import type { ProjectPlan, ProjectProfile, ProjectRecord, ProjectSource } from "@/types/project";

type GenerationSource = "ai" | "fallback";

export type GenerateProjectBlocksResult = {
  blocks: BlockNoteDocument;
  plan: ProjectPlan;
  source: GenerationSource;
  fallbackReason?: string;
};

export type GeneratedProjectResult = {
  project: ProjectRecord;
  generation: GenerateProjectBlocksResult;
};

function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY?.trim();
}

function ensureProjectPlan(project: ProjectRecord): ProjectPlan {
  if (project.profile.plan) return project.profile.plan;

  return buildDraftPlan({
    title: project.title,
    author: project.profile.author,
    targetAudience: project.profile.targetAudience,
    coreMessage: project.profile.coreMessage,
    designMode: project.profile.designMode || "balanced",
    sources: project.sources,
  });
}

function sourceParagraphs(sources: ProjectSource[]) {
  return sources
    .flatMap((source) =>
      source.content
        .split(/\n+/)
        .map((line) => line.trim())
        .filter((line) => line.length > 30),
    )
    .slice(0, 30);
}

function buildFallbackBlockNoteDocument(input: {
  title: string;
  profile: ProjectProfile;
  sources: ProjectSource[];
}): BlockNoteDocument {
  const plan = input.profile.plan;
  if (!plan) return [];

  const sourceLines = sourceParagraphs(input.sources);
  const blocks: BlockNoteDocument = [
    {
      type: "heading",
      props: { level: 1 },
      content: input.title,
    },
    {
      type: "paragraph",
      content: plan.hook,
    },
  ];

  plan.chapters.forEach((chapter, index) => {
    const sourceLine = sourceLines[index % Math.max(sourceLines.length, 1)] ?? "";

    blocks.push({
      type: "heading",
      props: { level: 2 },
      content: chapter.title,
    });
    blocks.push({
      type: "paragraph",
      content: chapter.summary + (sourceLine ? ` ${sourceLine.slice(0, 180)}.` : ""),
    });

    chapter.keyPoints.forEach((point) => {
      blocks.push({
        type: "bulletListItem",
        content: point,
      });
    });
  });

  return normalizeBlockNoteDocument(blocks);
}

export async function generateProjectBlocks(
  project: ProjectRecord,
): Promise<GenerateProjectBlocksResult> {
  const plan = ensureProjectPlan(project);
  let fallbackReason = getGeminiApiKey() ? undefined : "missing-api-key";

  if (!fallbackReason) {
    try {
      const rawBlocks = await generateJsonWithGemini({
        system: BLOCKS_SYSTEM_PROMPT,
        user: buildBlocksUserMessage({
          title: project.title,
          author: project.profile.author,
          targetAudience: project.profile.targetAudience,
          coreMessage: project.profile.coreMessage,
          tone: project.profile.tone || "preserve",
          designMode: project.profile.designMode || "balanced",
          sources: project.sources.map((source) => ({
            name: source.name,
            content: source.content,
          })),
          plan,
        }),
      });
      const blocks = normalizeBlockNoteDocument(rawBlocks);

      if (blocks.length > 0) {
        return { blocks, plan, source: "ai" };
      }

      fallbackReason = "ai-returned-no-valid-blocks";
    } catch (error) {
      fallbackReason = error instanceof Error ? error.message : "ai-generation-failed";
    }
  }

  const fallbackBlocks = buildFallbackBlockNoteDocument({
    title: project.title,
    profile: { ...project.profile, plan },
    sources: project.sources,
  });

  return {
    blocks: fallbackBlocks,
    plan,
    source: "fallback",
    fallbackReason,
  };
}

export async function withGeneratedProject(
  project: ProjectRecord,
): Promise<GeneratedProjectResult> {
  const generation = await generateProjectBlocks(project);
  const updatedAt = new Date().toISOString();

  const nextProject: ProjectRecord = {
    ...project,
    status: "ready",
    updatedAt,
    profile: {
      ...project.profile,
      plan: generation.plan,
      blocks: generation.blocks as ProjectRecord["profile"]["blocks"],
    },
    html: blockNoteDocumentToHtml({
      title: project.title,
      blocks: generation.blocks,
      pageFormat: project.profile.pageFormat,
      customPageSize: project.profile.customPageSize,
    }),
  };

  return { project: nextProject, generation };
}

export async function withRevisedProject(
  project: ProjectRecord,
  revisionPrompt: string,
): Promise<GeneratedProjectResult> {
  const prompt = revisionPrompt.trim();
  if (!prompt) {
    throw new Error("Revision prompt is required.");
  }

  if (normalizeBlockNoteDocument(project.profile.blocks).length === 0) {
    throw new Error("Generate or write a draft before revising with AI.");
  }

  if (!getGeminiApiKey()) {
    throw new Error("GEMINI_API_KEY is required to revise with AI.");
  }

  const plan = ensureProjectPlan(project);
  const rawBlocks = await generateJsonWithGemini({
    system: REVISION_SYSTEM_PROMPT,
    user: buildRevisionUserMessage({
      title: project.title,
      author: project.profile.author,
      targetAudience: project.profile.targetAudience,
      coreMessage: project.profile.coreMessage,
      tone: project.profile.tone || "preserve",
      designMode: project.profile.designMode || "balanced",
      sources: project.sources.map((source) => ({
        name: source.name,
        content: source.content,
      })),
      plan,
      currentBlocks: normalizeBlockNoteDocument(project.profile.blocks),
      revisionPrompt: prompt,
    }),
  });

  const blocks = normalizeBlockNoteDocument(rawBlocks);
  if (blocks.length === 0) {
    throw new Error("AI returned no valid revised blocks.");
  }

  const updatedAt = new Date().toISOString();
  const nextProject: ProjectRecord = {
    ...project,
    status: "ready",
    revisionPrompt: prompt,
    updatedAt,
    profile: {
      ...project.profile,
      plan,
      blocks: blocks as ProjectRecord["profile"]["blocks"],
    },
    html: blockNoteDocumentToHtml({
      title: project.title,
      blocks,
      pageFormat: project.profile.pageFormat,
      customPageSize: project.profile.customPageSize,
    }),
  };

  return {
    project: nextProject,
    generation: { blocks, plan, source: "ai" },
  };
}

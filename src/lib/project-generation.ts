import { generateJsonWithGemini } from "@/lib/ai/gemini";
import {
  normalizeTiptapBookDocument,
  textFromDoc,
  type TiptapBookDocument,
  type TiptapDocJson,
} from "@/lib/tiptap-document";
import { buildDraftPlan } from "@/lib/project-planning";
import {
  DOCUMENT_SYSTEM_PROMPT,
  REVISION_SYSTEM_PROMPT,
  buildDocumentUserMessage,
  buildRevisionUserMessage,
} from "@/lib/prompts";
import type { ProjectPlan, ProjectProfile, ProjectRecord, ProjectSource } from "@/types/project";

type GenerationSource = "ai" | "fallback";

export type GenerateProjectDocumentResult = {
  document: TiptapBookDocument;
  plan: ProjectPlan;
  source: GenerationSource;
  fallbackReason?: string;
};

export type GeneratedProjectResult = {
  project: ProjectRecord;
  generation: GenerateProjectDocumentResult;
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

function buildFallbackTiptapDocument(input: {
  title: string;
  profile: ProjectProfile;
  sources: ProjectSource[];
}) {
  const plan = input.profile.plan;
  if (!plan) return normalizeTiptapBookDocument([]);

  const sourceLines = sourceParagraphs(input.sources);
  const content: TiptapDocJson["content"] = [
    { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: input.title }] },
    { type: "paragraph", content: [{ type: "text", text: plan.hook }] },
  ];

  plan.chapters.forEach((chapter, index) => {
    const sourceLine = sourceLines[index % Math.max(sourceLines.length, 1)] ?? "";

    content.push({
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: chapter.title }],
    });
    content.push({
      type: "paragraph",
      content: [{ type: "text", text: chapter.summary + (sourceLine ? ` ${sourceLine.slice(0, 180)}.` : "") }],
    });

    chapter.keyPoints.forEach((point) => {
      content.push({
        type: "bulletList",
        content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: point }] }] }],
      });
    });
  });

  return normalizeTiptapBookDocument({ type: "doc", content });
}

export async function generateProjectDocument(
  project: ProjectRecord,
): Promise<GenerateProjectDocumentResult> {
  const plan = ensureProjectPlan(project);
  let fallbackReason = getGeminiApiKey() ? undefined : "missing-api-key";

  if (!fallbackReason) {
    try {
      const rawDocument = await generateJsonWithGemini({
        system: DOCUMENT_SYSTEM_PROMPT,
        user: buildDocumentUserMessage({
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
      const document = normalizeTiptapBookDocument(rawDocument);

      if (document.pages.some((page) => textFromDoc(page.doc).trim().length > 0)) {
        return {
          document,
          plan,
          source: "ai",
        };
      }

      fallbackReason = "ai-returned-no-valid-document";
    } catch (error) {
      fallbackReason = error instanceof Error ? error.message : "ai-generation-failed";
    }
  }

  const fallbackDocument = buildFallbackTiptapDocument({
    title: project.title,
    profile: { ...project.profile, plan },
    sources: project.sources,
  });

  return {
    document: fallbackDocument,
    plan,
    source: "fallback",
    fallbackReason,
  };
}

export async function withGeneratedProject(
  project: ProjectRecord,
): Promise<GeneratedProjectResult> {
  const generation = await generateProjectDocument(project);
  const updatedAt = new Date().toISOString();

  const nextProject: ProjectRecord = {
    ...project,
    status: "ready",
    updatedAt,
    profile: {
      ...project.profile,
      plan: generation.plan,
      document: generation.document,
    },
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

  const currentDocument = normalizeTiptapBookDocument(project.profile.document);
  if (!currentDocument.pages.some((page) => textFromDoc(page.doc).trim().length > 0)) {
    throw new Error("Generate or write a draft before revising with AI.");
  }

  if (!getGeminiApiKey()) {
    throw new Error("GEMINI_API_KEY is required to revise with AI.");
  }

  const plan = ensureProjectPlan(project);
  const rawDocument = await generateJsonWithGemini({
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
      currentDocument,
      revisionPrompt: prompt,
    }),
  });

  const document = normalizeTiptapBookDocument(rawDocument);
  if (!document.pages.some((page) => textFromDoc(page.doc).trim().length > 0)) {
    throw new Error("AI returned no valid revised document.");
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
      document,
    },
  };

  return {
    project: nextProject,
    generation: {
      document,
      plan,
      source: "ai",
    },
  };
}

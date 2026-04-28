import { NextResponse } from "next/server";
import { z } from "zod";
import { getRouteSession } from "@/lib/session";
import { generateEbookHtml } from "@/lib/ebook-generation";
import { createProjectForUser, updateProjectEbookHtml } from "@/lib/projects";
import { normalizeTiptapBookDocument } from "@/lib/tiptap-document";

const outlineChapterSchema = z.object({
  title: z.string(),
  summary: z.string(),
  pageCount: z.number(),
});

const schema = z.object({
  title: z.string().min(1),
  author: z.string().default(""),
  coreMessage: z.string().default(""),
  targetAudience: z.string().default(""),
  sourceText: z.string().default(""),
  pageCount: z.number().int().min(8).max(40).default(16),
  ebookStyle: z.enum(["minimal", "editorial", "neo-brutalism", "bold", "elegant"]),
  accentColor: z.string().default("#6366f1"),
  outline: z.object({ chapters: z.array(outlineChapterSchema) }),
});

export async function POST(request: Request) {
  const session = await getRouteSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const d = parsed.data;

  // Create project record first
  const project = await createProjectForUser(session.user.id, {
    kind: "product",
    title: d.title,
    profile: {
      author: d.author,
      targetAudience: d.targetAudience,
      coreMessage: d.coreMessage,
      designMode: "balanced",
      pageFormat: "a4",
      customPageSize: { widthMm: 210, heightMm: 297 },
      tone: "",
      plan: null,
      document: normalizeTiptapBookDocument([]),
      ebookStyle: d.ebookStyle,
      ebookHtml: null,
      ebookPageCount: d.pageCount,
      accentColor: d.accentColor,
    },
    sources: d.sourceText.trim()
      ? [{ id: crypto.randomUUID(), kind: "pasted_text", name: "Source", content: d.sourceText, excerpt: d.sourceText.slice(0, 180) }]
      : [],
  });

  if (!project) {
    return NextResponse.json({ message: "Failed to create project" }, { status: 500 });
  }

  try {
    const html = await generateEbookHtml({
      title: d.title,
      author: d.author,
      coreMessage: d.coreMessage,
      targetAudience: d.targetAudience,
      sourceText: d.sourceText,
      pageCount: d.pageCount,
      ebookStyle: d.ebookStyle,
      accentColor: d.accentColor,
      outline: d.outline,
    });

    await updateProjectEbookHtml(session.user.id, project.id, html);

    return NextResponse.json({ projectId: project.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate ebook";
    return NextResponse.json({ message }, { status: 500 });
  }
}

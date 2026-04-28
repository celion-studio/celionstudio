import { NextResponse } from "next/server";
import { z } from "zod";
import { getRouteSession } from "@/lib/session";
import { generateEbookHtml } from "@/lib/ebook-generation";
import { countCelionSlides } from "@/lib/ebook-html";
import { formatSourcesForPrompt } from "@/lib/source-ingestion";
import { createProjectForUser, updateProjectEbookHtml } from "@/lib/projects";
import { normalizeTiptapBookDocument } from "@/lib/tiptap-document";

const sourceSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["pasted_text", "pdf", "md", "txt", "docx"]),
  name: z.string().min(1),
  content: z.string().min(1),
  excerpt: z.string().default(""),
});

const schema = z.object({
  title: z.string().min(1),
  author: z.string().default(""),
  coreMessage: z.string().default(""),
  targetAudience: z.string().default(""),
  sourceText: z.string().default(""),
  sources: z.array(sourceSchema).default([]),
  ebookStyle: z.enum(["minimal", "editorial", "neo-brutalism", "bold", "elegant"]),
  accentColor: z.string().default("#6366f1"),
});

function countGeneratedSlides(html: string) {
  return Math.max(1, countCelionSlides(html));
}

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
  const sourceText = formatSourcesForPrompt(d.sources, d.sourceText);

  let html: string;
  try {
    html = await generateEbookHtml({
      title: d.title,
      author: d.author,
      coreMessage: d.coreMessage,
      targetAudience: d.targetAudience,
      sourceText,
      ebookStyle: d.ebookStyle,
      accentColor: d.accentColor,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate ebook";
    return NextResponse.json({ message }, { status: 500 });
  }

  const project = await createProjectForUser(session.user.id, {
    kind: "product",
    title: d.title,
    profile: {
      author: d.author,
      targetAudience: d.targetAudience,
      coreMessage: d.coreMessage,
      designMode: "balanced",
      pageFormat: "a5",
      customPageSize: { widthMm: 148, heightMm: 210 },
      tone: "",
      plan: null,
      document: normalizeTiptapBookDocument([]),
      ebookStyle: d.ebookStyle,
      ebookHtml: html,
      ebookPageCount: countGeneratedSlides(html),
      accentColor: d.accentColor,
    },
    sources: d.sources.length > 0
      ? d.sources
      : sourceText.trim()
        ? [{ id: crypto.randomUUID(), kind: "pasted_text", name: "Source", content: sourceText, excerpt: sourceText.slice(0, 180) }]
        : [],
  });

  if (!project) {
    return NextResponse.json({ message: "Failed to create project" }, { status: 500 });
  }

  const saved = await updateProjectEbookHtml(session.user.id, project.id, html);
  if (!saved) {
    return NextResponse.json({ message: "Generated ebook could not be saved." }, { status: 500 });
  }

  return NextResponse.json({ projectId: project.id });
}

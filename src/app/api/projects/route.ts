import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeTiptapBookDocument } from "@/lib/tiptap-document";
import { createProjectForUser, listProjectRecordsForUser } from "@/lib/projects";
import { getRouteSession } from "@/lib/session";
import { isDatabaseUnavailableError } from "@/lib/db";

const projectKindSchema = z.enum(["product", "document"]);

const createProjectSchema = z.object({
  kind: projectKindSchema.default("product"),
  title: z.string().trim().min(1),
  profile: z.object({
    author: z.string().default(""),
    targetAudience: z.string().default(""),
    purpose: z.string().default(""),
    designMode: z.enum(["text", "balanced", "visual"]).default("balanced"),
    pageFormat: z
      .enum(["ebook", "kindle", "tablet", "mobile", "a5", "a4", "a3", "a2", "custom"])
      .default("ebook"),
    customPageSize: z
      .object({
        widthMm: z.number().min(50).max(800),
        heightMm: z.number().min(50).max(800),
      })
      .default({ widthMm: 152, heightMm: 229 }),
    tone: z.string().default(""),
    plan: z.any().optional().nullable(),
    document: z.unknown().optional().default([]),
  }),
  sources: z
    .array(
      z.object({
        id: z.string().min(1),
        kind: z.enum(["pasted_text", "pdf", "md", "txt", "docx"]),
        name: z.string().min(1),
        content: z.string().min(1),
        excerpt: z.string(),
      }),
    )
    .default([]),
});

export async function GET(request: Request) {
  const session = await getRouteSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const kind = projectKindSchema.catch("product").parse(url.searchParams.get("kind") ?? "product");

  try {
    const projects = await listProjectRecordsForUser(session.user.id, kind);
    return NextResponse.json({ projects });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json(
        { message: "Database is temporarily unavailable. Please retry in a moment." },
        { status: 503 },
      );
    }
    throw error;
  }
}

export async function POST(request: Request) {
  const session = await getRouteSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json();
  const parsed = createProjectSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid request body" },
      { status: 400 },
    );
  }

  try {
    const p = parsed.data.profile;
    const project = await createProjectForUser(session.user.id, {
      kind: parsed.data.kind,
      title: parsed.data.title,
      profile: {
        author: p.author,
        targetAudience: p.targetAudience,
        purpose: p.purpose,
        designMode: p.designMode,
        pageFormat: p.pageFormat,
        customPageSize: p.customPageSize,
        tone: p.tone,
        plan: p.plan ?? null,
        document: normalizeTiptapBookDocument(p.document),
        ebookStyle: null,
        ebookHtml: null,
        ebookPageCount: 16,
        accentColor: "#6366f1",
      },
      sources: parsed.data.sources,
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json(
        { message: "Database is temporarily unavailable. Please retry in a moment." },
        { status: 503 },
      );
    }
    throw error;
  }
}

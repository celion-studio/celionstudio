import { NextResponse } from "next/server";
import { z } from "zod";
import { createProjectForUser, listProjectRecordsForUser } from "@/lib/projects";
import { getRouteSession } from "@/lib/session";
import { isDatabaseUnavailableError } from "@/lib/db";
import { DESIGN_MODE_IDS, PROJECT_KIND_IDS, SOURCE_KIND_IDS } from "@/types/project";

const projectKindSchema = z.enum(PROJECT_KIND_IDS);

const createProjectSchema = z.object({
  kind: projectKindSchema.default("product"),
  title: z.string().trim().min(1),
  profile: z.object({
    author: z.string().default(""),
    targetAudience: z.string().default(""),
    purpose: z.string().default(""),
    designMode: z.enum(DESIGN_MODE_IDS).default("balanced"),
    tone: z.string().default(""),
  }),
  sources: z
    .array(
      z.object({
        id: z.string().min(1),
        kind: z.enum(SOURCE_KIND_IDS),
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
        tone: p.tone,
        ebookStyle: null,
        ebookHtml: null,
        ebookDocument: null,
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

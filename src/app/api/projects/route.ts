import { NextResponse } from "next/server";
import { z } from "zod";
import { createProjectForUser, listProjectSummariesForUser } from "@/lib/projects";
import { getRouteSession } from "@/lib/session";
import { databaseUnavailableResponse, parseJsonRequest } from "@/lib/route-errors";
import {
  MAX_SOURCE_CONTENT_LENGTH,
  MAX_SOURCES,
  MAX_TITLE_LENGTH,
  validateSourceLimits,
} from "@/lib/request-limits";
import { DESIGN_MODE_IDS, SOURCE_KIND_IDS } from "@/types/project";

const createProjectSchema = z.object({
  title: z.string().trim().min(1).max(MAX_TITLE_LENGTH),
  profile: z.object({
    author: z.string().default(""),
    targetAudience: z.string().default(""),
    purpose: z.string().default(""),
    designMode: z.enum(DESIGN_MODE_IDS).default("balanced"),
    tone: z.string().default(""),
  }).default({
    author: "",
    targetAudience: "",
    purpose: "",
    designMode: "balanced",
    tone: "",
  }),
  sources: z
    .array(
      z.object({
        id: z.string().min(1),
        kind: z.enum(SOURCE_KIND_IDS),
        name: z.string().min(1),
        content: z.string().min(1).max(MAX_SOURCE_CONTENT_LENGTH),
        excerpt: z.string(),
      }),
    )
    .max(MAX_SOURCES)
    .default([]),
});

export async function GET(_request: Request) {
  const session = await getRouteSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const projects = await listProjectSummariesForUser(session.user.id);
    return NextResponse.json({ projects });
  } catch (error) {
    const unavailable = databaseUnavailableResponse(error);
    if (unavailable) return unavailable;
    throw error;
  }
}

export async function POST(request: Request) {
  const session = await getRouteSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const json = await parseJsonRequest(request);
  if (!json.ok) return json.response;

  const parsed = createProjectSchema.safeParse(json.data);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid request body" },
      { status: 400 },
    );
  }

  const sourceLimitError = validateSourceLimits(parsed.data.sources);
  if (sourceLimitError) {
    return NextResponse.json({ message: sourceLimitError }, { status: 400 });
  }

  try {
    const p = parsed.data.profile;
    const project = await createProjectForUser(session.user.id, {
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
    const unavailable = databaseUnavailableResponse(error);
    if (unavailable) return unavailable;
    throw error;
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getProjectRecordForUser,
  mutateProjectForUser,
  updateProjectBlocks,
  updateProjectPageFormat,
} from "@/lib/projects";
import { getRouteSession } from "@/lib/session";

const mutationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.enum(["generate", "regenerate", "mark-exported"]) }),
  z.object({ action: z.literal("revise"), revisionPrompt: z.string().min(1) }),
  z.object({
    action: z.literal("save-page-format"),
    pageFormat: z.enum([
      "ebook",
      "kindle",
      "tablet",
      "mobile",
      "a5",
      "a4",
      "a3",
      "a2",
      "custom",
    ]),
    customPageSize: z.object({
      widthMm: z.number().min(50).max(800),
      heightMm: z.number().min(50).max(800),
    }),
  }),
  z.object({
    action: z.literal("save-blocks"),
    blocks: z.custom<unknown>((value) => value !== undefined, {
      message: "blocks is required",
    }),
  }),
]);

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const session = await getRouteSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const { projectId } = await context.params;
  const project = await getProjectRecordForUser(session.user.id, projectId);
  if (!project) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ project });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const session = await getRouteSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;
  const json = await request.json();
  const parsed = mutationSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid request body" },
      { status: 400 },
    );
  }

  if (parsed.data.action === "save-blocks") {
    const project = await updateProjectBlocks(session.user.id, projectId, parsed.data.blocks);
    if (!project) return NextResponse.json({ message: "Not found" }, { status: 404 });
    return NextResponse.json({ project });
  }

  if (parsed.data.action === "save-page-format") {
    const project = await updateProjectPageFormat(
      session.user.id,
      projectId,
      parsed.data.pageFormat,
      parsed.data.customPageSize,
    );
    if (!project) return NextResponse.json({ message: "Not found" }, { status: 404 });
    return NextResponse.json({ project });
  }

  let project;
  try {
    project = await mutateProjectForUser(session.user.id, projectId, parsed.data);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Could not update this draft.",
      },
      { status: 500 },
    );
  }
  if (!project) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ project });
}


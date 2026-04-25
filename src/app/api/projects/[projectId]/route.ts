import { NextResponse } from "next/server";
import { z } from "zod";
import {
  deleteProjectForUser,
  getProjectRecordForUser,
  mutateProjectForUser,
  updateProjectDocument,
  updateProjectPageFormat,
} from "@/lib/projects";
import { validateDocumentImageStorage } from "@/lib/image-storage";
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
    action: z.literal("save-document"),
    document: z.unknown().optional(),
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

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const session = await getRouteSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;
  const deleted = await deleteProjectForUser(session.user.id, projectId);
  if (!deleted) return NextResponse.json({ message: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
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

  if (parsed.data.action === "save-document") {
    const document = parsed.data.document;
    if (document === undefined) {
      return NextResponse.json({ message: "document is required" }, { status: 400 });
    }
    const imageStorage = validateDocumentImageStorage(document);
    if (!imageStorage.ok) {
      return NextResponse.json(
        {
          code: imageStorage.error.code,
          message: imageStorage.error.message,
          note: imageStorage.error.note,
        },
        { status: 400 },
      );
    }
    const project = await updateProjectDocument(
      session.user.id,
      projectId,
      document,
    );
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

  if (
    parsed.data.action !== "generate" &&
    parsed.data.action !== "regenerate" &&
    parsed.data.action !== "mark-exported" &&
    parsed.data.action !== "revise"
  ) {
    return NextResponse.json({ message: "Unsupported action" }, { status: 400 });
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

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  compileEbookDocumentToHtml,
  insertEbookDocumentPage,
  normalizeEbookDocument,
  validateEbookDocument,
} from "@/lib/ebook-document";
import {
  EbookGenerationError,
  generateEbookPage,
} from "@/lib/ebook-generation";
import {
  MAX_EBOOK_DOCUMENT_PAGES,
} from "@/lib/request-limits";
import { getRouteSession } from "@/lib/session";
import {
  getProjectRecordForUser,
  updateProjectEbookDocument,
} from "@/lib/projects";

const schema = z.object({
  projectId: z.string().min(1),
  insertIndex: z.number().int().min(0),
  instruction: z.string().max(2000).optional(),
});

function pageGenerationFailureStatus(error: unknown) {
  if (!(error instanceof EbookGenerationError)) return 500;
  if (error.status === 408 || error.status === 429 || error.status === 503 || error.status === 504) {
    return error.status;
  }
  return 500;
}

function newPageId() {
  return `page-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

export async function POST(request: Request) {
  const session = await getRouteSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }

  const project = await getProjectRecordForUser(session.user.id, parsed.data.projectId);
  const document = project?.profile.ebookDocument
    ? normalizeEbookDocument(project.profile.ebookDocument)
    : null;
  if (!project || !document) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 });
  }

  if (document.pages.length >= MAX_EBOOK_DOCUMENT_PAGES) {
    return NextResponse.json(
      { message: `Too many ebook pages. Maximum is ${MAX_EBOOK_DOCUMENT_PAGES}.` },
      { status: 400 },
    );
  }

  const insertIndex = Math.max(0, Math.min(parsed.data.insertIndex, document.pages.length));
  let generated;
  try {
    generated = await generateEbookPage({
      document,
      insertIndex,
      pageId: newPageId(),
      instruction: parsed.data.instruction,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add page";
    return NextResponse.json({ message }, { status: pageGenerationFailureStatus(error) });
  }

  const nextDocument = insertEbookDocumentPage({
    document,
    page: generated.page,
    insertIndex,
  });
  const validation = validateEbookDocument(nextDocument);
  if (!validation.ok) {
    return NextResponse.json(
      { message: validation.errors[0] ?? "Invalid ebook document" },
      { status: 500 },
    );
  }

  const html = compileEbookDocumentToHtml(nextDocument);
  const updatedProject = await updateProjectEbookDocument(
    session.user.id,
    parsed.data.projectId,
    nextDocument,
    html,
  );
  if (!updatedProject) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    project: updatedProject,
    pageIndex: insertIndex,
    generation: {
      model: generated.model,
      promptLength: generated.promptLength,
    },
  });
}

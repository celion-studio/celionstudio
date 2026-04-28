import { NextResponse } from "next/server";
import { z } from "zod";
import { getRouteSession } from "@/lib/session";
import { sanitizeEbookHtmlForCanvas, validateCelionSlideHtml } from "@/lib/ebook-html";
import { updateProjectEbookHtml } from "@/lib/projects";

const schema = z.object({
  projectId: z.string().min(1),
  html: z.string().min(1),
});

type SaveRequestBody = z.infer<typeof schema>;

type ParseSaveRequestResult =
  | { ok: true; data: SaveRequestBody }
  | { ok: false; message: string };

type PrepareSaveHtmlResult =
  | { ok: true; html: string }
  | { ok: false; message: string };

export async function parseEbookSaveRequest(
  request: Request,
): Promise<ParseSaveRequestResult> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return { ok: false, message: "Invalid JSON" };
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, message: "Invalid request" };
  }

  return { ok: true, data: parsed.data };
}

export function prepareEbookHtmlForSave(html: string): PrepareSaveHtmlResult {
  const sanitizedHtml = sanitizeEbookHtmlForCanvas(html);
  const validation = validateCelionSlideHtml(sanitizedHtml, {
    allowGenericOutlineHeadings: true,
  });

  if (!validation.ok) {
    return {
      ok: false,
      message: validation.errors[0] ?? "Invalid ebook HTML",
    };
  }

  return { ok: true, html: sanitizedHtml };
}

export async function POST(request: Request) {
  const session = await getRouteSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseEbookSaveRequest(request);
  if (!parsed.ok) {
    return NextResponse.json({ message: parsed.message }, { status: 400 });
  }

  const prepared = prepareEbookHtmlForSave(parsed.data.html);
  if (!prepared.ok) {
    return NextResponse.json({ message: prepared.message }, { status: 400 });
  }

  const result = await updateProjectEbookHtml(
    session.user.id,
    parsed.data.projectId,
    prepared.html,
  );

  if (!result) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

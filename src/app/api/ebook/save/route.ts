import { NextResponse } from "next/server";
import { z } from "zod";
import { getRouteSession } from "@/lib/session";
import { sanitizeEbookHtmlForCanvas } from "@/lib/ebook-html";
import { updateProjectEbookHtml } from "@/lib/projects";

const schema = z.object({
  projectId: z.string().min(1),
  html: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await getRouteSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }

  const result = await updateProjectEbookHtml(
    session.user.id,
    parsed.data.projectId,
    sanitizeEbookHtmlForCanvas(parsed.data.html),
  );

  if (!result) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

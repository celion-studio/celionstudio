import { NextResponse } from "next/server";
import {
  deleteProjectForUser,
  getProjectRecordForUser,
  restoreProjectForUser,
  trashProjectForUser,
} from "@/lib/projects";
import { getRouteSession } from "@/lib/session";

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
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const session = await getRouteSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;
  const permanent = new URL(request.url).searchParams.get("permanent") === "true";
  const deleted = permanent
    ? await deleteProjectForUser(session.user.id, projectId)
    : await trashProjectForUser(session.user.id, projectId);

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

  const body = (await request.json().catch(() => null)) as { action?: string } | null;
  if (body?.action !== "restore") {
    return NextResponse.json({ message: "Invalid action" }, { status: 400 });
  }

  const { projectId } = await context.params;
  const restored = await restoreProjectForUser(session.user.id, projectId);
  if (!restored) return NextResponse.json({ message: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}

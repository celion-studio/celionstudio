import { NextResponse } from "next/server";
import {
  deleteProjectForUser,
  getProjectRecordForUser,
} from "@/lib/projects";
import { getRouteSession } from "@/lib/session";
import { databaseUnavailableResponse } from "@/lib/route-errors";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const session = await getRouteSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const { projectId } = await context.params;
  let project: Awaited<ReturnType<typeof getProjectRecordForUser>>;
  try {
    project = await getProjectRecordForUser(session.user.id, projectId);
  } catch (error) {
    const unavailable = databaseUnavailableResponse(error);
    if (unavailable) return unavailable;
    throw error;
  }

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
  let deleted: Awaited<ReturnType<typeof deleteProjectForUser>>;
  try {
    deleted = await deleteProjectForUser(session.user.id, projectId);
  } catch (error) {
    const unavailable = databaseUnavailableResponse(error);
    if (unavailable) return unavailable;
    throw error;
  }

  if (!deleted) return NextResponse.json({ message: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}

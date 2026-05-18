import { NextResponse } from "next/server";
import { listEbookGenerationLogsForProject } from "@/lib/slide-generation-logs";
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
  const logs = await listEbookGenerationLogsForProject(session.user.id, projectId);
  return NextResponse.json({ logs });
}

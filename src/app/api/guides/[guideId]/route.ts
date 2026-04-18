import { NextResponse } from "next/server";
import { z } from "zod";
import { getGuideRecordForUser, mutateGuideForUser } from "@/lib/guides";
import { getServerSession } from "@/lib/session";

const mutationSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.enum(["generate", "regenerate", "mark-exported"]),
  }),
  z.object({
    action: z.literal("revise"),
    revisionPrompt: z.string().min(1),
  }),
  z.object({
    action: z.literal("regenerate-section"),
    targetSection: z.string().min(1),
    revisionPrompt: z.string().optional(),
  }),
]);

export async function GET(
  _request: Request,
  context: { params: Promise<{ guideId: string }> },
) {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { guideId } = await context.params;
  const guide = await getGuideRecordForUser(session.user.id, guideId);

  if (!guide) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ guide });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ guideId: string }> },
) {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { guideId } = await context.params;
  const json = await request.json();
  const parsed = mutationSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid request body" },
      { status: 400 },
    );
  }

  const guide = await mutateGuideForUser(session.user.id, guideId, parsed.data);

  if (!guide) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ guide });
}

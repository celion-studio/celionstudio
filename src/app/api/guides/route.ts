import { NextResponse } from "next/server";
import { z } from "zod";
import { createGuideForUser, listGuideRecordsForUser } from "@/lib/guides";
import { getServerSession } from "@/lib/session";

const createGuideSchema = z.object({
  profile: z.object({
    targetAudience: z.string().min(1),
    goal: z.string().min(1),
    depth: z.string().min(1),
    tone: z.string().min(1),
    structureStyle: z.string().min(1),
    readerLevel: z.string().min(1),
  }),
  sources: z
    .array(
      z.object({
        id: z.string().min(1),
        kind: z.enum(["pasted_text", "pdf", "md", "txt", "docx"]),
        name: z.string().min(1),
        content: z.string().min(1),
        excerpt: z.string(),
      }),
    )
    .min(1),
});

export async function GET() {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const guides = await listGuideRecordsForUser(session.user.id);
  return NextResponse.json({ guides });
}

export async function POST(request: Request) {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json();
  const parsed = createGuideSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid request body" },
      { status: 400 },
    );
  }

  const guide = await createGuideForUser(session.user.id, parsed.data);

  return NextResponse.json({ guide }, { status: 201 });
}

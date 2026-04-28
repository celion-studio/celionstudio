import { NextResponse } from "next/server";
import { z } from "zod";
import { getRouteSession } from "@/lib/session";
import { generateEbookOutline } from "@/lib/ebook-generation";

const schema = z.object({
  title: z.string().min(1),
  author: z.string().default(""),
  coreMessage: z.string().default(""),
  targetAudience: z.string().default(""),
  sourceText: z.string().default(""),
  pageCount: z.number().int().min(8).max(40).default(16),
  ebookStyle: z.enum(["minimal", "editorial", "neo-brutalism", "bold", "elegant"]),
});

export async function POST(request: Request) {
  const session = await getRouteSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  try {
    const outline = await generateEbookOutline(parsed.data);
    return NextResponse.json({ outline });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate outline";
    return NextResponse.json({ message }, { status: 500 });
  }
}

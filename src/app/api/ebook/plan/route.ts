import { NextResponse } from "next/server";
import { EBOOK_PLAN_GEMINI_MODEL } from "@/lib/ai/gemini";
import { EbookGenerationError, generateEbookPlan } from "@/lib/ebook-generation";
import { getEbookGenerationArgs, parseEbookGenerateRequest } from "@/lib/ebook-generate-request";
import { recordEbookGenerationLog } from "@/lib/ebook-generation-logs";
import { getRouteSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getRouteSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseEbookGenerateRequest(request);
  if (!parsed.ok) {
    return NextResponse.json({ message: parsed.message }, { status: 400 });
  }

  const d = parsed.data;
  const generationArgs = getEbookGenerationArgs(d);

  try {
    const plan = await generateEbookPlan(generationArgs);
    return NextResponse.json({
      plan,
      planModel: EBOOK_PLAN_GEMINI_MODEL,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create plan";
    const status = error instanceof EbookGenerationError && error.status === 429 ? 429 : 500;
    await recordEbookGenerationLog({
      userId: session.user.id,
      status: "failure",
      stage: "plan",
      planModel: EBOOK_PLAN_GEMINI_MODEL,
      htmlModel: "",
      title: d.title,
      purpose: d.purpose,
      targetAudience: d.targetAudience,
      ebookStyle: d.ebookStyle,
      accentColor: d.accentColor,
      sourceCount: d.sources.length,
      sourceTextLength: generationArgs.sourceText.length,
      validation: error instanceof EbookGenerationError ? error.validation : undefined,
      errorReason: error instanceof EbookGenerationError ? error.reason : undefined,
      errorMessage: message,
      errorStatus: status,
      slideCount: error instanceof EbookGenerationError ? error.pageCount : undefined,
    });
    return NextResponse.json({ message }, { status });
  }
}

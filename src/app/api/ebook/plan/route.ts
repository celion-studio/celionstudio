import { NextResponse } from "next/server";
import { EBOOK_PLAN_GEMINI_MODEL } from "@/lib/ai/gemini";
import { SlideGenerationError, generateSlidePlan } from "@/lib/slide-generation";
import { getSlideGenerationArgs, parseSlideGenerateRequest } from "@/lib/slide-generate-request";
import { recordSlideGenerationLog } from "@/lib/slide-generation-logs";
import { getRouteSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getRouteSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseSlideGenerateRequest(request);
  if (!parsed.ok) {
    return NextResponse.json({ message: parsed.message }, { status: 400 });
  }

  const d = parsed.data;
  const generationArgs = getSlideGenerationArgs(d);

  try {
    const plan = await generateSlidePlan(generationArgs);
    return NextResponse.json({
      plan,
      planModel: EBOOK_PLAN_GEMINI_MODEL,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create plan";
    const status = error instanceof SlideGenerationError && error.status === 429 ? 429 : 500;
    await recordSlideGenerationLog({
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
      validation: error instanceof SlideGenerationError ? error.validation : undefined,
      errorReason: error instanceof SlideGenerationError ? error.reason : undefined,
      errorMessage: message,
      errorStatus: status,
      slideCount: error instanceof SlideGenerationError ? error.slideCount : undefined,
    });
    return NextResponse.json({ message }, { status });
  }
}

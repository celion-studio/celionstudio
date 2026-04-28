import { NextResponse } from "next/server";
import { z } from "zod";
import { getRouteSession } from "@/lib/session";
import { DEFAULT_GEMINI_MODEL, GeminiProviderError } from "@/lib/ai/gemini";

const bodySchema = z.object({
  selectedText: z.string().min(1).max(8000),
  instruction: z.string().min(1).max(1000),
});

export async function POST(request: Request) {
  const session = await getRouteSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const { selectedText, instruction } = parsed.data;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ message: "AI service not configured" }, { status: 503 });
  }

  try {
    const model = DEFAULT_GEMINI_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [
            {
              text: "You are a precise writing assistant. The user will give you a piece of text and an instruction on how to revise it. Return ONLY the revised text — no explanations, no quotes, no markdown, no preamble. Preserve formatting marks like line breaks where they make sense.",
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Instruction: ${instruction}\n\nText to revise:\n${selectedText}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
        },
      }),
    });

    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };

    if (!response.ok) {
      return NextResponse.json({ message: "AI service error" }, { status: 502 });
    }

    const revisedText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!revisedText) {
      return NextResponse.json({ message: "AI returned an empty response" }, { status: 502 });
    }

    return NextResponse.json({ revisedText });
  } catch (error) {
    if (error instanceof GeminiProviderError) {
      return NextResponse.json({ message: error.message }, { status: 502 });
    }
    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}

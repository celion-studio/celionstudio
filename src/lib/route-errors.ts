import { NextResponse } from "next/server";
import { isDatabaseUnavailableError } from "@/lib/db";

export async function parseJsonRequest(request: Request) {
  try {
    return { ok: true as const, data: await request.json() as unknown };
  } catch {
    return { ok: false as const, response: NextResponse.json({ message: "Invalid JSON" }, { status: 400 }) };
  }
}

export function databaseUnavailableResponse(error: unknown) {
  if (!isDatabaseUnavailableError(error)) return null;

  return NextResponse.json(
    { message: "Database is temporarily unavailable. Please retry in a moment." },
    { status: 503 },
  );
}

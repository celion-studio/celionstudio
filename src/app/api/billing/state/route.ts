import { NextResponse } from "next/server";
import { getBillingStateForUser } from "@/lib/billing";
import { isDatabaseUnavailableError } from "@/lib/db";
import { getRouteSession } from "@/lib/session";

export async function GET() {
  const session = await getRouteSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const billing = await getBillingStateForUser(session.user.id);
    return NextResponse.json({ billing });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json(
        { message: "Database is temporarily unavailable. Please retry in a moment." },
        { status: 503 },
      );
    }
    throw error;
  }
}

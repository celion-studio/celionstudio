import { CustomerPortal } from "@polar-sh/nextjs";
import { NextResponse, type NextRequest } from "next/server";
import { getPolarCustomerIdForUser, getPolarServer } from "@/lib/billing";
import { getRouteSession } from "@/lib/session";

function appReturnUrl(request: NextRequest) {
  const baseUrl = (process.env.APP_URL || request.nextUrl.origin).replace(/\/$/, "");
  return `${baseUrl}/pricing`;
}

async function getCustomerIdForUser(userId: string) {
  const customerId = await getPolarCustomerIdForUser(userId);
  if (!customerId) {
    throw new Error("No Polar customer is connected yet.");
  }

  return customerId;
}

export async function GET(request: NextRequest) {
  const session = await getRouteSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json({ message: "Billing is not configured yet." }, { status: 503 });
  }

  try {
    return await CustomerPortal({
      accessToken,
      getCustomerId: () => getCustomerIdForUser(userId),
      returnUrl: appReturnUrl(request),
      server: getPolarServer(),
    })(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not open billing portal.";
    const status = message.includes("No Polar customer") ? 404 : 500;
    return NextResponse.json({ message }, { status });
  }
}

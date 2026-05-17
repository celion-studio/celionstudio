import { NextResponse } from "next/server";
import { z } from "zod";
import { createBillingCheckout, PAID_BILLING_PLAN_IDS } from "@/lib/billing";
import { getRouteSession } from "@/lib/session";

const checkoutSchema = z.object({
  plan: z.enum(PAID_BILLING_PLAN_IDS),
  billingCycle: z.enum(["monthly", "annual"]).optional(),
});

function requestOrigin(request: Request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function POST(request: Request) {
  const session = await getRouteSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid billing plan." }, { status: 400 });
  }

  try {
    const checkout = await createBillingCheckout({
      plan: parsed.data.plan,
      billingCycle: parsed.data.billingCycle,
      user: session.user,
      origin: requestOrigin(request),
    });

    return NextResponse.json(checkout);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create checkout.";
    const status = message.includes("not configured") ? 503 : 500;
    return NextResponse.json({ message }, { status });
  }
}

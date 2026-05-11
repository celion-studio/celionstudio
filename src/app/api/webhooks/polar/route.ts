import { Webhooks } from "@polar-sh/nextjs";
import { NextResponse, type NextRequest } from "next/server";
import { handlePolarWebhookPayload } from "@/lib/billing";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ message: "Polar webhook secret is not configured." }, { status: 503 });
  }

  return Webhooks({
    webhookSecret,
    onPayload: async (payload) => {
      await handlePolarWebhookPayload(payload);
    },
  })(request);
}

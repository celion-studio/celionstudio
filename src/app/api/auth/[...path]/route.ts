import { auth } from "@/lib/auth";

const handler = auth?.handler();

function missingConfigResponse() {
  return Response.json(
    {
      message:
        "Neon Auth is not configured. Set NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET.",
    },
    { status: 500 },
  );
}

async function missingHandler() {
  return missingConfigResponse();
}

export const GET = handler?.GET ?? missingHandler;
export const POST = handler?.POST ?? missingHandler;
export const PUT = handler?.PUT ?? missingHandler;
export const DELETE = handler?.DELETE ?? missingHandler;
export const PATCH = handler?.PATCH ?? missingHandler;

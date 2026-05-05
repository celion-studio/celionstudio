import { auth } from "@/lib/auth";

const handler = auth?.handler();

type AuthRouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

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

async function handleGet(request: Request, context: AuthRouteContext) {
  if (!handler) return missingConfigResponse();

  const params = await context.params;
  if (params.path.join("/") !== "get-session") {
    return handler.GET(request, { params: Promise.resolve(params) });
  }

  const url = new URL(request.url);
  url.searchParams.set("disableCookieCache", "true");

  return handler.GET(new Request(url, request), {
    params: Promise.resolve(params),
  });
}

export const GET = handleGet;
export const POST = handler?.POST ?? missingHandler;
export const PUT = handler?.PUT ?? missingHandler;
export const DELETE = handler?.DELETE ?? missingHandler;
export const PATCH = handler?.PATCH ?? missingHandler;

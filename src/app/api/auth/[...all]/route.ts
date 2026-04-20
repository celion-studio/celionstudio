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

type RouteContext = {
  params: Promise<{ all: string[] }>;
};

function wrapHandler(
  method:
    | ((
        request: Request,
        context: { params: Promise<{ path: string[] }> },
      ) => Promise<Response>)
    | undefined,
) {
  if (!method) {
    return missingConfigResponse;
  }

  return async (request: Request, context: RouteContext) => {
    const { all } = await context.params;

    return method(request, {
      params: Promise.resolve({ path: all }),
    });
  };
}

export const GET = wrapHandler(handler?.GET);
export const POST = wrapHandler(handler?.POST);
export const PUT = wrapHandler(handler?.PUT);
export const DELETE = wrapHandler(handler?.DELETE);
export const PATCH = wrapHandler(handler?.PATCH);

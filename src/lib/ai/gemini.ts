import { AiJsonExtractionError, extractJsonObjectFromText } from "./json";

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
export const EBOOK_GEMINI_MODEL = "gemini-3.1-pro-preview";
const DEFAULT_GEMINI_BASE_URL = "https://generativelanguage.googleapis.com";

export type GeminiErrorCode =
  | "GEMINI_API_KEY_MISSING"
  | "GEMINI_NETWORK_ERROR"
  | "GEMINI_API_ERROR"
  | "GEMINI_EMPTY_RESPONSE"
  | "GEMINI_JSON_PARSE_FAILED";

export class GeminiProviderError extends Error {
  readonly code: GeminiErrorCode;
  readonly status?: number;

  constructor(
    code: GeminiErrorCode,
    message: string,
    options: ErrorOptions & { status?: number } = {},
  ) {
    super(`${code}: ${message}`, options);
    this.name = "GeminiProviderError";
    this.code = code;
    this.status = options.status;
  }
}

type GeminiEnv = {
  GEMINI_API_KEY?: string;
};

export type GenerateJsonWithGeminiOptions = {
  system: string;
  user: string;
  model?: string;
  temperature?: number;
  apiKey?: string;
  env?: GeminiEnv;
  fetchFn?: typeof fetch;
  baseUrl?: string;
};

type GeminiCandidatePart = {
  text?: unknown;
};

type GeminiCandidate = {
  content?: {
    parts?: GeminiCandidatePart[];
  };
};

type GeminiGenerateContentResponse = {
  candidates?: GeminiCandidate[];
  error?: {
    message?: unknown;
    status?: unknown;
  };
};

function trimRequired(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new GeminiProviderError("GEMINI_API_ERROR", `${label} must be a non-empty string.`);
  }
  return trimmed;
}

function resolveApiKey(options: GenerateJsonWithGeminiOptions) {
  const apiKey = options.apiKey ?? options.env?.GEMINI_API_KEY ?? process.env.GEMINI_API_KEY;
  const trimmed = apiKey?.trim();

  if (!trimmed) {
    throw new GeminiProviderError(
      "GEMINI_API_KEY_MISSING",
      "GEMINI_API_KEY is required to call Gemini. Catch this code in the project layer to use a deterministic fallback.",
    );
  }

  return trimmed;
}

function buildGenerateContentUrl(model: string, baseUrl = DEFAULT_GEMINI_BASE_URL) {
  const modelPath = model.startsWith("models/") ? model : `models/${model}`;
  return `${baseUrl.replace(/\/+$/, "")}/v1beta/${modelPath}:generateContent`;
}

function apiErrorMessage(body: unknown) {
  if (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof (body as GeminiGenerateContentResponse).error?.message === "string"
  ) {
    const status = (body as GeminiGenerateContentResponse).error?.status;
    return typeof status === "string"
      ? `${status}: ${(body as GeminiGenerateContentResponse).error?.message}`
      : (body as GeminiGenerateContentResponse).error?.message;
  }

  return undefined;
}

async function readResponseBody(response: Response) {
  const text = await response.text();
  if (!text.trim()) return { text, json: undefined };

  try {
    return { text, json: JSON.parse(text) as unknown };
  } catch (error) {
    throw new GeminiProviderError(
      "GEMINI_API_ERROR",
      "Gemini API returned an invalid JSON response envelope.",
      { cause: error, status: response.status },
    );
  }
}

function extractCandidateText(body: GeminiGenerateContentResponse) {
  const text = body.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();

  if (!text) {
    throw new GeminiProviderError(
      "GEMINI_EMPTY_RESPONSE",
      "Gemini response did not include candidate text.",
    );
  }

  return text;
}

export async function generateJsonWithGemini(
  options: GenerateJsonWithGeminiOptions,
): Promise<unknown> {
  const apiKey = resolveApiKey(options);
  const model = trimRequired(options.model ?? DEFAULT_GEMINI_MODEL, "model");
  const system = trimRequired(options.system, "system");
  const user = trimRequired(options.user, "user");
  const fetchImpl = options.fetchFn ?? fetch;

  let response: Response;
  try {
    response = await fetchImpl(buildGenerateContentUrl(model, options.baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: system }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: user }],
          },
        ],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: options.temperature ?? 0.2,
        },
      }),
    });
  } catch (error) {
    throw new GeminiProviderError(
      "GEMINI_NETWORK_ERROR",
      "Failed to reach Gemini generateContent endpoint.",
      { cause: error },
    );
  }

  const body = await readResponseBody(response);

  if (!response.ok) {
    const message = apiErrorMessage(body.json) ?? body.text.slice(0, 500).trim();
    throw new GeminiProviderError(
      "GEMINI_API_ERROR",
      `Gemini API returned HTTP ${response.status} ${response.statusText || ""}${
        message ? `: ${message}` : ""
      }`.trim(),
      { status: response.status },
    );
  }

  if (!body.json) {
    throw new GeminiProviderError("GEMINI_EMPTY_RESPONSE", "Gemini API returned an empty body.");
  }

  const candidateText = extractCandidateText(body.json as GeminiGenerateContentResponse);

  try {
    return extractJsonObjectFromText(candidateText);
  } catch (error) {
    if (error instanceof AiJsonExtractionError) {
      throw new GeminiProviderError(
        "GEMINI_JSON_PARSE_FAILED",
        "Gemini returned candidate text, but no valid JSON object could be extracted.",
        { cause: error },
      );
    }
    throw error;
  }
}

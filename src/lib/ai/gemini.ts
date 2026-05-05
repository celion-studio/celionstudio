import { GoogleGenAI, type GoogleGenAIOptions } from "@google/genai";
import { getVercelOidcToken } from "@vercel/oidc";
import { ExternalAccountClient } from "google-auth-library";
import type { BaseExternalAccountClient } from "google-auth-library/build/src/auth/baseexternalclient";
import { AiJsonExtractionError, extractJsonObjectFromText } from "./json";

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
export const EBOOK_BLUEPRINT_GEMINI_MODEL = "gemini-2.5-flash-lite";
export const EBOOK_GEMINI_MODEL = "gemini-3.1-pro-preview";
const DEFAULT_VERTEX_AI_LOCATION = "global";
const DEFAULT_GEMINI_TIMEOUT_MS = 120_000;

export type GeminiErrorCode =
  | "GEMINI_AUTH_ERROR"
  | "GEMINI_API_ERROR"
  | "GEMINI_EMPTY_RESPONSE"
  | "GEMINI_JSON_PARSE_FAILED"
  | "GEMINI_PROJECT_MISSING";

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
  GOOGLE_CLOUD_PROJECT?: string;
  GOOGLE_CLOUD_PROJECT_ID?: string;
  GCLOUD_PROJECT?: string;
  GOOGLE_CLOUD_LOCATION?: string;
  VERTEX_AI_PROJECT_ID?: string;
  VERTEX_AI_LOCATION?: string;
  VERTEX_AI_SERVICE_ACCOUNT_JSON?: string;
  VERTEX_AI_SERVICE_ACCOUNT_JSON_BASE64?: string;
  GCP_PROJECT_ID?: string;
  GCP_PROJECT_NUMBER?: string;
  GCP_SERVICE_ACCOUNT_EMAIL?: string;
  GCP_WORKLOAD_IDENTITY_POOL_ID?: string;
  GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID?: string;
};

type GenAiGenerateContentParams = {
  model: string;
  contents: string;
  config: {
    systemInstruction: string;
    responseMimeType: string;
    temperature: number;
    httpOptions: {
      timeout: number;
    };
  };
};

type GenAiClient = {
  models: {
    generateContent(params: GenAiGenerateContentParams): Promise<{ text?: string }>;
  };
};

type GeminiClientFactory = (options: GoogleGenAIOptions) => GenAiClient;

let geminiClientFactory: GeminiClientFactory | undefined;

export function setGeminiClientFactoryForTests(factory?: GeminiClientFactory) {
  geminiClientFactory = factory;
}

export type GenerateJsonWithGeminiOptions = {
  system: string;
  user: string;
  model?: string;
  temperature?: number;
  timeoutMs?: number;
  vertexProjectId?: string;
  vertexLocation?: string;
  env?: GeminiEnv;
};

function envValue(options: GenerateJsonWithGeminiOptions, key: keyof GeminiEnv) {
  return options.env?.[key] ?? process.env[key];
}

function trimRequired(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new GeminiProviderError("GEMINI_API_ERROR", `${label} must be a non-empty string.`);
  }
  return trimmed;
}

function resolveVertexProjectId(options: GenerateJsonWithGeminiOptions) {
  const projectId = (
    options.vertexProjectId ??
    envValue(options, "GCP_PROJECT_ID") ??
    envValue(options, "VERTEX_AI_PROJECT_ID") ??
    envValue(options, "GOOGLE_CLOUD_PROJECT") ??
    envValue(options, "GOOGLE_CLOUD_PROJECT_ID") ??
    envValue(options, "GCLOUD_PROJECT")
  )?.trim();

  if (!projectId) {
    throw new GeminiProviderError(
      "GEMINI_PROJECT_MISSING",
      "GOOGLE_CLOUD_PROJECT or VERTEX_AI_PROJECT_ID is required to call Gemini through Vertex AI.",
    );
  }

  return projectId;
}

function resolveVertexLocation(options: GenerateJsonWithGeminiOptions) {
  return (
    options.vertexLocation ??
    envValue(options, "VERTEX_AI_LOCATION") ??
    envValue(options, "GOOGLE_CLOUD_LOCATION") ??
    DEFAULT_VERTEX_AI_LOCATION
  ).trim();
}

function parseServiceAccountJson(raw: string) {
  try {
    return JSON.parse(raw) as NonNullable<GoogleGenAIOptions["googleAuthOptions"]>["credentials"];
  } catch (error) {
    throw new GeminiProviderError(
      "GEMINI_AUTH_ERROR",
      "VERTEX_AI_SERVICE_ACCOUNT_JSON must be valid Google service account JSON.",
      { cause: error },
    );
  }
}

function serviceAccountCredentialsFromEnv(options: GenerateJsonWithGeminiOptions) {
  const json = envValue(options, "VERTEX_AI_SERVICE_ACCOUNT_JSON")?.trim();
  if (json) return parseServiceAccountJson(json);

  const base64Json = envValue(options, "VERTEX_AI_SERVICE_ACCOUNT_JSON_BASE64")?.trim();
  if (!base64Json) return undefined;

  try {
    return parseServiceAccountJson(Buffer.from(base64Json, "base64").toString("utf8"));
  } catch (error) {
    if (error instanceof GeminiProviderError) throw error;
    throw new GeminiProviderError(
      "GEMINI_AUTH_ERROR",
      "VERTEX_AI_SERVICE_ACCOUNT_JSON_BASE64 must decode to valid Google service account JSON.",
      { cause: error },
    );
  }
}

function statusFromError(error: unknown) {
  if (typeof error !== "object" || error === null) return undefined;
  const record = error as Record<string, unknown>;
  return typeof record.status === "number" ? record.status : undefined;
}

function wifConfigFromEnv(options: GenerateJsonWithGeminiOptions) {
  const projectNumber = envValue(options, "GCP_PROJECT_NUMBER")?.trim();
  const serviceAccountEmail = envValue(options, "GCP_SERVICE_ACCOUNT_EMAIL")?.trim();
  const poolId = envValue(options, "GCP_WORKLOAD_IDENTITY_POOL_ID")?.trim();
  const providerId = envValue(options, "GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID")?.trim();

  if (!projectNumber && !serviceAccountEmail && !poolId && !providerId) return undefined;

  if (!projectNumber || !serviceAccountEmail || !poolId || !providerId) {
    throw new GeminiProviderError(
      "GEMINI_AUTH_ERROR",
      "GCP_PROJECT_NUMBER, GCP_SERVICE_ACCOUNT_EMAIL, GCP_WORKLOAD_IDENTITY_POOL_ID, and GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID are all required for Vercel OIDC.",
    );
  }

  return { projectNumber, serviceAccountEmail, poolId, providerId };
}

function createVercelWifAuthClient(options: GenerateJsonWithGeminiOptions) {
  const wifConfig = wifConfigFromEnv(options);
  if (!wifConfig) return undefined;

  const authClient = ExternalAccountClient.fromJSON({
    type: "external_account",
    audience: `//iam.googleapis.com/projects/${wifConfig.projectNumber}/locations/global/workloadIdentityPools/${wifConfig.poolId}/providers/${wifConfig.providerId}`,
    subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    token_url: "https://sts.googleapis.com/v1/token",
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${wifConfig.serviceAccountEmail}:generateAccessToken`,
    subject_token_supplier: {
      getSubjectToken: async () => getVercelOidcToken(),
    },
  });

  if (!authClient) {
    throw new GeminiProviderError(
      "GEMINI_AUTH_ERROR",
      "Failed to create a Google external account client for Vercel OIDC.",
    );
  }

  return authClient as BaseExternalAccountClient;
}

function createVertexGenAiClient(options: GenerateJsonWithGeminiOptions): GenAiClient {
  const credentials = serviceAccountCredentialsFromEnv(options);
  const authClient = createVercelWifAuthClient(options);
  const clientOptions: GoogleGenAIOptions = {
    vertexai: true,
    project: resolveVertexProjectId(options),
    location: resolveVertexLocation(options),
  };

  if (credentials) {
    clientOptions.googleAuthOptions = { credentials };
  } else if (authClient) {
    clientOptions.googleAuthOptions = {
      authClient,
      projectId: resolveVertexProjectId(options),
    };
  }

  return geminiClientFactory ? geminiClientFactory(clientOptions) : new GoogleGenAI(clientOptions);
}

export async function generateJsonWithGemini(
  options: GenerateJsonWithGeminiOptions,
): Promise<unknown> {
  const model = trimRequired(options.model ?? DEFAULT_GEMINI_MODEL, "model");
  const system = trimRequired(options.system, "system");
  const user = trimRequired(options.user, "user");
  const client = createVertexGenAiClient(options);

  let text: string | undefined;
  try {
    const response = await client.models.generateContent({
      model,
      contents: user,
      config: {
        systemInstruction: system,
        responseMimeType: "application/json",
        temperature: options.temperature ?? 0.2,
        httpOptions: {
          timeout: options.timeoutMs ?? DEFAULT_GEMINI_TIMEOUT_MS,
        },
      },
    });
    text = response.text;
  } catch (error) {
    const status = statusFromError(error);
    throw new GeminiProviderError(
      status === 401 || status === 403 ? "GEMINI_AUTH_ERROR" : "GEMINI_API_ERROR",
      "Gemini generation through Vertex AI failed.",
      { cause: error, status },
    );
  }

  const candidateText = text?.trim();
  if (!candidateText) {
    throw new GeminiProviderError(
      "GEMINI_EMPTY_RESPONSE",
      "Gemini response did not include candidate text.",
    );
  }

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

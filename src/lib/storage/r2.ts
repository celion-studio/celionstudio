import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

type R2Env = Record<string, string | undefined>;

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
  publicBaseUrl: string;
};

export type R2UploadInput = {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType: string;
  cacheControl?: string;
};

const REQUIRED_R2_ENV_KEYS = [
  "CLOUDFLARE_R2_ACCOUNT_ID",
  "CLOUDFLARE_R2_ACCESS_KEY_ID",
  "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
  "CLOUDFLARE_R2_BUCKET",
  "CLOUDFLARE_R2_PUBLIC_BASE_URL",
] as const;

type R2EnvKey = (typeof REQUIRED_R2_ENV_KEYS)[number];

function requiredEnvValue(env: R2Env, key: R2EnvKey) {
  const value = env[key]?.trim();
  return value || null;
}

export function resolveR2Config(env: R2Env = process.env): R2Config {
  const missing = REQUIRED_R2_ENV_KEYS.filter((key) => !requiredEnvValue(env, key));
  if (missing.length > 0) {
    throw new Error(`Missing Cloudflare R2 environment variables: ${missing.join(", ")}`);
  }

  const accountId = requiredEnvValue(env, "CLOUDFLARE_R2_ACCOUNT_ID")!;
  return {
    accountId,
    accessKeyId: requiredEnvValue(env, "CLOUDFLARE_R2_ACCESS_KEY_ID")!,
    secretAccessKey: requiredEnvValue(env, "CLOUDFLARE_R2_SECRET_ACCESS_KEY")!,
    bucket: requiredEnvValue(env, "CLOUDFLARE_R2_BUCKET")!,
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    publicBaseUrl: requiredEnvValue(env, "CLOUDFLARE_R2_PUBLIC_BASE_URL")!.replace(/\/+$/, ""),
  };
}

export function createR2Client(config: R2Config) {
  return new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

function pathSegment(value: string, fallback: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "") || fallback;
}

function fileExtension(filename: string) {
  return filename.trim().toLowerCase().match(/\.[a-z0-9]{1,12}$/)?.[0] ?? "";
}

export function createR2ObjectKey(input: {
  projectId: string;
  filename: string;
  namespace: string;
  id?: string;
}) {
  const projectId = pathSegment(input.projectId, "project");
  const namespace = pathSegment(input.namespace, "files");
  const id = pathSegment(input.id ?? randomUUID(), "asset");

  return `projects/${projectId}/${namespace}/${id}${fileExtension(input.filename)}`;
}

function encodeObjectKey(key: string) {
  return key
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function buildR2PublicUrl(config: Pick<R2Config, "publicBaseUrl">, key: string) {
  return `${config.publicBaseUrl}/${encodeObjectKey(key)}`;
}

export async function uploadR2Object(
  config: R2Config,
  input: R2UploadInput,
  client = createR2Client(config),
) {
  await client.send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: input.key,
    Body: input.body,
    ContentType: input.contentType,
    CacheControl: input.cacheControl ?? "public, max-age=31536000, immutable",
  }));

  return {
    key: input.key,
    url: buildR2PublicUrl(config, input.key),
  };
}

import assert from "node:assert/strict";
import test from "node:test";
import {
  buildR2PublicUrl,
  createR2ObjectKey,
  resolveR2Config,
} from "./r2";

const validEnv = {
  CLOUDFLARE_R2_ACCOUNT_ID: "account-123",
  CLOUDFLARE_R2_ACCESS_KEY_ID: "access-key",
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: "secret-key",
  CLOUDFLARE_R2_BUCKET: "celion-assets",
  CLOUDFLARE_R2_PUBLIC_BASE_URL: "https://assets.celion.studio/base/",
};

test("resolveR2Config builds the R2 endpoint and normalizes the public base URL", () => {
  const config = resolveR2Config(validEnv);

  assert.equal(config.accountId, "account-123");
  assert.equal(config.bucket, "celion-assets");
  assert.equal(config.endpoint, "https://account-123.r2.cloudflarestorage.com");
  assert.equal(config.publicBaseUrl, "https://assets.celion.studio/base");
});

test("resolveR2Config reports all missing required variables", () => {
  assert.throws(
    () => resolveR2Config({ CLOUDFLARE_R2_BUCKET: "celion-assets" }),
    /Missing Cloudflare R2 environment variables: CLOUDFLARE_R2_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY, CLOUDFLARE_R2_PUBLIC_BASE_URL/,
  );
});

test("buildR2PublicUrl encodes object key segments without changing path separators", () => {
  const config = resolveR2Config(validEnv);

  assert.equal(
    buildR2PublicUrl(config, "projects/project 1/covers/cover#1.png"),
    "https://assets.celion.studio/base/projects/project%201/covers/cover%231.png",
  );
});

test("createR2ObjectKey produces project-scoped stable object keys", () => {
  assert.equal(
    createR2ObjectKey({
      projectId: "project/one",
      filename: "Cover Image.PNG",
      namespace: "covers",
      id: "asset-01",
    }),
    "projects/project-one/covers/asset-01.png",
  );
});

test("createR2ObjectKey keeps user filenames out of storage keys", () => {
  assert.equal(
    createR2ObjectKey({
      projectId: "Project 1",
      filename: "Quarterly Deck Final!!!.webp",
      namespace: "cover images",
      id: "Image 01",
    }),
    "projects/project-1/cover-images/image-01.webp",
  );
});

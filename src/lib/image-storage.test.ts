import assert from "node:assert/strict";
import test from "node:test";
import {
  BASE64_IN_DOCUMENT_RISKS,
  IMAGE_PROVIDER_SLOTS,
  IMAGE_STORAGE_MAX_DOCUMENT_BYTES,
  ImageStorageError,
  prepareImageForStorage,
  validateDocumentImageStorage,
  validateImageBlobMetadata,
  validateImageDataUrl,
} from "./image-storage";

const tinyPng = "data:image/png;base64,iVBORw0KGgo=";

test("image storage documents why base64-in-document is temporary", () => {
  assert.ok(BASE64_IN_DOCUMENT_RISKS.some((risk) => /autosave/i.test(risk)));
  assert.ok(BASE64_IN_DOCUMENT_RISKS.some((risk) => /roughly one third/i.test(risk)));
});

test("image storage exposes future provider slots without enabling paid services", () => {
  assert.deepEqual(
    IMAGE_PROVIDER_SLOTS.map((slot) => [slot.provider, slot.status]),
    [
      ["local-inline", "active"],
      ["vercel-blob", "future"],
      ["s3", "future"],
      ["r2", "future"],
      ["neon-postgres", "not_recommended"],
    ],
  );
});

test("validateImageDataUrl accepts supported base64 image data URLs", () => {
  const result = validateImageDataUrl(tinyPng);

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.mimeType, "image/png");
  assert.equal(result.value.byteLength, 8);
  assert.equal(result.value.base64Length, 12);
});

test("validateImageBlobMetadata accepts blob-like image metadata", () => {
  const result = validateImageBlobMetadata({
    name: "cover.png",
    type: "image/png",
    size: 8,
    lastModified: 123,
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.value, {
    kind: "blob-metadata",
    name: "cover.png",
    mimeType: "image/png",
    byteLength: 8,
    lastModified: 123,
  });
});

test("image validation rejects unsupported and oversized images explicitly", () => {
  const unsupported = validateImageDataUrl("data:image/svg+xml;base64,PHN2Zz4=");
  assert.equal(unsupported.ok, false);
  if (!unsupported.ok) assert.equal(unsupported.error.code, "unsupported_type");

  const oversized = validateImageBlobMetadata({ name: "big.png", type: "image/png", size: 9 }, { maxBytes: 8 });
  assert.equal(oversized.ok, false);
  if (!oversized.ok) assert.equal(oversized.error.code, "too_large");
});

test("prepareImageForStorage returns the explicit local inline fallback", () => {
  const stored = prepareImageForStorage({
    dataUrl: tinyPng,
    file: { name: "cover.png", type: "image/png", size: 8 },
  });

  assert.equal(stored.status, "stored");
  assert.equal(stored.provider, "local-inline");
  assert.equal(stored.storage, "inline");
  assert.equal(stored.src, tinyPng);
  assert.equal(stored.metadata.name, "cover.png");
  assert.ok(stored.futureProviders.some((slot) => slot.provider === "vercel-blob"));
  assert.ok(stored.futureProviders.some((slot) => slot.provider === "neon-postgres" && slot.status === "not_recommended"));
});

test("prepareImageForStorage throws typed errors for invalid data URLs", () => {
  assert.throws(
    () => prepareImageForStorage({ dataUrl: "blob:http://local/image" }),
    (error) => error instanceof ImageStorageError && error.code === "invalid_data_url",
  );
});

test("validateDocumentImageStorage accepts persisted image references and small inline images", () => {
  const result = validateDocumentImageStorage({
    type: "doc",
    content: [
      { type: "image", attrs: { src: tinyPng } },
      { type: "image", attrs: { src: "https://cdn.example.com/cover.png" } },
    ],
  });

  assert.equal(result.ok, true);
});

test("validateDocumentImageStorage rejects non-persistable image sources and huge payloads", () => {
  const blobSrc = validateDocumentImageStorage({
    type: "doc",
    content: [{ type: "image", attrs: { src: "blob:http://local/image" } }],
  });
  assert.equal(blobSrc.ok, false);
  if (!blobSrc.ok) assert.equal(blobSrc.error.code, "non_persistable_src");

  const hugeDocument = validateDocumentImageStorage(
    { text: "x".repeat(IMAGE_STORAGE_MAX_DOCUMENT_BYTES + 1) },
  );
  assert.equal(hugeDocument.ok, false);
  if (!hugeDocument.ok) assert.equal(hugeDocument.error.code, "document_too_large");
});

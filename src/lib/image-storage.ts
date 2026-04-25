export const IMAGE_STORAGE_MAX_INLINE_BYTES = 5 * 1024 * 1024;
export const IMAGE_STORAGE_MAX_DOCUMENT_BYTES = 16 * 1024 * 1024;

export const BASE64_IN_DOCUMENT_RISKS = [
  "Base64 expands binary payloads by roughly one third before JSON and database overhead.",
  "Every autosave, undo snapshot, collaboration payload, and export has to carry the full image bytes.",
  "Inline image bytes make document diffing, caching, deduplication, and later CDN delivery harder.",
] as const;

export type ImageStorageProvider =
  | "local-inline"
  | "vercel-blob"
  | "s3"
  | "r2"
  | "neon-postgres";

export type ImageProviderSlot = {
  provider: ImageStorageProvider;
  status: "active" | "future" | "not_recommended";
  note: string;
};

export const IMAGE_PROVIDER_SLOTS: ImageProviderSlot[] = [
  {
    provider: "local-inline",
    status: "active",
    note: "Current fallback only. Stores the data URL in the Tiptap document until object storage is wired.",
  },
  {
    provider: "vercel-blob",
    status: "future",
    note: "Good fit for hosted object storage and public CDN URLs when the app is deployed on Vercel.",
  },
  {
    provider: "s3",
    status: "future",
    note: "Good generic production slot for private buckets, signed uploads, and CDN-backed delivery.",
  },
  {
    provider: "r2",
    status: "future",
    note: "Good production slot when Cloudflare delivery and low-egress object storage are preferred.",
  },
  {
    provider: "neon-postgres",
    status: "not_recommended",
    note: "Use Neon for image records and references, not large binary image bodies.",
  },
];

const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export type ImageStorageErrorCode =
  | "invalid_data_url"
  | "non_persistable_src"
  | "document_too_large"
  | "unsupported_type"
  | "missing_size"
  | "too_large";

export type BlobLikeImageMetadata = {
  name?: string;
  type?: string;
  size?: number;
  lastModified?: number;
};

export type ValidatedImageDataUrl = {
  kind: "data-url";
  dataUrl: string;
  mimeType: string;
  byteLength: number;
  base64Length: number;
};

export type ImageValidationFailure = {
  code: ImageStorageErrorCode;
  message: string;
  note: string;
};

export type ImageValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ImageValidationFailure };

export type ValidatedImageBlobMetadata = {
  kind: "blob-metadata";
  name: string;
  mimeType: string;
  byteLength: number;
  lastModified?: number;
};

export type PrepareImageStorageInput = {
  dataUrl: string;
  file?: BlobLikeImageMetadata;
};

export type LocalInlineImageStorageResult = {
  status: "stored";
  provider: "local-inline";
  storage: "inline";
  src: string;
  metadata: {
    mimeType: string;
    byteLength: number;
    name?: string;
    lastModified?: number;
  };
  warning: string;
  futureProviders: ImageProviderSlot[];
};

export type ImageStorageResult = LocalInlineImageStorageResult;

type ImageValidationOptions = {
  maxBytes?: number;
  maxDocumentBytes?: number;
};

function maxBytesFor(options: ImageValidationOptions | undefined) {
  return options?.maxBytes ?? IMAGE_STORAGE_MAX_INLINE_BYTES;
}

function extensionlessName(name: string | undefined) {
  const trimmed = name?.trim();
  return trimmed || "untitled-image";
}

function normalizeMimeType(type: string | undefined) {
  return type?.split(";")[0]?.trim().toLowerCase() ?? "";
}

function imageTypeFailure(mimeType: string): ImageValidationFailure {
  return {
    code: "unsupported_type",
    message: mimeType ? `${mimeType} is not a supported image type.` : "Image type is missing.",
    note: "Supported image types: PNG, JPEG, WebP, GIF, and AVIF.",
  };
}

function tooLargeFailure(byteLength: number, maxBytes: number): ImageValidationFailure {
  return {
    code: "too_large",
    message: `Image is ${byteLength} bytes, which exceeds the ${maxBytes} byte inline limit.`,
    note: "Large images should be uploaded to object storage and referenced by URL instead of embedded as base64.",
  };
}

function documentTooLargeFailure(byteLength: number, maxBytes: number): ImageValidationFailure {
  return {
    code: "document_too_large",
    message: `Document payload is ${byteLength} bytes, which exceeds the ${maxBytes} byte save limit.`,
    note: "Move large images to object storage and keep only stable image URLs in the document.",
  };
}

function nonPersistableSourceFailure(src: string): ImageValidationFailure {
  const preview = src.length > 80 ? `${src.slice(0, 80)}...` : src;
  return {
    code: "non_persistable_src",
    message: `Image source is not persistable: ${preview}`,
    note: "Use an HTTPS/object-storage URL or a validated temporary base64 data URL.",
  };
}

export function isSupportedImageMimeType(type: string | undefined) {
  return SUPPORTED_IMAGE_MIME_TYPES.has(normalizeMimeType(type));
}

export function validateImageBlobMetadata(
  file: BlobLikeImageMetadata,
  options: ImageValidationOptions = {},
): ImageValidationResult<ValidatedImageBlobMetadata> {
  const mimeType = normalizeMimeType(file.type);
  if (!isSupportedImageMimeType(mimeType)) {
    return { ok: false, error: imageTypeFailure(mimeType) };
  }

  if (typeof file.size !== "number" || !Number.isFinite(file.size) || file.size < 0) {
    return {
      ok: false,
      error: {
        code: "missing_size",
        message: "Image size metadata is missing.",
        note: "Blob/File size is required before deciding whether inline fallback is acceptable.",
      },
    };
  }

  const maxBytes = maxBytesFor(options);
  if (file.size > maxBytes) {
    return { ok: false, error: tooLargeFailure(file.size, maxBytes) };
  }

  return {
    ok: true,
    value: {
      kind: "blob-metadata",
      name: extensionlessName(file.name),
      mimeType,
      byteLength: file.size,
      lastModified: file.lastModified,
    },
  };
}

export function validateImageDataUrl(
  dataUrl: string,
  options: ImageValidationOptions = {},
): ImageValidationResult<ValidatedImageDataUrl> {
  const match = /^data:([^;,]+);base64,([a-z0-9+/=\s]+)$/i.exec(dataUrl);
  if (!match) {
    return {
      ok: false,
      error: {
        code: "invalid_data_url",
        message: "Image source must be a base64 data URL.",
        note: "Expected a value like data:image/png;base64,... from FileReader.readAsDataURL().",
      },
    };
  }

  const mimeType = normalizeMimeType(match[1]);
  if (!isSupportedImageMimeType(mimeType)) {
    return { ok: false, error: imageTypeFailure(mimeType) };
  }

  const base64 = match[2].replace(/\s/g, "");
  if (!base64 || base64.length % 4 !== 0 || !/^[a-z0-9+/]+={0,2}$/i.test(base64)) {
    return {
      ok: false,
      error: {
        code: "invalid_data_url",
        message: "Image data URL has invalid base64 payload.",
        note: "The payload must be complete base64 image data, not an object URL or remote URL.",
      },
    };
  }

  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  const byteLength = (base64.length / 4) * 3 - padding;
  const maxBytes = maxBytesFor(options);

  if (byteLength > maxBytes) {
    return { ok: false, error: tooLargeFailure(byteLength, maxBytes) };
  }

  return {
    ok: true,
    value: {
      kind: "data-url",
      dataUrl,
      mimeType,
      byteLength,
      base64Length: base64.length,
    },
  };
}

function byteLengthOfJson(value: unknown) {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function isPersistableRemoteImageSrc(src: string) {
  return src.startsWith("https://") || src.startsWith("http://") || src.startsWith("/");
}

function validateImageSource(src: string, options: ImageValidationOptions): ImageValidationResult<true> {
  if (src.startsWith("data:")) {
    const result = validateImageDataUrl(src, options);
    return result.ok ? { ok: true, value: true } : result;
  }

  if (isPersistableRemoteImageSrc(src)) {
    return { ok: true, value: true };
  }

  return { ok: false, error: nonPersistableSourceFailure(src) };
}

function visitImageSources(
  value: unknown,
  options: ImageValidationOptions,
): ImageValidationResult<true> {
  if (!value || typeof value !== "object") return { ok: true, value: true };

  if (Array.isArray(value)) {
    for (const item of value) {
      const result = visitImageSources(item, options);
      if (!result.ok) return result;
    }
    return { ok: true, value: true };
  }

  const record = value as Record<string, unknown>;
  if (typeof record.src === "string") {
    const result = validateImageSource(record.src, options);
    if (!result.ok) return result;
  }

  for (const item of Object.values(record)) {
    const result = visitImageSources(item, options);
    if (!result.ok) return result;
  }

  return { ok: true, value: true };
}

export function validateDocumentImageStorage(
  document: unknown,
  options: ImageValidationOptions = {},
): ImageValidationResult<true> {
  const maxDocumentBytes = options.maxDocumentBytes ?? IMAGE_STORAGE_MAX_DOCUMENT_BYTES;
  const documentBytes = byteLengthOfJson(document);

  if (documentBytes > maxDocumentBytes) {
    return { ok: false, error: documentTooLargeFailure(documentBytes, maxDocumentBytes) };
  }

  return visitImageSources(document, options);
}

export function prepareImageForStorage(
  input: PrepareImageStorageInput,
  options: ImageValidationOptions = {},
): ImageStorageResult {
  const dataUrl = validateImageDataUrl(input.dataUrl, options);
  if (!dataUrl.ok) throw new ImageStorageError(dataUrl.error);

  const file = input.file ? validateImageBlobMetadata(input.file, options) : null;
  if (file && !file.ok) throw new ImageStorageError(file.error);

  return {
    status: "stored",
    provider: "local-inline",
    storage: "inline",
    src: dataUrl.value.dataUrl,
    metadata: {
      mimeType: dataUrl.value.mimeType,
      byteLength: dataUrl.value.byteLength,
      name: file?.ok ? file.value.name : input.file?.name,
      lastModified: file?.ok ? file.value.lastModified : input.file?.lastModified,
    },
    warning:
      "Local inline image storage is a temporary fallback. Move image bytes to Vercel Blob, S3, or R2 before relying on large documents or frequent autosave.",
    futureProviders: IMAGE_PROVIDER_SLOTS.filter((slot) => slot.provider !== "local-inline"),
  };
}

export class ImageStorageError extends Error {
  code: ImageStorageErrorCode;
  note: string;

  constructor(error: ImageValidationFailure) {
    super(error.message);
    this.name = "ImageStorageError";
    this.code = error.code;
    this.note = error.note;
  }
}

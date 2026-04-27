import { validateDocumentImageStorage } from "@/lib/image-storage";
import {
  normalizeTiptapBookDocument,
  type TiptapBookDocument,
} from "@/lib/tiptap-document";

export const DOCUMENT_VALIDATION_MAX_NODES = 10_000;
export const DOCUMENT_VALIDATION_MAX_DEPTH = 32;
export const DOCUMENT_VALIDATION_MAX_PAGES = 200;

type DocumentValidationCode =
  | "invalid_document"
  | "unsupported_node"
  | "unsupported_mark"
  | "too_deep"
  | "too_many_nodes"
  | "too_many_pages"
  | "invalid_image";

export type DocumentValidationFailure = {
  code: DocumentValidationCode;
  message: string;
  note: string;
};

export type DocumentValidationResult =
  | { ok: true; document: TiptapBookDocument }
  | { ok: false; error: DocumentValidationFailure };

const ALLOWED_NODE_TYPES = new Set([
  "doc",
  "paragraph",
  "text",
  "heading",
  "blockquote",
  "horizontalRule",
  "bulletList",
  "orderedList",
  "listItem",
  "taskList",
  "taskItem",
  "hardBreak",
  "codeBlock",
  "image",
  "mediaText",
]);

const ALLOWED_MARK_TYPES = new Set([
  "bold",
  "italic",
  "underline",
  "strike",
  "code",
  "highlight",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function failure(
  code: DocumentValidationCode,
  message: string,
  note: string,
): DocumentValidationResult {
  return { ok: false, error: { code, message, note } };
}

function validateInputEnvelope(input: unknown): DocumentValidationResult | null {
  if (!isRecord(input)) {
    return failure(
      "invalid_document",
      "Document payload must be a Tiptap document object.",
      "Save requests must send a Tiptap doc or Celion tiptap-book document, not arbitrary JSON.",
    );
  }

  if (input.type === "doc") {
    return null;
  }

  if (input.type !== "tiptap-book" || input.version !== 1 || !Array.isArray(input.pages)) {
    return failure(
      "invalid_document",
      "Document payload is not a valid Celion Tiptap book.",
      "Expected { type: 'tiptap-book', version: 1, pages: [...] } or a raw Tiptap doc.",
    );
  }

  if (input.pages.length === 0) {
    return failure(
      "invalid_document",
      "Document book must include at least one page.",
      "Celion stores editable content inside the first Tiptap book page.",
    );
  }

  for (const [index, page] of input.pages.entries()) {
    if (!isRecord(page) || typeof page.id !== "string" || !isRecord(page.doc) || page.doc.type !== "doc") {
      return failure(
        "invalid_document",
        `Document page ${index + 1} is malformed.`,
        "Each page must include a string id and a valid Tiptap doc object.",
      );
    }
  }

  return null;
}

function validateMarks(node: Record<string, unknown>): DocumentValidationResult | null {
  if (!Array.isArray(node.marks)) return null;

  for (const mark of node.marks) {
    if (!isRecord(mark) || typeof mark.type !== "string") {
      return failure(
        "unsupported_mark",
        "Document contains an invalid text mark.",
        "Only known Tiptap marks may be saved.",
      );
    }
    if (!ALLOWED_MARK_TYPES.has(mark.type)) {
      return failure(
        "unsupported_mark",
        `Document contains unsupported mark: ${mark.type}`,
        "Update validation and export rendering before saving new mark types.",
      );
    }
  }

  return null;
}

function validateImageNode(type: string, node: Record<string, unknown>) {
  if (type !== "image" && type !== "mediaText") return null;
  const attrs = isRecord(node.attrs) ? node.attrs : null;
  const src = attrs?.src;
  if (typeof src !== "string" || !src.trim()) {
    return failure(
      "invalid_image",
      "Image nodes must include a persisted image URL.",
      "Upload the image first and save the returned Vercel Blob URL in the document.",
    );
  }
  return null;
}

function visitNode(
  node: unknown,
  depth: number,
  counter: { count: number },
): DocumentValidationResult | null {
  if (!isRecord(node)) {
    return failure(
      "invalid_document",
      "Document contains an invalid node.",
      "Every saved node must be a JSON object with a supported Tiptap type.",
    );
  }

  if (depth > DOCUMENT_VALIDATION_MAX_DEPTH) {
    return failure(
      "too_deep",
      "Document nesting is too deep.",
      "Flatten deeply nested generated content before saving.",
    );
  }

  counter.count += 1;
  if (counter.count > DOCUMENT_VALIDATION_MAX_NODES) {
    return failure(
      "too_many_nodes",
      "Document contains too many nodes.",
      "Split the document or simplify generated content before saving.",
    );
  }

  const type = node.type;
  if (typeof type !== "string" || !ALLOWED_NODE_TYPES.has(type)) {
    return failure(
      "unsupported_node",
      typeof type === "string"
        ? `Document contains unsupported node: ${type}`
        : "Document contains a node without a valid type.",
      "Update the editor, validation, and export renderer together before saving new node types.",
    );
  }

  const markError = validateMarks(node);
  if (markError) return markError;

  const imageError = validateImageNode(type, node);
  if (imageError) return imageError;

  if (!Array.isArray(node.content)) return null;
  for (const child of node.content) {
    const childError = visitNode(child, depth + 1, counter);
    if (childError) return childError;
  }

  return null;
}

export function validateTiptapBookDocument(input: unknown): DocumentValidationResult {
  const envelopeError = validateInputEnvelope(input);
  if (envelopeError) return envelopeError;

  const imageStorage = validateDocumentImageStorage(input);
  if (!imageStorage.ok) {
    return {
      ok: false,
      error: {
        code: "invalid_image",
        message: imageStorage.error.message,
        note: imageStorage.error.note,
      },
    };
  }

  const document = normalizeTiptapBookDocument(input);
  if (document.pages.length > DOCUMENT_VALIDATION_MAX_PAGES) {
    return failure(
      "too_many_pages",
      "Document contains too many saved pages.",
      "Celion currently stores one editable document page plus layout metadata.",
    );
  }

  const counter = { count: 0 };
  for (const page of document.pages) {
    const pageError = visitNode(page.doc, 1, counter);
    if (pageError) return pageError;
  }

  return { ok: true, document };
}

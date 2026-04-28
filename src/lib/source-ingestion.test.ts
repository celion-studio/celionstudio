import assert from "node:assert/strict";
import test from "node:test";
import {
  SourceIngestionError,
  buildProjectSourcesFromFilesPartial,
  buildProjectSourcesFromFiles,
  getSourceFileSupport,
  isSupportedSourceFile,
  SOURCE_FILE_ACCEPT,
} from "./source-ingestion";

function textFile(name: string, content: string, type = "text/plain") {
  return {
    name,
    type,
    text: async () => content,
  };
}

function binaryFile(name: string, bytes: Uint8Array, type = "application/octet-stream") {
  return {
    name,
    type,
    text: async () => "",
    arrayBuffer: async () => {
      const buffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(buffer).set(bytes);
      return buffer;
    },
  };
}

test("source ingestion accepts markdown and plain text files", async () => {
  assert.equal(SOURCE_FILE_ACCEPT, ".md,.markdown,.txt,.csv,.json,.html,.htm,.xml,.docx");
  assert.equal(isSupportedSourceFile({ name: "brief.md" }), true);
  assert.equal(isSupportedSourceFile({ name: "brief.markdown" }), true);
  assert.equal(isSupportedSourceFile({ name: "notes.txt" }), true);
  assert.equal(isSupportedSourceFile({ name: "data.csv" }), true);
  assert.equal(isSupportedSourceFile({ name: "page.html" }), true);

  const sources = await buildProjectSourcesFromFiles(
    [
      textFile("brief.md", "  # Brief\n\nUse this source.  "),
      textFile("notes.txt", "Plain notes"),
      textFile("data.csv", "name,value\nA,1"),
    ],
    { createId: (index) => `source-${index + 1}` },
  );

  assert.deepEqual(
    sources.map((source) => ({
      id: source.id,
      kind: source.kind,
      name: source.name,
      content: source.content,
      excerpt: source.excerpt,
    })),
    [
      {
        id: "source-1",
        kind: "md",
        name: "brief.md",
        content: "# Brief\n\nUse this source.",
        excerpt: "# Brief\n\nUse this source.",
      },
      {
        id: "source-2",
        kind: "txt",
        name: "notes.txt",
        content: "Plain notes",
        excerpt: "Plain notes",
      },
      {
        id: "source-3",
        kind: "txt",
        name: "data.csv",
        content: "name,value\nA,1",
        excerpt: "name,value\nA,1",
      },
    ],
  );
});

test("partial source ingestion keeps valid files and reports invalid files", async () => {
  const result = await buildProjectSourcesFromFilesPartial(
    [
      textFile("brief.md", "Valid brief"),
      textFile("deck.pdf", "%PDF"),
      textFile("empty.txt", " "),
      textFile("notes.txt", "Useful notes"),
    ],
    { createId: (index) => `source-${index + 1}` },
  );

  assert.deepEqual(
    result.sources.map((source) => ({
      id: source.id,
      kind: source.kind,
      name: source.name,
      content: source.content,
    })),
    [
      {
        id: "source-1",
        kind: "md",
        name: "brief.md",
        content: "Valid brief",
      },
      {
        id: "source-4",
        kind: "txt",
        name: "notes.txt",
        content: "Useful notes",
      },
    ],
  );
  assert.deepEqual(
    result.errors.map((error) => ({
      fileName: error.fileName,
      code: error.error.code,
    })),
    [
      { fileName: "deck.pdf", code: "extraction_required" },
      { fileName: "empty.txt", code: "empty_source" },
    ],
  );
});

test("source ingestion extracts DOCX files through the configured extractor", async () => {
  const docxSupport = getSourceFileSupport({
    name: "draft.docx",
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  assert.equal(SOURCE_FILE_ACCEPT, ".md,.markdown,.txt,.csv,.json,.html,.htm,.xml,.docx");
  assert.equal(docxSupport.status, "supported");
  assert.equal(isSupportedSourceFile({ name: "draft.docx" }), true);

  const sources = await buildProjectSourcesFromFiles(
    [
      binaryFile(
        "draft.docx",
        new Uint8Array([80, 75, 3, 4]),
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    ],
    {
      createId: () => "source-docx",
      extractDocxText: async (arrayBuffer) => {
        assert.equal(arrayBuffer.byteLength, 4);
        return "  Extracted DOCX text.  ";
      },
    },
  );

  assert.deepEqual(
    sources.map((source) => ({
      id: source.id,
      kind: source.kind,
      name: source.name,
      content: source.content,
      excerpt: source.excerpt,
    })),
    [
      {
        id: "source-docx",
        kind: "docx",
        name: "draft.docx",
        content: "Extracted DOCX text.",
        excerpt: "Extracted DOCX text.",
      },
    ],
  );
});

test("source ingestion returns extraction-needed errors for future PDF support", async () => {
  const pdfSupport = getSourceFileSupport({ name: "deck.pdf", type: "application/pdf" });

  assert.equal(pdfSupport.status, "extraction_required");
  assert.match(pdfSupport.message, /PDF extraction is not connected yet/i);
  assert.match(pdfSupport.note, /unpdf/i);

  await assert.rejects(
    () => buildProjectSourcesFromFiles([textFile("deck.pdf", "%PDF")]),
    (error) =>
      error instanceof SourceIngestionError &&
      error.code === "extraction_required" &&
      /unpdf/i.test(error.note),
  );
});

test("source ingestion rejects unsupported and empty files explicitly", async () => {
  await assert.rejects(
    () => buildProjectSourcesFromFiles([textFile("slides.hwp", "body")]),
    (error) =>
      error instanceof SourceIngestionError &&
      error.code === "unsupported_type" &&
      /not a supported source file type/i.test(error.message),
  );

  await assert.rejects(
    () => buildProjectSourcesFromFiles([textFile("empty.md", " \n\t ")]),
    (error) =>
      error instanceof SourceIngestionError &&
      error.code === "empty_source" &&
      /empty/i.test(error.message),
  );
});

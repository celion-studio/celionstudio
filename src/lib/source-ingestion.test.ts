import assert from "node:assert/strict";
import test from "node:test";
import {
  SourceIngestionError,
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

test("source ingestion accepts markdown and plain text files", async () => {
  assert.equal(SOURCE_FILE_ACCEPT, ".md,.txt");
  assert.equal(isSupportedSourceFile({ name: "brief.md" }), true);
  assert.equal(isSupportedSourceFile({ name: "notes.txt" }), true);

  const sources = await buildProjectSourcesFromFiles(
    [textFile("brief.md", "  # Brief\n\nUse this source.  "), textFile("notes.txt", "Plain notes")],
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
    ],
  );
});

test("source ingestion returns extraction-needed errors for future PDF and DOCX support", async () => {
  const pdfSupport = getSourceFileSupport({ name: "deck.pdf", type: "application/pdf" });
  const docxSupport = getSourceFileSupport({
    name: "draft.docx",
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  assert.equal(pdfSupport.status, "extraction_required");
  assert.match(pdfSupport.message, /PDF extraction is not connected yet/i);
  assert.match(pdfSupport.note, /unpdf/i);

  assert.equal(docxSupport.status, "extraction_required");
  assert.match(docxSupport.message, /DOCX extraction is not connected yet/i);
  assert.match(docxSupport.note, /mammoth/i);

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

import assert from "node:assert/strict";
import test from "node:test";
import { AiJsonExtractionError, extractJsonObjectFromText } from "./json";

test("extractJsonObjectFromText parses a plain JSON object", () => {
  assert.deepEqual(extractJsonObjectFromText('{"ok":true,"count":2}'), {
    ok: true,
    count: 2,
  });
});

test("extractJsonObjectFromText parses json fences with prose and trailing text", () => {
  const parsed = extractJsonObjectFromText(`Here is the result:

\`\`\`json
{
  "document": {
    "type": "doc",
    "content": [{ "type": "text", "text": "Brace in string: }" }]
  }
}
\`\`\`

This is trailing explanation.`);

  assert.deepEqual(parsed, {
    document: {
      type: "doc",
      content: [{ type: "text", text: "Brace in string: }" }],
    },
  });
});

test("extractJsonObjectFromText ignores malformed leading objects and returns first valid object", () => {
  const parsed = extractJsonObjectFromText(`bad { nope } then {"plan":{"chapters":[]}} done`);

  assert.deepEqual(parsed, {
    plan: {
      chapters: [],
    },
  });
});

test("extractJsonObjectFromText reports parse failures distinctly", () => {
  assert.throws(
    () => extractJsonObjectFromText("There is no object here."),
    (error) =>
      error instanceof AiJsonExtractionError &&
      error.message.startsWith("AI_JSON_PARSE_FAILED:"),
  );
});

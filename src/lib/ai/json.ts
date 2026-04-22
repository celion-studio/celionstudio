export class AiJsonExtractionError extends Error {
  readonly code = "AI_JSON_PARSE_FAILED";

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AiJsonExtractionError";
  }
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fencedCandidates(text: string) {
  return Array.from(text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi), (match) => match[1] ?? "");
}

function parseFirstJsonObjectCandidate(text: string): unknown | undefined {
  for (let start = 0; start < text.length; start += 1) {
    if (text[start] !== "{") continue;

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < text.length; index += 1) {
      const char = text[index];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
      } else if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;

        if (depth === 0) {
          const candidate = text.slice(start, index + 1);

          try {
            const parsed = JSON.parse(candidate);
            if (isJsonObject(parsed)) return parsed;
          } catch {
            break;
          }
        }
      }
    }
  }

  return undefined;
}

export function extractJsonObjectFromText(text: string): unknown {
  if (!text.trim()) {
    throw new AiJsonExtractionError(
      "AI_JSON_PARSE_FAILED: Cannot extract a JSON object from an empty response.",
    );
  }

  const candidates = [...fencedCandidates(text), text];

  for (const candidate of candidates) {
    const parsed = parseFirstJsonObjectCandidate(candidate);
    if (parsed !== undefined) return parsed;
  }

  throw new AiJsonExtractionError(
    "AI_JSON_PARSE_FAILED: No valid JSON object could be extracted from the response text.",
  );
}

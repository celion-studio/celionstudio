import { ensureAppSchema, getSql } from "@/lib/db";

type EbookGenerationLogStatus = "success" | "failure";

type EbookGenerationLogInput = {
  userId: string;
  projectId?: string;
  status: EbookGenerationLogStatus;
  stage?: string;
  blueprintModel: string;
  htmlModel: string;
  title: string;
  purpose: string;
  targetAudience: string;
  ebookStyle?: string;
  accentColor?: string;
  sourceCount: number;
  sourceTextLength: number;
  blueprint?: unknown;
  validation?: unknown;
  errorReason?: string;
  errorMessage?: string;
  errorStatus?: number;
  htmlLength?: number;
  slideCount?: number;
};

function truncate(value: string | undefined, maxLength: number) {
  if (!value) return undefined;
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

export async function recordEbookGenerationLog(input: EbookGenerationLogInput) {
  try {
    await ensureAppSchema();
    const sql = getSql();
    await sql`
      INSERT INTO ebook_generation_logs (
        id, user_id, project_id, status, stage,
        blueprint_model, html_model,
        title, purpose, target_audience, ebook_style, accent_color,
        source_count, source_text_length,
        blueprint, validation,
        error_reason, error_message, error_status,
        html_length, slide_count, created_at
      ) VALUES (
        ${crypto.randomUUID()},
        ${input.userId},
        ${input.projectId ?? null},
        ${input.status},
        ${input.stage ?? null},
        ${input.blueprintModel},
        ${input.htmlModel},
        ${truncate(input.title, 300) ?? ""},
        ${truncate(input.purpose, 1000) ?? ""},
        ${truncate(input.targetAudience, 500) ?? ""},
        ${input.ebookStyle ?? null},
        ${input.accentColor ?? null},
        ${input.sourceCount},
        ${input.sourceTextLength},
        ${input.blueprint ? JSON.stringify(input.blueprint) : null}::jsonb,
        ${input.validation ? JSON.stringify(input.validation) : null}::jsonb,
        ${input.errorReason ?? null},
        ${truncate(input.errorMessage, 1000) ?? null},
        ${input.errorStatus ?? null},
        ${input.htmlLength ?? null},
        ${input.slideCount ?? null},
        ${new Date()}
      )
    `;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.warn(`[ebook-generation] log_write_failed ${JSON.stringify({ message })}`);
  }
}

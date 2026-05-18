import { getSql } from "@/lib/db";

type EbookGenerationLogStatus = "success" | "failure";

type SlideGenerationLogInput = {
  userId: string;
  projectId?: string;
  status: EbookGenerationLogStatus;
  stage?: string;
  planModel: string;
  htmlModel: string;
  title: string;
  purpose: string;
  targetAudience: string;
  slideStyle?: string;
  accentColor?: string;
  sourceCount: number;
  sourceTextLength: number;
  plan?: unknown;
  validation?: unknown;
  generationTrace?: unknown;
  errorReason?: string;
  errorMessage?: string;
  errorStatus?: number;
  htmlLength?: number;
  slideCount?: number;
};

type EbookGenerationLogRow = {
  id: string;
  status: EbookGenerationLogStatus;
  stage: string | null;
  planModel: string;
  htmlModel: string;
  title: string;
  purpose: string;
  targetAudience: string;
  ebookStyle: string | null;
  accentColor: string | null;
  sourceCount: number | string;
  sourceTextLength: number | string;
  plan: unknown;
  validation: unknown;
  generationTrace: unknown;
  errorReason: string | null;
  errorMessage: string | null;
  errorStatus: number | string | null;
  htmlLength: number | string | null;
  slideCount: number | string | null;
  createdAt: Date | string;
};

function truncate(value: string | undefined, maxLength: number) {
  if (!value) return undefined;
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function numberOrNull(value: number | string | null) {
  if (value === null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function isoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export async function recordSlideGenerationLog(input: EbookGenerationLogInput) {
  try {
    const sql = getSql();
    await sql`
      INSERT INTO ebook_generation_logs (
        id, user_id, project_id, status, stage,
        plan_model, html_model,
        title, purpose, target_audience, ebook_style, accent_color,
        source_count, source_text_length,
        plan, validation, generation_trace,
        error_reason, error_message, error_status,
        html_length, slide_count, created_at
      ) VALUES (
        ${crypto.randomUUID()},
        ${input.userId},
        ${input.projectId ?? null},
        ${input.status},
        ${input.stage ?? null},
        ${input.planModel},
        ${input.htmlModel},
        ${truncate(input.title, 300) ?? ""},
        ${truncate(input.purpose, 1000) ?? ""},
        ${truncate(input.targetAudience, 500) ?? ""},
        ${input.ebookStyle ?? null},
        ${input.accentColor ?? null},
        ${input.sourceCount},
        ${input.sourceTextLength},
        ${input.plan ? JSON.stringify(input.plan) : null}::jsonb,
        ${input.validation ? JSON.stringify(input.validation) : null}::jsonb,
        ${input.generationTrace ? JSON.stringify(input.generationTrace) : null}::jsonb,
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

export async function listEbookGenerationLogsForProject(
  userId: string,
  projectId: string,
  sql: ReturnType<typeof getSql> = getSql(),
) {
  const rows = (await sql`
    SELECT id, status, stage,
      plan_model AS "planModel",
      html_model AS "htmlModel",
      title, purpose,
      target_audience AS "targetAudience",
      ebook_style AS "ebookStyle",
      accent_color AS "accentColor",
      source_count AS "sourceCount",
      source_text_length AS "sourceTextLength",
      plan, validation,
      generation_trace AS "generationTrace",
      error_reason AS "errorReason",
      error_message AS "errorMessage",
      error_status AS "errorStatus",
      html_length AS "htmlLength",
      slide_count AS "slideCount",
      created_at AS "createdAt"
    FROM ebook_generation_logs
    WHERE project_id::text = ${projectId}
      AND EXISTS (
        SELECT 1 FROM projects
        WHERE id::text = ${projectId}
          AND user_id = ${userId}
          AND deleted_at IS NULL
      )
    ORDER BY created_at DESC
    LIMIT 20
  `) as EbookGenerationLogRow[];

  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    stage: row.stage,
    planModel: row.planModel,
    htmlModel: row.htmlModel,
    title: row.title,
    purpose: row.purpose,
    targetAudience: row.targetAudience,
    ebookStyle: row.ebookStyle,
    accentColor: row.accentColor,
    sourceCount: Number(row.sourceCount) || 0,
    sourceTextLength: Number(row.sourceTextLength) || 0,
    plan: row.plan,
    validation: row.validation,
    generationTrace: row.generationTrace,
    errorReason: row.errorReason,
    errorMessage: row.errorMessage,
    errorStatus: numberOrNull(row.errorStatus),
    htmlLength: numberOrNull(row.htmlLength),
    slideCount: numberOrNull(row.slideCount),
    createdAt: isoString(row.createdAt),
  }));
}

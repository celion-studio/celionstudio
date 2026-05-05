import { ensureAppSchema, getSql } from "@/lib/db";

const DEFAULT_DAILY_GENERATION_LIMIT = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

type QuotaSql = (
  strings: TemplateStringsArray,
  ...params: unknown[]
) => Promise<unknown>;

type QuotaEnv = {
  [key: string]: string | undefined;
  CELION_DAILY_GENERATION_LIMIT?: string;
};

type CheckEbookGenerationQuotaOptions = {
  env?: QuotaEnv;
  now?: Date;
  sql?: QuotaSql;
  ensureSchema?: () => Promise<void>;
};

export type EbookGenerationQuotaResult =
  | { ok: true }
  | { ok: false; status: 429 | 503; message: string };

export function resolveDailyGenerationLimit(env: QuotaEnv = process.env) {
  const raw = env.CELION_DAILY_GENERATION_LIMIT?.trim();
  if (!raw) return DEFAULT_DAILY_GENERATION_LIMIT;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_DAILY_GENERATION_LIMIT;

  return Math.floor(parsed);
}

function countFromRows(rows: unknown) {
  if (!Array.isArray(rows)) return 0;

  const row = rows[0] as { count?: number | string } | undefined;
  const count = Number(row?.count ?? 0);
  return Number.isFinite(count) ? count : 0;
}

export async function checkEbookGenerationQuota(
  userId: string,
  options: CheckEbookGenerationQuotaOptions = {},
): Promise<EbookGenerationQuotaResult> {
  const limit = resolveDailyGenerationLimit(options.env);
  const now = options.now ?? new Date();
  const since = new Date(now.getTime() - DAY_MS);
  const sql = options.sql ?? getSql();
  const ensureSchema = options.ensureSchema ?? ensureAppSchema;

  try {
    await ensureSchema();
    const rows = await sql`
      SELECT COUNT(*)::int AS count
      FROM ebook_generation_logs
      WHERE user_id = ${userId}
        AND created_at >= ${since}
    `;
    const count = countFromRows(rows);

    if (count >= limit) {
      return {
        ok: false,
        status: 429,
        message: `Daily generation limit reached. Try again tomorrow.`,
      };
    }

    return { ok: true };
  } catch {
    return {
      ok: false,
      status: 503,
      message: "Could not verify generation quota. Please try again.",
    };
  }
}

import { createProjectRecord } from "@/lib/project-planning";
import {
  normalizeEbookDocument,
  type CelionEbookDocument,
} from "@/lib/ebook-document";
import { countCelionSlides } from "@/lib/ebook-html";
import { ensureAppSchema, getSql } from "@/lib/db";
import type {
  DesignMode,
  EbookStyle,
  ProjectProfile,
  ProjectRecord,
  ProjectKind,
  ProjectSource,
  ProjectStatus,
} from "@/types/project";

type ProjectCreateProfileInput = Omit<ProjectProfile, "ebookDocument"> & {
  ebookDocument?: CelionEbookDocument | null;
};

type ProjectCreateInput = {
  title: string;
  kind?: ProjectKind;
  profile: ProjectCreateProfileInput;
  sources: ProjectSource[];
};

type ProjectRow = {
  id: string;
  kind: ProjectKind;
  title: string;
  status: ProjectStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type ProfileRow = {
  projectId: string;
  targetAudience: string;
  tone: string;
  author: string;
  purpose: string;
  designMode: string;
  ebookStyle: string | null;
  ebookHtml: string | null;
  ebookDocument: unknown;
  ebookPageCount: number | string;
  accentColor: string;
};

type SourceRow = {
  id: string;
  projectId: string;
  sourceType: ProjectSource["kind"];
  originalFilename: string | null;
  rawText: string;
  normalizedText: string;
  createdAt: Date | string;
};

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function normalizeProjectRecord(input: ProjectRecord): ProjectRecord {
  return {
    ...input,
    kind: input.kind ?? "product",
    revisionPrompt: input.revisionPrompt || undefined,
  };
}

function parseJson<T>(raw: unknown, fallback: T): T {
  if (raw == null || raw === "") return fallback;
  if (typeof raw !== "string") return (raw as T) ?? fallback;

  try {
    const parsed = JSON.parse(raw);
    return (parsed as T) ?? fallback;
  } catch {
    return fallback;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeStoredEbookDocument(raw: unknown): CelionEbookDocument | null {
  if (!isRecord(raw) || !Array.isArray(raw.pages) || raw.pages.length === 0) {
    return null;
  }

  return normalizeEbookDocument(raw);
}

function emptyProfile(): ProjectProfile {
  return {
    author: "",
    targetAudience: "",
    purpose: "",
    designMode: "balanced",
    tone: "",
    ebookStyle: null,
    ebookHtml: null,
    ebookDocument: null,
    ebookPageCount: 16,
    accentColor: "#6366f1",
  };
}

export function profileFromRow(row: ProfileRow): ProjectProfile {
  return {
    author: row.author ?? "",
    targetAudience: row.targetAudience,
    purpose: row.purpose ?? "",
    designMode: (row.designMode as DesignMode) || "balanced",
    tone: row.tone,
    ebookStyle: (row.ebookStyle as EbookStyle | null) ?? null,
    ebookHtml: row.ebookHtml ?? null,
    ebookDocument: normalizeStoredEbookDocument(row.ebookDocument),
    ebookPageCount: Number(row.ebookPageCount) || 16,
    accentColor: row.accentColor ?? "#6366f1",
  };
}

function isMissingProjectProfileColumnError(caught: unknown) {
  return (
    typeof caught === "object" &&
    caught !== null &&
    "code" in caught &&
    caught.code === "42703" &&
    "message" in caught &&
    typeof caught.message === "string" &&
    caught.message.includes("project_profiles")
  );
}

export async function listProjectRecordsForUser(
  userId: string,
  kind: ProjectKind = "product",
) {
  await ensureAppSchema();

  const sql = getSql();
  const projectRows = (await sql`
    SELECT id::text AS id, title, status,
      COALESCE(project_type, 'product') AS kind,
      created_at AS "createdAt", updated_at AS "updatedAt"
    FROM projects
    WHERE user_id = ${userId}
      AND COALESCE(project_type, 'product') = ${kind}
    ORDER BY updated_at DESC
  `) as ProjectRow[];

  if (projectRows.length === 0) return [] as ProjectRecord[];

  const projectIds = projectRows.map((row) => row.id);
  const [profileRowsResult, sourceRowsResult] = await Promise.all([
    sql`
      SELECT project_id::text AS "projectId",
        target_audience AS "targetAudience", tone,
        COALESCE(author, '') AS author,
        COALESCE(purpose, '') AS purpose,
        COALESCE(design_mode, 'balanced') AS "designMode",
        ebook_style AS "ebookStyle",
        ebook_html AS "ebookHtml",
        ebook_document AS "ebookDocument",
        COALESCE(ebook_page_count, 16) AS "ebookPageCount",
        COALESCE(accent_color, '#6366f1') AS "accentColor"
      FROM project_profiles WHERE project_id::text = ANY(${projectIds})
    `,
    sql`
      SELECT id::text AS id, project_id::text AS "projectId",
        source_type AS "sourceType", original_filename AS "originalFilename",
        raw_text AS "rawText", normalized_text AS "normalizedText",
        created_at AS "createdAt"
      FROM source_items WHERE project_id::text = ANY(${projectIds}) ORDER BY created_at DESC
    `,
  ]);
  const profileRows = profileRowsResult as ProfileRow[];
  const sourceRows = sourceRowsResult as SourceRow[];

  const profileMap = new Map<string, ProjectProfile>(
    profileRows.map((row) => [row.projectId, profileFromRow(row)]),
  );
  const sourceMap = new Map<string, ProjectSource[]>();
  for (const row of sourceRows) {
    const next: ProjectSource = {
      id: row.id, kind: row.sourceType,
      name: row.originalFilename ?? "Untitled source",
      content: row.rawText, excerpt: row.normalizedText.slice(0, 180),
    };
    sourceMap.set(row.projectId, [...(sourceMap.get(row.projectId) ?? []), next]);
  }

  return projectRows.map((row) =>
    normalizeProjectRecord({
      id: row.id, kind: row.kind, title: row.title, status: row.status,
      createdAt: toIsoString(row.createdAt), updatedAt: toIsoString(row.updatedAt),
      sources: sourceMap.get(row.id) ?? [],
      profile: profileMap.get(row.id) ?? emptyProfile(),
    }),
  );
}

export async function getProjectRecordForUser(userId: string, projectId: string) {
  await ensureAppSchema();

  const sql = getSql();
  const [projectRow] = (await sql`
    SELECT id::text AS id, title, status,
      COALESCE(project_type, 'product') AS kind,
      created_at AS "createdAt", updated_at AS "updatedAt"
    FROM projects WHERE id::text = ${projectId} AND user_id = ${userId} LIMIT 1
  `) as ProjectRow[];
  if (!projectRow) return null;

  const [profileRowsResult, sourceRowsResult] = await Promise.all([
    sql`
      SELECT project_id::text AS "projectId",
        target_audience AS "targetAudience", tone,
        COALESCE(author, '') AS author,
        COALESCE(purpose, '') AS purpose,
        COALESCE(design_mode, 'balanced') AS "designMode",
        ebook_style AS "ebookStyle",
        ebook_html AS "ebookHtml",
        ebook_document AS "ebookDocument",
        COALESCE(ebook_page_count, 16) AS "ebookPageCount",
        COALESCE(accent_color, '#6366f1') AS "accentColor"
      FROM project_profiles WHERE project_id::text = ${projectRow.id} LIMIT 1
    `,
    sql`
      SELECT id::text AS id, project_id::text AS "projectId",
        source_type AS "sourceType", original_filename AS "originalFilename",
        raw_text AS "rawText", normalized_text AS "normalizedText",
        created_at AS "createdAt"
      FROM source_items WHERE project_id::text = ${projectRow.id} ORDER BY created_at ASC
    `,
  ]);
  const profileRows = profileRowsResult as ProfileRow[];
  const sourceRows = sourceRowsResult as SourceRow[];

  return normalizeProjectRecord({
    id: projectRow.id, title: projectRow.title, status: projectRow.status,
    kind: projectRow.kind,
    createdAt: toIsoString(projectRow.createdAt), updatedAt: toIsoString(projectRow.updatedAt),
    profile: profileRows[0] ? profileFromRow(profileRows[0]) : emptyProfile(),
    sources: sourceRows.map((row) => ({
      id: row.id, kind: row.sourceType,
      name: row.originalFilename ?? "Untitled source",
      content: row.rawText, excerpt: row.normalizedText.slice(0, 180),
    })),
  });
}

export async function createProjectForUser(userId: string, input: ProjectCreateInput) {
  await ensureAppSchema();

  const sql = getSql();
  const p: ProjectProfile = {
    ...input.profile,
    ebookDocument: input.profile.ebookDocument
      ? normalizeEbookDocument(input.profile.ebookDocument)
      : null,
  };
  const draft = createProjectRecord({ ...input, profile: p });
  const projectId = crypto.randomUUID();
  const createdAt = new Date(draft.createdAt);
  const updatedAt = new Date(draft.updatedAt);

  const insertDraft = async () => {
    const sourceQueries = draft.sources.map((source) => {
      const sourceId = crypto.randomUUID();
      return sql`
        INSERT INTO source_items (id, project_id, source_type, original_filename, raw_text, normalized_text, created_at)
        VALUES (${sourceId}, ${projectId}, ${source.kind}, ${source.name}, ${source.content}, ${source.excerpt || source.content.slice(0, 180)}, ${createdAt})
      `;
    });

    await sql.transaction([
      sql`
        INSERT INTO projects (id, user_id, project_type, title, status, created_at, updated_at)
        VALUES (${projectId}, ${userId}, ${draft.kind}, ${draft.title}, ${draft.status}, ${createdAt}, ${updatedAt})
      `,
      sql`
        INSERT INTO project_profiles (
          project_id, target_audience, tone,
          author, purpose, design_mode,
          ebook_style, ebook_html, ebook_document, ebook_page_count, accent_color,
          created_at, updated_at
        ) VALUES (
          ${projectId},
          ${p.targetAudience}, ${p.tone},
          ${p.author}, ${p.purpose}, ${p.designMode},
          ${p.ebookStyle ?? null}, ${p.ebookHtml ?? null},
          ${p.ebookDocument ? JSON.stringify(p.ebookDocument) : null}::jsonb,
          ${p.ebookPageCount ?? 16}, ${p.accentColor ?? "#6366f1"},
          ${createdAt}, ${updatedAt}
        )
      `,
      ...sourceQueries,
    ]);
  };

  try {
    await insertDraft();
  } catch (caught) {
    if (!isMissingProjectProfileColumnError(caught)) {
      throw caught;
    }

    await ensureAppSchema(undefined, { force: true });
    await insertDraft();
  }

  return getProjectRecordForUser(userId, projectId);
}

export function getEbookPageCountForHtml(ebookHtml: string) {
  return Math.max(1, countCelionSlides(ebookHtml));
}

export async function updateProjectEbookHtml(
  userId: string,
  projectId: string,
  ebookHtml: string,
) {
  await ensureAppSchema();

  const sql = getSql();
  const updatedAt = new Date();
  const ebookPageCount = getEbookPageCountForHtml(ebookHtml);
  const [profileRows, projectRows] = await sql.transaction([
    sql`
      UPDATE project_profiles
      SET ebook_html = ${ebookHtml},
          ebook_document = NULL,
          ebook_page_count = ${ebookPageCount},
          updated_at = ${updatedAt}
      WHERE project_id::text = ${projectId}
        AND EXISTS (
          SELECT 1 FROM projects
          WHERE id::text = ${projectId}
            AND user_id = ${userId}
            AND COALESCE(project_type, 'product') = 'product'
        )
      RETURNING project_id::text AS id
    `,
    sql`
      UPDATE projects
      SET status = 'ready', updated_at = ${updatedAt}
      WHERE id::text = ${projectId}
        AND user_id = ${userId}
        AND COALESCE(project_type, 'product') = 'product'
      RETURNING id::text AS id
    `,
  ]) as [{ id: string }[], { id: string }[]];

  if (profileRows.length === 0 || projectRows.length === 0) return null;

  return { updatedAt: updatedAt.toISOString() };
}

export async function updateProjectEbookDocument(
  userId: string,
  projectId: string,
  ebookDocument: CelionEbookDocument,
  ebookHtml: string,
) {
  await ensureAppSchema();

  const sql = getSql();
  const updatedAt = new Date();
  const normalizedDocument = normalizeEbookDocument(ebookDocument);
  const ebookPageCount = getEbookPageCountForHtml(ebookHtml);
  const [profileRows, projectRows] = await sql.transaction([
    sql`
      UPDATE project_profiles
      SET ebook_document = ${JSON.stringify(normalizedDocument)}::jsonb,
          ebook_html = ${ebookHtml},
          ebook_page_count = ${ebookPageCount},
          updated_at = ${updatedAt}
      WHERE project_id::text = ${projectId}
        AND EXISTS (
          SELECT 1 FROM projects
          WHERE id::text = ${projectId}
            AND user_id = ${userId}
            AND COALESCE(project_type, 'product') = 'product'
        )
      RETURNING project_id::text AS id
    `,
    sql`
      UPDATE projects
      SET status = 'ready', updated_at = ${updatedAt}
      WHERE id::text = ${projectId}
        AND user_id = ${userId}
        AND COALESCE(project_type, 'product') = 'product'
      RETURNING id::text AS id
    `,
  ]) as [{ id: string }[], { id: string }[]];

  if (profileRows.length === 0 || projectRows.length === 0) return null;

  return getProjectRecordForUser(userId, projectId);
}

export async function deleteProjectForUser(userId: string, projectId: string) {
  await ensureAppSchema();

  const sql = getSql();
  const deletedRows = (await sql`
    DELETE FROM projects
    WHERE id::text = ${projectId} AND user_id = ${userId}
    RETURNING id::text AS id
  `) as { id: string }[];

  return deletedRows.length > 0;
}


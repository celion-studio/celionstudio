import { createProjectRecord } from "@/lib/project-planning";
import {
  normalizeSlideDocument,
  type CelionSlideDocument,
} from "@/lib/slide-document";
import { countCelionSlides } from "@/lib/slide-html";
import { getSql } from "@/lib/db";
import type {
  DesignMode,
  EbookStyle,
  ProjectProfile,
  ProjectRecord,
  ProjectSource,
  ProjectStatus,
} from "@/types/project";

type ProjectSqlClient = ReturnType<typeof getSql>;

type ProjectCreateProfileInput = Omit<ProjectProfile, "slideDocument"> & {
  slideDocument?: CelionEbookDocument | null;
};

type ProjectCreateInput = {
  title: string;
  profile: ProjectCreateProfileInput;
  sources: ProjectSource[];
};

type ProjectGeneratedInput = ProjectCreateInput;

type ProjectRow = {
  id: string;
  title: string;
  status: ProjectStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
};

export type ProjectSummary = Pick<
  ProjectRecord,
  "id" | "title" | "status" | "createdAt" | "updatedAt" | "deletedAt"
>;

type ProfileRow = {
  projectId: string;
  targetAudience: string;
  tone: string;
  author: string;
  purpose: string;
  designMode: string;
  slideStyle: string | null;
  slideHtml: string | null;
  slideDocument: unknown;
  slideCount: number | string;
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

function toOptionalIsoString(value: Date | string | null | undefined) {
  return value ? toIsoString(value) : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeStoredSlideDocument(raw: unknown): CelionEbookDocument | null {
  if (!isRecord(raw)) {
    return null;
  }

  const rawSlides = Array.isArray(raw.slides)
    ? raw.slides
    : Array.isArray(raw.pages)
      ? raw.pages
      : [];

  if (rawSlides.length === 0) return null;

  return normalizeSlideDocument(raw);
}

function emptyProfile(): ProjectProfile {
  return {
    author: "",
    targetAudience: "",
    purpose: "",
    designMode: "balanced",
    tone: "",
    slideStyle: null,
    slideHtml: null,
    slideDocument: null,
    slideCount: 16,
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
    slideStyle: (row.slideStyle as EbookStyle | null) ?? null,
    slideHtml: row.slideHtml ?? null,
    slideDocument: normalizeStoredSlideDocument(row.slideDocument),
    slideCount: Number(row.slideCount) || 16,
    accentColor: row.accentColor ?? "#6366f1",
  };
}

export async function listProjectSummariesForUser(
  userId: string,
  sql: ProjectSqlClient = getSql(),
): Promise<ProjectSummary[]> {
  const projectRows = (await sql`
    SELECT id::text AS id, title, status,
      created_at AS "createdAt", updated_at AS "updatedAt",
      deleted_at AS "deletedAt"
    FROM projects
    WHERE user_id = ${userId}
      AND deleted_at IS NULL
    ORDER BY updated_at DESC
  `) as ProjectRow[];

  return projectRows.map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
    deletedAt: toOptionalIsoString(row.deletedAt),
  }));
}

export async function listDeletedProjectSummariesForUser(
  userId: string,
  sql: ProjectSqlClient = getSql(),
): Promise<ProjectSummary[]> {
  const projectRows = (await sql`
    SELECT id::text AS id, title, status,
      created_at AS "createdAt", updated_at AS "updatedAt",
      deleted_at AS "deletedAt"
    FROM projects
    WHERE user_id = ${userId}
      AND deleted_at IS NOT NULL
    ORDER BY deleted_at DESC, updated_at DESC
  `) as ProjectRow[];

  return projectRows.map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
    deletedAt: toOptionalIsoString(row.deletedAt),
  }));
}

export async function listProjectRecordsForUser(
  userId: string,
) {
  const sql = getSql();
  const projectRows = (await sql`
    SELECT id::text AS id, title, status,
      created_at AS "createdAt", updated_at AS "updatedAt"
    FROM projects
    WHERE user_id = ${userId}
      AND deleted_at IS NULL
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
        ebook_style AS "slideStyle",
        ebook_html AS "slideHtml",
        ebook_document AS "slideDocument",
        COALESCE(ebook_page_count, 16) AS "slideCount",
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

  return projectRows.map((row) => ({
    id: row.id, title: row.title, status: row.status,
    createdAt: toIsoString(row.createdAt), updatedAt: toIsoString(row.updatedAt),
    sources: sourceMap.get(row.id) ?? [],
    profile: profileMap.get(row.id) ?? emptyProfile(),
  }));
}

export async function getProjectRecordForUser(userId: string, projectId: string) {
  const sql = getSql();
  const [projectRow] = (await sql`
    SELECT id::text AS id, title, status,
      created_at AS "createdAt", updated_at AS "updatedAt"
    FROM projects
    WHERE id::text = ${projectId}
      AND user_id = ${userId}
      AND deleted_at IS NULL
    LIMIT 1
  `) as ProjectRow[];
  if (!projectRow) return null;

  const [profileRowsResult, sourceRowsResult] = await Promise.all([
    sql`
      SELECT project_id::text AS "projectId",
        target_audience AS "targetAudience", tone,
        COALESCE(author, '') AS author,
        COALESCE(purpose, '') AS purpose,
        COALESCE(design_mode, 'balanced') AS "designMode",
        ebook_style AS "slideStyle",
        ebook_html AS "slideHtml",
        ebook_document AS "slideDocument",
        COALESCE(ebook_page_count, 16) AS "slideCount",
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

  return {
    id: projectRow.id, title: projectRow.title, status: projectRow.status,
    createdAt: toIsoString(projectRow.createdAt), updatedAt: toIsoString(projectRow.updatedAt),
    profile: profileRows[0] ? profileFromRow(profileRows[0]) : emptyProfile(),
    sources: sourceRows.map((row) => ({
      id: row.id, kind: row.sourceType,
      name: row.originalFilename ?? "Untitled source",
      content: row.rawText, excerpt: row.normalizedText.slice(0, 180),
    })),
  };
}

export async function createProjectForUser(userId: string, input: ProjectCreateInput) {
  const sql = getSql();
  const p: ProjectProfile = {
    ...input.profile,
    slideDocument: input.profile.slideDocument
      ? normalizeSlideDocument(input.profile.slideDocument)
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
        INSERT INTO projects (id, user_id, title, status, created_at, updated_at)
        VALUES (${projectId}, ${userId}, ${draft.title}, ${draft.status}, ${createdAt}, ${updatedAt})
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
          ${p.slideStyle ?? null}, ${p.slideHtml ?? null},
          ${p.slideDocument ? JSON.stringify(p.slideDocument) : null}::jsonb,
          ${p.slideCount ?? 16}, ${p.accentColor ?? "#6366f1"},
          ${createdAt}, ${updatedAt}
        )
      `,
      ...sourceQueries,
    ]);
  };

  await insertDraft();

  return getProjectRecordForUser(userId, projectId);
}

export function getEbookPageCountForHtml(slideHtml: string) {
  return Math.max(1, countCelionSlides(slideHtml));
}

export async function updateProjectEbookHtml(
  userId: string,
  projectId: string,
  slideHtml: string,
) {
  const sql = getSql();
  const updatedAt = new Date();
  const slideCount = getEbookPageCountForHtml(slideHtml);
  const [profileRows, projectRows] = await sql.transaction([
    sql`
      UPDATE project_profiles
      SET ebook_html = ${slideHtml},
          ebook_document = NULL,
          ebook_page_count = ${slideCount},
          updated_at = ${updatedAt}
      WHERE project_id::text = ${projectId}
        AND EXISTS (
          SELECT 1 FROM projects
          WHERE id::text = ${projectId}
            AND user_id = ${userId}
            AND deleted_at IS NULL
        )
      RETURNING project_id::text AS id
    `,
    sql`
      UPDATE projects
      SET status = 'ready', updated_at = ${updatedAt}
      WHERE id::text = ${projectId}
        AND user_id = ${userId}
        AND deleted_at IS NULL
      RETURNING id::text AS id
    `,
  ]) as [{ id: string }[], { id: string }[]];

  if (profileRows.length === 0 || projectRows.length === 0) return null;

  return { updatedAt: updatedAt.toISOString() };
}

async function writeProjectEbookDocument(
  userId: string,
  projectId: string,
  slideDocument: CelionEbookDocument,
  slideHtml: string,
) {
  const sql = getSql();
  const updatedAt = new Date();
  const normalizedDocument = normalizeSlideDocument(slideDocument);
  const slideCount = getEbookPageCountForHtml(slideHtml);
  const [profileRows, projectRows] = await sql.transaction([
    sql`
      UPDATE project_profiles
      SET ebook_document = ${JSON.stringify(normalizedDocument)}::jsonb,
          ebook_html = ${slideHtml},
          ebook_page_count = ${slideCount},
          updated_at = ${updatedAt}
      WHERE project_id::text = ${projectId}
        AND EXISTS (
          SELECT 1 FROM projects
          WHERE id::text = ${projectId}
            AND user_id = ${userId}
            AND deleted_at IS NULL
        )
      RETURNING project_id::text AS id
    `,
    sql`
      UPDATE projects
      SET status = 'ready', updated_at = ${updatedAt}
      WHERE id::text = ${projectId}
        AND user_id = ${userId}
        AND deleted_at IS NULL
      RETURNING id::text AS id
    `,
  ]) as [{ id: string }[], { id: string }[]];

  if (profileRows.length === 0 || projectRows.length === 0) return null;

  return { updatedAt: updatedAt.toISOString() };
}

export async function updateProjectEbookDocumentForSave(
  userId: string,
  projectId: string,
  slideDocument: CelionEbookDocument,
  slideHtml: string,
) {
  return writeProjectEbookDocument(userId, projectId, slideDocument, slideHtml);
}

export async function updateProjectEbookDocument(
  userId: string,
  projectId: string,
  slideDocument: CelionEbookDocument,
  slideHtml: string,
) {
  const result = await writeProjectEbookDocument(userId, projectId, slideDocument, slideHtml);
  if (!result) return null;

  return getProjectRecordForUser(userId, projectId);
}

export async function updateProjectWithGeneratedEbook(
  userId: string,
  projectId: string,
  input: ProjectGeneratedInput,
) {
  const existing = await getProjectRecordForUser(userId, projectId);
  if (!existing) return null;

  const sql = getSql();
  const p: ProjectProfile = {
    ...input.profile,
    slideDocument: input.profile.slideDocument
      ? normalizeSlideDocument(input.profile.slideDocument)
      : null,
  };
  const updatedAt = new Date();
  const sourceQueries = input.sources.map((source) => {
    const sourceId = crypto.randomUUID();
    return sql`
      INSERT INTO source_items (id, project_id, source_type, original_filename, raw_text, normalized_text, created_at)
      VALUES (${sourceId}, ${projectId}, ${source.kind}, ${source.name}, ${source.content}, ${source.excerpt || source.content.slice(0, 180)}, ${updatedAt})
    `;
  });

  const [projectRows, profileRows] = await sql.transaction([
    sql`
      UPDATE projects
      SET title = ${input.title},
          status = 'ready',
          updated_at = ${updatedAt}
      WHERE id::text = ${projectId}
        AND user_id = ${userId}
        AND deleted_at IS NULL
      RETURNING id::text AS id
    `,
    sql`
      UPDATE project_profiles
      SET target_audience = ${p.targetAudience},
          tone = ${p.tone},
          author = ${p.author},
          purpose = ${p.purpose},
          design_mode = ${p.designMode},
          ebook_style = ${p.slideStyle ?? null},
          ebook_html = ${p.slideHtml ?? null},
          ebook_document = ${p.slideDocument ? JSON.stringify(p.slideDocument) : null}::jsonb,
          ebook_page_count = ${p.slideCount ?? 16},
          accent_color = ${p.accentColor ?? "#6366f1"},
          updated_at = ${updatedAt}
      WHERE project_id::text = ${projectId}
        AND EXISTS (
          SELECT 1 FROM projects
          WHERE id::text = ${projectId}
            AND user_id = ${userId}
            AND deleted_at IS NULL
        )
      RETURNING project_id::text AS id
    `,
    sql`
      DELETE FROM source_items
      WHERE project_id::text = ${projectId}
    `,
    ...sourceQueries,
  ]) as [{ id: string }[], { id: string }[], unknown[], ...unknown[]];

  if (projectRows.length === 0 || profileRows.length === 0) return null;

  return getProjectRecordForUser(userId, projectId);
}

export async function deleteProjectForUser(
  userId: string,
  projectId: string,
  sql: ProjectSqlClient = getSql(),
) {
  const deletedRows = (await sql`
    DELETE FROM projects
    WHERE id::text = ${projectId}
      AND user_id = ${userId}
      AND deleted_at IS NOT NULL
    RETURNING id::text AS id
  `) as { id: string }[];

  return deletedRows.length > 0;
}

export async function trashProjectForUser(
  userId: string,
  projectId: string,
  sql: ProjectSqlClient = getSql(),
) {
  const deletedAt = new Date();
  const rows = (await sql`
    UPDATE projects
    SET deleted_at = ${deletedAt},
        updated_at = ${deletedAt}
    WHERE id::text = ${projectId}
      AND user_id = ${userId}
      AND deleted_at IS NULL
    RETURNING id::text AS id
  `) as { id: string }[];

  return rows.length > 0;
}

export async function restoreProjectForUser(
  userId: string,
  projectId: string,
  sql: ProjectSqlClient = getSql(),
) {
  const updatedAt = new Date();
  const rows = (await sql`
    UPDATE projects
    SET deleted_at = NULL,
        updated_at = ${updatedAt}
    WHERE id::text = ${projectId}
      AND user_id = ${userId}
      AND deleted_at IS NOT NULL
    RETURNING id::text AS id
  `) as { id: string }[];

  return rows.length > 0;
}


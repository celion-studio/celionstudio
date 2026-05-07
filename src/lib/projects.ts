import { createProjectRecord } from "@/lib/project-planning";
import {
  normalizeEbookDocument,
  type CelionEbookDocument,
} from "@/lib/ebook-document";
import { countCelionSlides } from "@/lib/ebook-html";
import { getSql } from "@/lib/db";
import type {
  DesignMode,
  EbookStyle,
  ProjectProfile,
  ProjectRecord,
  ProjectSummary,
  ProjectSource,
  ProjectStatus,
} from "@/types/project";

type ProjectCreateProfileInput = Omit<ProjectProfile, "ebookDocument"> & {
  ebookDocument?: CelionEbookDocument | null;
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
};

type ProjectSummaryRow = ProjectRow & {
  sourceCount: number | string;
  ebookPageCount: number | string | null;
  ebookStyle: string | null;
  accentColor: string | null;
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

function projectSummaryFromRow(row: ProjectSummaryRow): ProjectSummary {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
    sourceCount: Number(row.sourceCount) || 0,
    ebookPageCount: Number(row.ebookPageCount) || 16,
    ebookStyle: (row.ebookStyle as ProjectSummary["ebookStyle"]) ?? null,
    accentColor: row.accentColor ?? "#6366f1",
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

export async function listProjectSummariesForUser(userId: string) {
  const sql = getSql();
  const rows = (await sql`
    SELECT p.id::text AS id,
      p.title,
      p.status,
      p.created_at AS "createdAt",
      p.updated_at AS "updatedAt",
      COALESCE(COUNT(si.id), 0)::int AS "sourceCount",
      COALESCE(pp.ebook_page_count, 16) AS "ebookPageCount",
      pp.ebook_style AS "ebookStyle",
      COALESCE(pp.accent_color, '#6366f1') AS "accentColor"
    FROM projects p
    LEFT JOIN project_profiles pp ON pp.project_id = p.id
    LEFT JOIN source_items si ON si.project_id = p.id
    WHERE p.user_id = ${userId}
    GROUP BY p.id, p.title, p.status, p.created_at, p.updated_at, pp.project_id, pp.ebook_page_count, pp.ebook_style, pp.accent_color
    ORDER BY p.updated_at DESC
  `) as ProjectSummaryRow[];

  return rows.map(projectSummaryFromRow);
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
          ${p.ebookStyle ?? null}, ${p.ebookHtml ?? null},
          ${p.ebookDocument ? JSON.stringify(p.ebookDocument) : null}::jsonb,
          ${p.ebookPageCount ?? 16}, ${p.accentColor ?? "#6366f1"},
          ${createdAt}, ${updatedAt}
        )
      `,
      ...sourceQueries,
    ]);
  };

  await insertDraft();

  return getProjectRecordForUser(userId, projectId);
}

export function getEbookPageCountForHtml(ebookHtml: string) {
  return Math.max(1, countCelionSlides(ebookHtml));
}

type ProjectWriteTargetRow = {
  id: string;
  status: ProjectStatus;
};

type ProjectGenerationClaimRow = {
  id: string;
  previousStatus: ProjectStatus;
};

async function getProjectWriteTargetForUser(userId: string, projectId: string) {
  const sql = getSql();
  const [row] = (await sql`
    SELECT p.id::text AS id, p.status
    FROM projects p
    INNER JOIN project_profiles pp ON pp.project_id = p.id
    WHERE p.id::text = ${projectId}
      AND p.user_id = ${userId}
    LIMIT 1
  `) as ProjectWriteTargetRow[];

  return row ?? null;
}

export async function beginProjectGenerationForUser(userId: string, projectId: string) {
  const sql = getSql();
  const [row] = (await sql`
    WITH target AS (
      SELECT p.id, p.status AS previous_status
      FROM projects p
      INNER JOIN project_profiles pp ON pp.project_id = p.id
      WHERE p.id::text = ${projectId}
        AND p.user_id = ${userId}
        AND p.status <> 'generating'
      LIMIT 1
    ),
    updated AS (
      UPDATE projects p
      SET status = 'generating',
          updated_at = ${new Date()}
      FROM target
      WHERE p.id = target.id
      RETURNING p.id::text AS id, target.previous_status AS "previousStatus"
    )
    SELECT id, "previousStatus" FROM updated
  `) as ProjectGenerationClaimRow[];

  if (row) {
    return {
      ok: true as const,
      previousStatus: row.previousStatus,
    };
  }

  const existing = await getProjectWriteTargetForUser(userId, projectId);
  if (!existing) return { ok: false as const, reason: "not_found" as const };
  if (existing.status === "generating") return { ok: false as const, reason: "busy" as const };

  return { ok: false as const, reason: "not_found" as const };
}

export async function restoreProjectStatusForUser(
  userId: string,
  projectId: string,
  status: ProjectStatus = "draft",
) {
  const sql = getSql();
  await sql`
    UPDATE projects
    SET status = ${status},
        updated_at = ${new Date()}
    WHERE id::text = ${projectId}
      AND user_id = ${userId}
      AND status = 'generating'
  `;
}

export async function updateProjectEbookHtml(
  userId: string,
  projectId: string,
  ebookHtml: string,
) {
  const sql = getSql();
  const updatedAt = new Date();
  const ebookPageCount = getEbookPageCountForHtml(ebookHtml);
  const [row] = (await sql`
    WITH target AS (
      SELECT p.id
      FROM projects p
      INNER JOIN project_profiles pp ON pp.project_id = p.id
      WHERE p.id::text = ${projectId}
        AND p.user_id = ${userId}
      LIMIT 1
    ),
    updated_profile AS (
      UPDATE project_profiles pp
      SET ebook_html = ${ebookHtml},
          ebook_document = NULL,
          ebook_page_count = ${ebookPageCount},
          updated_at = ${updatedAt}
      FROM target
      WHERE pp.project_id = target.id
      RETURNING pp.project_id
    ),
    updated_project AS (
      UPDATE projects p
      SET status = 'ready',
          updated_at = ${updatedAt}
      FROM target
      WHERE p.id = target.id
      RETURNING p.id
    )
    SELECT
      (SELECT COUNT(*) FROM updated_profile)::int AS "profileCount",
      (SELECT COUNT(*) FROM updated_project)::int AS "projectCount"
  `) as { profileCount: number | string; projectCount: number | string }[];

  if (!row || Number(row.profileCount) !== 1 || Number(row.projectCount) !== 1) return null;

  return { updatedAt: updatedAt.toISOString() };
}

export async function updateProjectEbookDocument(
  userId: string,
  projectId: string,
  ebookDocument: CelionEbookDocument,
  ebookHtml: string,
) {
  const sql = getSql();
  const updatedAt = new Date();
  const normalizedDocument = normalizeEbookDocument(ebookDocument);
  const ebookPageCount = getEbookPageCountForHtml(ebookHtml);
  const [row] = (await sql`
    WITH target AS (
      SELECT p.id
      FROM projects p
      INNER JOIN project_profiles pp ON pp.project_id = p.id
      WHERE p.id::text = ${projectId}
        AND p.user_id = ${userId}
      LIMIT 1
    ),
    updated_profile AS (
      UPDATE project_profiles pp
      SET ebook_document = ${JSON.stringify(normalizedDocument)}::jsonb,
          ebook_html = ${ebookHtml},
          ebook_page_count = ${ebookPageCount},
          updated_at = ${updatedAt}
      FROM target
      WHERE pp.project_id = target.id
      RETURNING pp.project_id
    ),
    updated_project AS (
      UPDATE projects p
      SET status = 'ready',
          updated_at = ${updatedAt}
      FROM target
      WHERE p.id = target.id
      RETURNING p.id
    )
    SELECT
      (SELECT COUNT(*) FROM updated_profile)::int AS "profileCount",
      (SELECT COUNT(*) FROM updated_project)::int AS "projectCount"
  `) as { profileCount: number | string; projectCount: number | string }[];

  if (!row || Number(row.profileCount) !== 1 || Number(row.projectCount) !== 1) return null;

  return getProjectRecordForUser(userId, projectId);
}

export async function updateProjectWithGeneratedEbook(
  userId: string,
  projectId: string,
  input: ProjectGeneratedInput,
) {
  const existing = await getProjectWriteTargetForUser(userId, projectId);
  if (!existing) return null;

  const sql = getSql();
  const p: ProjectProfile = {
    ...input.profile,
    ebookDocument: input.profile.ebookDocument
      ? normalizeEbookDocument(input.profile.ebookDocument)
      : null,
  };
  const updatedAt = new Date();
  const sourcePayload = JSON.stringify(input.sources.map((source) => ({
    id: crypto.randomUUID(),
    kind: source.kind,
    name: source.name,
    content: source.content,
    excerpt: source.excerpt || source.content.slice(0, 180),
  })));

  const [row] = (await sql`
    WITH target AS (
      SELECT p.id
      FROM projects p
      INNER JOIN project_profiles pp ON pp.project_id = p.id
      WHERE p.id::text = ${projectId}
        AND p.user_id = ${userId}
      LIMIT 1
    ),
    updated_project AS (
      UPDATE projects p
      SET title = ${input.title},
          status = 'ready',
          updated_at = ${updatedAt}
      FROM target
      WHERE p.id = target.id
      RETURNING p.id
    ),
    updated_profile AS (
      UPDATE project_profiles pp
      SET target_audience = ${p.targetAudience},
          tone = ${p.tone},
          author = ${p.author},
          purpose = ${p.purpose},
          design_mode = ${p.designMode},
          ebook_style = ${p.ebookStyle ?? null},
          ebook_html = ${p.ebookHtml ?? null},
          ebook_document = ${p.ebookDocument ? JSON.stringify(p.ebookDocument) : null}::jsonb,
          ebook_page_count = ${p.ebookPageCount ?? 16},
          accent_color = ${p.accentColor ?? "#6366f1"},
          updated_at = ${updatedAt}
      FROM target
      WHERE pp.project_id = target.id
      RETURNING pp.project_id
    ),
    deleted_sources AS (
      DELETE FROM source_items si
      USING target
      WHERE si.project_id = target.id
      RETURNING si.id
    ),
    source_payload AS (
      SELECT *
      FROM jsonb_to_recordset(${sourcePayload}::jsonb) AS s(
        id text,
        kind text,
        name text,
        content text,
        excerpt text
      )
    ),
    inserted_sources AS (
      INSERT INTO source_items (id, project_id, source_type, original_filename, raw_text, normalized_text, created_at)
      SELECT source_payload.id,
        target.id,
        source_payload.kind,
        source_payload.name,
        source_payload.content,
        source_payload.excerpt,
        ${updatedAt}
      FROM source_payload
      CROSS JOIN target
      RETURNING id
    )
    SELECT
      (SELECT COUNT(*) FROM updated_project)::int AS "projectCount",
      (SELECT COUNT(*) FROM updated_profile)::int AS "profileCount",
      (SELECT COUNT(*) FROM inserted_sources)::int AS "insertedSourceCount"
  `) as {
    projectCount: number | string;
    profileCount: number | string;
    insertedSourceCount: number | string;
  }[];

  if (
    !row ||
    Number(row.projectCount) !== 1 ||
    Number(row.profileCount) !== 1 ||
    Number(row.insertedSourceCount) !== input.sources.length
  ) {
    return null;
  }

  return getProjectRecordForUser(userId, projectId);
}

export async function deleteProjectForUser(userId: string, projectId: string) {
  const sql = getSql();
  const deletedRows = (await sql`
    DELETE FROM projects
    WHERE id::text = ${projectId} AND user_id = ${userId}
    RETURNING id::text AS id
  `) as { id: string }[];

  return deletedRows.length > 0;
}


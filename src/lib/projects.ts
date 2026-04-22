import { createProjectRecord } from "@/lib/project-planning";
import { blockNoteDocumentToHtml, normalizeBlockNoteDocument } from "@/lib/blocknote-document";
import { ensureAppSchema, getSql } from "@/lib/db";
import {
  normalizePageFormat,
  normalizePageSize,
  type PageFormat,
  type PageSize,
} from "@/lib/page-format";
import { withGeneratedProject, withRevisedProject } from "@/lib/project-generation";
import type {
  DesignMode,
  ProjectProfile,
  ProjectRecord,
  ProjectSource,
  ProjectStatus,
  ProjectPlan,
} from "@/types/project";

type ProjectCreateInput = {
  title: string;
  profile: ProjectProfile;
  sources: ProjectSource[];
};

type ProjectRow = {
  id: string;
  title: string;
  status: ProjectStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
  currentHtmlVersionId: string | null;
};

type ProfileRow = {
  projectId: string;
  targetAudience: string;
  goal: string;
  depth: string;
  tone: string;
  structureStyle: string;
  readerLevel: string;
  outline: string;
  author: string;
  coreMessage: string;
  designMode: string;
  pageFormat: string;
  pageWidthMm: number | string | null;
  pageHeightMm: number | string | null;
  plan: unknown;
  blocks: unknown;
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

type HtmlRow = {
  projectId: string;
  html: string;
  versionNumber: number;
};

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function normalizeProjectRecord(input: ProjectRecord): ProjectRecord {
  return { ...input, revisionPrompt: input.revisionPrompt || undefined };
}

function generationProfileState(project: ProjectRecord) {
  return JSON.stringify({
    plan: project.profile.plan,
    blocks: project.profile.blocks,
  });
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

function emptyProfile(): ProjectProfile {
  return {
    author: "",
    targetAudience: "",
    coreMessage: "",
    designMode: "balanced",
    pageFormat: "ebook",
    customPageSize: normalizePageSize(null),
    goal: "",
    depth: "",
    tone: "",
    structureStyle: "",
    readerLevel: "",
    plan: null,
    blocks: [],
  };
}

function profileFromRow(row: ProfileRow): ProjectProfile {
  const rawBlocks = parseJson<unknown>(row.blocks, []);
  const customPageSize = normalizePageSize({
    widthMm: row.pageWidthMm,
    heightMm: row.pageHeightMm,
  });

  return {
    author: row.author ?? "",
    targetAudience: row.targetAudience,
    coreMessage: row.coreMessage ?? "",
    designMode: (row.designMode as DesignMode) || "balanced",
    pageFormat: normalizePageFormat(row.pageFormat),
    customPageSize,
    goal: row.goal,
    depth: row.depth,
    tone: row.tone,
    structureStyle: row.structureStyle,
    readerLevel: row.readerLevel,
    plan: parseJson<ProjectPlan | null>(row.plan, null),
    blocks: normalizeBlockNoteDocument(rawBlocks) as ProjectProfile["blocks"],
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

async function getCurrentHtmlMap(projectIds: string[]) {
  if (projectIds.length === 0) return new Map<string, string>();
  const sql = getSql();
  const rows = (await sql`
    SELECT project_id::text AS "projectId", html, version_number AS "versionNumber"
    FROM html_versions
    WHERE project_id::text = ANY(${projectIds})
    ORDER BY version_number DESC
  `) as HtmlRow[];
  const htmlMap = new Map<string, string>();
  for (const row of rows) {
    if (!htmlMap.has(row.projectId)) htmlMap.set(row.projectId, row.html);
  }
  return htmlMap;
}

async function getNextVersionNumber(projectId: string) {
  const sql = getSql();
  const [row] = (await sql`
    SELECT coalesce(max(version_number), 0) AS count
    FROM html_versions WHERE project_id::text = ${projectId}
  `) as { count: number | string }[];
  return Number(row?.count ?? 0) + 1;
}

export async function listProjectRecordsForUser(userId: string) {
  await ensureAppSchema();

  const sql = getSql();
  const projectRows = (await sql`
    SELECT id::text AS id, title, status,
      created_at AS "createdAt", updated_at AS "updatedAt",
      current_html_version_id::text AS "currentHtmlVersionId"
    FROM projects WHERE user_id = ${userId} ORDER BY updated_at DESC
  `) as ProjectRow[];

  if (projectRows.length === 0) return [] as ProjectRecord[];

  const projectIds = projectRows.map((row) => row.id);
  const [profileRowsResult, sourceRowsResult] = await Promise.all([
    sql`
      SELECT project_id::text AS "projectId",
        target_audience AS "targetAudience", goal, depth, tone,
        structure_style AS "structureStyle", reader_level AS "readerLevel", outline,
        COALESCE(author, '') AS author,
        COALESCE(core_message, '') AS "coreMessage",
        COALESCE(design_mode, 'balanced') AS "designMode",
        COALESCE(page_format, 'ebook') AS "pageFormat",
        COALESCE(page_width_mm, 152) AS "pageWidthMm",
        COALESCE(page_height_mm, 229) AS "pageHeightMm",
        COALESCE(plan, '') AS plan,
        COALESCE(blocks, '[]') AS blocks
      FROM project_profiles WHERE project_id::text = ANY(${projectIds})
    `,
    sql`
      SELECT id::text AS id, project_id::text AS "projectId",
        source_type AS "sourceType", original_filename AS "originalFilename",
        raw_text AS "rawText", normalized_text AS "normalizedText", created_at AS "createdAt"
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
      id: row.id, title: row.title, status: row.status,
      createdAt: toIsoString(row.createdAt), updatedAt: toIsoString(row.updatedAt),
      sources: sourceMap.get(row.id) ?? [],
      profile: profileMap.get(row.id) ?? emptyProfile(),
      html: "",
    }),
  );
}

export async function getProjectRecordForUser(userId: string, projectId: string) {
  await ensureAppSchema();

  const sql = getSql();
  const [projectRow] = (await sql`
    SELECT id::text AS id, title, status,
      created_at AS "createdAt", updated_at AS "updatedAt",
      current_html_version_id::text AS "currentHtmlVersionId"
    FROM projects WHERE id::text = ${projectId} AND user_id = ${userId} LIMIT 1
  `) as ProjectRow[];
  if (!projectRow) return null;

  const [profileRowsResult, sourceRowsResult, htmlMap] = await Promise.all([
    sql`
      SELECT project_id::text AS "projectId",
        target_audience AS "targetAudience", goal, depth, tone,
        structure_style AS "structureStyle", reader_level AS "readerLevel", outline,
        COALESCE(author, '') AS author,
        COALESCE(core_message, '') AS "coreMessage",
        COALESCE(design_mode, 'balanced') AS "designMode",
        COALESCE(page_format, 'ebook') AS "pageFormat",
        COALESCE(page_width_mm, 152) AS "pageWidthMm",
        COALESCE(page_height_mm, 229) AS "pageHeightMm",
        COALESCE(plan, '') AS plan,
        COALESCE(blocks, '[]') AS blocks
      FROM project_profiles WHERE project_id::text = ${projectRow.id} LIMIT 1
    `,
    sql`
      SELECT id::text AS id, project_id::text AS "projectId",
        source_type AS "sourceType", original_filename AS "originalFilename",
        raw_text AS "rawText", normalized_text AS "normalizedText", created_at AS "createdAt"
      FROM source_items WHERE project_id::text = ${projectRow.id} ORDER BY created_at ASC
    `,
    getCurrentHtmlMap([projectRow.id]),
  ]);
  const profileRows = profileRowsResult as ProfileRow[];
  const sourceRows = sourceRowsResult as SourceRow[];

  return normalizeProjectRecord({
    id: projectRow.id, title: projectRow.title, status: projectRow.status,
    createdAt: toIsoString(projectRow.createdAt), updatedAt: toIsoString(projectRow.updatedAt),
    profile: profileRows[0] ? profileFromRow(profileRows[0]) : emptyProfile(),
    sources: sourceRows.map((row) => ({
      id: row.id, kind: row.sourceType,
      name: row.originalFilename ?? "Untitled source",
      content: row.rawText, excerpt: row.normalizedText.slice(0, 180),
    })),
    html: htmlMap.get(projectRow.id) ?? "",
  });
}

export async function createProjectForUser(userId: string, input: ProjectCreateInput) {
  await ensureAppSchema();

  const sql = getSql();
  const draft = createProjectRecord(input);
  const projectId = crypto.randomUUID();
  const createdAt = new Date(draft.createdAt);
  const updatedAt = new Date(draft.updatedAt);
  const p = {
    ...input.profile,
    pageFormat: normalizePageFormat(input.profile.pageFormat),
    customPageSize: normalizePageSize(input.profile.customPageSize),
    blocks: normalizeBlockNoteDocument(input.profile.blocks) as ProjectProfile["blocks"],
  };

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
          project_id, target_audience, goal, depth, tone, structure_style, reader_level, outline,
          author, core_message, design_mode, page_format, page_width_mm, page_height_mm,
          plan, blocks, created_at, updated_at
        ) VALUES (
          ${projectId},
          ${p.targetAudience}, ${p.goal}, ${p.depth}, ${p.tone}, ${p.structureStyle}, ${p.readerLevel}, ${JSON.stringify([])},
          ${p.author}, ${p.coreMessage}, ${p.designMode}, ${p.pageFormat},
          ${p.customPageSize.widthMm}, ${p.customPageSize.heightMm},
          ${p.plan ? JSON.stringify(p.plan) : ""},
          ${JSON.stringify(p.blocks ?? [])},
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

export function withSavedProjectBlocks(project: ProjectRecord, blocks: unknown): ProjectRecord {
  const normalizedBlocks = normalizeBlockNoteDocument(blocks);
  const updatedAt = new Date().toISOString();

  return {
    ...project,
    status: "ready",
    updatedAt,
    profile: {
      ...project.profile,
      blocks: normalizedBlocks as ProjectProfile["blocks"],
    },
    html: blockNoteDocumentToHtml({
      title: project.title,
      blocks: normalizedBlocks,
      pageFormat: project.profile.pageFormat,
      customPageSize: project.profile.customPageSize,
    }),
  };
}

export async function updateProjectPageFormat(
  userId: string,
  projectId: string,
  pageFormat: PageFormat,
  customPageSize: PageSize,
) {
  await ensureAppSchema();

  const sql = getSql();
  const current = await getProjectRecordForUser(userId, projectId);
  if (!current) return null;

  const nextPageFormat = normalizePageFormat(pageFormat);
  const nextPageSize = normalizePageSize(customPageSize);
  const updatedAt = new Date();
  await sql.transaction([
    sql`
      UPDATE project_profiles
      SET page_format = ${nextPageFormat},
          page_width_mm = ${nextPageSize.widthMm},
          page_height_mm = ${nextPageSize.heightMm},
          updated_at = ${updatedAt}
      WHERE project_id::text = ${projectId}
        AND EXISTS (SELECT 1 FROM projects WHERE id::text = ${projectId} AND user_id = ${userId})
    `,
    sql`
      UPDATE projects
      SET updated_at = ${updatedAt}
      WHERE id::text = ${projectId} AND user_id = ${userId}
    `,
  ]);

  return getProjectRecordForUser(userId, projectId);
}

export async function updateProjectBlocks(userId: string, projectId: string, blocks: unknown) {
  await ensureAppSchema();

  const sql = getSql();
  const current = await getProjectRecordForUser(userId, projectId);
  if (!current) return null;

  const [existingProject] = (await sql`
    SELECT id::text AS id, current_html_version_id::text AS "currentHtmlVersionId"
    FROM projects WHERE id::text = ${projectId} AND user_id = ${userId} LIMIT 1
  `) as { id: string; currentHtmlVersionId: string | null }[];
  if (!existingProject) return null;

  const nextProject = withSavedProjectBlocks(current, blocks);
  const updatedAt = new Date(nextProject.updatedAt);
  const queries = [
    sql`
      UPDATE project_profiles
      SET blocks = ${JSON.stringify(nextProject.profile.blocks)}, updated_at = ${updatedAt}
      WHERE project_id::text = ${projectId}
        AND EXISTS (SELECT 1 FROM projects WHERE id::text = ${projectId} AND user_id = ${userId})
    `,
  ];

  if (nextProject.html !== current.html) {
    const versionNumber = await getNextVersionNumber(projectId);
    const versionId = crypto.randomUUID();
    queries.push(sql`
      INSERT INTO html_versions (id, project_id, html, version_number, created_at)
      VALUES (${versionId}, ${projectId}, ${nextProject.html}, ${versionNumber}, ${updatedAt})
    `);
    queries.push(sql`
      UPDATE projects
      SET title = ${nextProject.title}, status = ${nextProject.status},
          updated_at = ${updatedAt}, current_html_version_id = ${versionId}
      WHERE id::text = ${projectId} AND user_id = ${userId}
    `);
  } else {
    queries.push(sql`
      UPDATE projects
      SET title = ${nextProject.title}, status = ${nextProject.status},
          updated_at = ${updatedAt},
          current_html_version_id = ${existingProject.currentHtmlVersionId}
      WHERE id::text = ${projectId} AND user_id = ${userId}
    `);
  }

  await sql.transaction(queries);
  return getProjectRecordForUser(userId, projectId);
}

export async function mutateProjectForUser(
  userId: string,
  projectId: string,
  input:
    | { action: "generate" | "regenerate" | "mark-exported" }
    | { action: "revise"; revisionPrompt: string },
) {
  await ensureAppSchema();

  const sql = getSql();
  const current = await getProjectRecordForUser(userId, projectId);
  if (!current) return null;

  const [existingProject] = (await sql`
    SELECT id::text AS id, current_html_version_id::text AS "currentHtmlVersionId"
    FROM projects WHERE id::text = ${projectId} AND user_id = ${userId} LIMIT 1
  `) as { id: string; currentHtmlVersionId: string | null }[];
  if (!existingProject) return null;

  const generatedProjectResult =
    input.action === "generate" || input.action === "regenerate"
      ? await withGeneratedProject(current)
      : input.action === "revise"
        ? await withRevisedProject(current, input.revisionPrompt)
      : null;

  const nextProject = generatedProjectResult
    ? generatedProjectResult.project
    : { ...current, status: "exported" as const, updatedAt: new Date().toISOString() };

  const queries = [];
  const profileChanged = generationProfileState(nextProject) !== generationProfileState(current);

  if (profileChanged) {
    queries.push(sql`
      UPDATE project_profiles
      SET plan = ${nextProject.profile.plan ? JSON.stringify(nextProject.profile.plan) : ""},
          blocks = ${JSON.stringify(nextProject.profile.blocks)},
          updated_at = ${new Date(nextProject.updatedAt)}
      WHERE project_id::text = ${projectId}
        AND EXISTS (SELECT 1 FROM projects WHERE id::text = ${projectId} AND user_id = ${userId})
    `);
  }

  if (nextProject.html !== current.html) {
    const versionNumber = await getNextVersionNumber(projectId);
    const versionId = crypto.randomUUID();
    queries.push(sql`
      INSERT INTO html_versions (id, project_id, html, version_number, created_at)
      VALUES (${versionId}, ${projectId}, ${nextProject.html}, ${versionNumber}, ${new Date(nextProject.updatedAt)})
    `);
    queries.push(sql`
      UPDATE projects
      SET title = ${nextProject.title}, status = ${nextProject.status},
          updated_at = ${new Date(nextProject.updatedAt)}, current_html_version_id = ${versionId}
      WHERE id::text = ${projectId} AND user_id = ${userId}
    `);
  } else {
    queries.push(sql`
      UPDATE projects
      SET title = ${nextProject.title}, status = ${nextProject.status},
          updated_at = ${new Date(nextProject.updatedAt)},
          current_html_version_id = ${existingProject.currentHtmlVersionId}
      WHERE id::text = ${projectId} AND user_id = ${userId}
    `);
  }

  await sql.transaction(queries);
  return getProjectRecordForUser(userId, projectId);
}


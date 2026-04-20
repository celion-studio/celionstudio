import { createGuideRecord, withGeneratedHtml } from "@/lib/celion-model";
import { ensureAppSchema, sql } from "@/lib/db";
import type { GuideProfile, GuideRecord, GuideSource, GuideStatus } from "@/types/guide";

type GuideCreateInput = {
  profile: GuideProfile;
  sources: GuideSource[];
};

type GuideRow = {
  id: string;
  title: string;
  status: GuideStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
  currentHtmlVersionId: string | null;
};

type ProfileRow = {
  guideId: string;
  targetAudience: string;
  goal: string;
  depth: string;
  tone: string;
  structureStyle: string;
  readerLevel: string;
};

type SourceRow = {
  id: string;
  guideId: string;
  sourceType: GuideSource["kind"];
  originalFilename: string | null;
  rawText: string;
  normalizedText: string;
  createdAt: Date | string;
};

type HtmlRow = {
  guideId: string;
  html: string;
  versionNumber: number;
};

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function normalizeGuideRecord(input: GuideRecord): GuideRecord {
  return {
    ...input,
    revisionPrompt: input.revisionPrompt || undefined,
  };
}

function emptyProfile(): GuideProfile {
  return {
    targetAudience: "",
    goal: "",
    depth: "",
    tone: "",
    structureStyle: "",
    readerLevel: "",
  };
}

async function getCurrentHtmlMap(guideIds: string[]) {
  if (guideIds.length === 0) {
    return new Map<string, string>();
  }

  const rows = (await sql`
    SELECT
      guide_id::text AS "guideId",
      html,
      version_number AS "versionNumber"
    FROM html_versions
    WHERE guide_id::text = ANY(${guideIds})
    ORDER BY version_number DESC
  `) as HtmlRow[];

  const htmlMap = new Map<string, string>();

  for (const row of rows) {
    if (!htmlMap.has(row.guideId)) {
      htmlMap.set(row.guideId, row.html);
    }
  }

  return htmlMap;
}

async function getNextVersionNumber(guideId: string) {
  const [row] = (await sql`
    SELECT coalesce(max(version_number), 0) AS count
    FROM html_versions
    WHERE guide_id::text = ${guideId}
  `) as { count: number | string }[];

  return Number(row?.count ?? 0) + 1;
}

export async function listGuideRecordsForUser(userId: string) {
  await ensureAppSchema();

  const guideRows = (await sql`
    SELECT
      id::text AS id,
      title,
      status,
      created_at AS "createdAt",
      updated_at AS "updatedAt",
      current_html_version_id::text AS "currentHtmlVersionId"
    FROM guides
    WHERE user_id = ${userId}
    ORDER BY updated_at DESC
  `) as GuideRow[];

  if (guideRows.length === 0) {
    return [] as GuideRecord[];
  }

  const guideIds = guideRows.map((row) => row.id);
  const [profileRowsResult, sourceRowsResult] = await Promise.all([
    sql`
      SELECT
        guide_id::text AS "guideId",
        target_audience AS "targetAudience",
        goal,
        depth,
        tone,
        structure_style AS "structureStyle",
        reader_level AS "readerLevel"
      FROM guide_profiles
      WHERE guide_id::text = ANY(${guideIds})
    `,
    sql`
      SELECT
        id::text AS id,
        guide_id::text AS "guideId",
        source_type AS "sourceType",
        original_filename AS "originalFilename",
        raw_text AS "rawText",
        normalized_text AS "normalizedText",
        created_at AS "createdAt"
      FROM source_items
      WHERE guide_id::text = ANY(${guideIds})
      ORDER BY created_at DESC
    `,
  ]);
  const profileRows = profileRowsResult as ProfileRow[];
  const sourceRows = sourceRowsResult as SourceRow[];

  const profileMap = new Map<string, GuideProfile>(
    profileRows.map((row) => [
      row.guideId,
      {
        targetAudience: row.targetAudience,
        goal: row.goal,
        depth: row.depth,
        tone: row.tone,
        structureStyle: row.structureStyle,
        readerLevel: row.readerLevel,
      },
    ]),
  );

  const sourceMap = new Map<string, GuideSource[]>();

  for (const row of sourceRows) {
    const nextSource: GuideSource = {
      id: row.id,
      kind: row.sourceType,
      name: row.originalFilename ?? "Untitled source",
      content: row.rawText,
      excerpt: row.normalizedText.slice(0, 180),
    };

    sourceMap.set(row.guideId, [...(sourceMap.get(row.guideId) ?? []), nextSource]);
  }

  return guideRows.map((row) =>
    normalizeGuideRecord({
      id: row.id,
      title: row.title,
      status: row.status,
      createdAt: toIsoString(row.createdAt),
      updatedAt: toIsoString(row.updatedAt),
      sources: sourceMap.get(row.id) ?? [],
      profile: profileMap.get(row.id) ?? emptyProfile(),
      html: "",
    }),
  );
}

export async function getGuideRecordForUser(userId: string, guideId: string) {
  await ensureAppSchema();

  const [guideRow] = (await sql`
    SELECT
      id::text AS id,
      title,
      status,
      created_at AS "createdAt",
      updated_at AS "updatedAt",
      current_html_version_id::text AS "currentHtmlVersionId"
    FROM guides
    WHERE id::text = ${guideId} AND user_id = ${userId}
    LIMIT 1
  `) as GuideRow[];

  if (!guideRow) {
    return null;
  }

  const [profileRowsResult, sourceRowsResult, htmlMap] = await Promise.all([
    sql`
      SELECT
        guide_id::text AS "guideId",
        target_audience AS "targetAudience",
        goal,
        depth,
        tone,
        structure_style AS "structureStyle",
        reader_level AS "readerLevel"
      FROM guide_profiles
      WHERE guide_id::text = ${guideRow.id}
      LIMIT 1
    `,
    sql`
      SELECT
        id::text AS id,
        guide_id::text AS "guideId",
        source_type AS "sourceType",
        original_filename AS "originalFilename",
        raw_text AS "rawText",
        normalized_text AS "normalizedText",
        created_at AS "createdAt"
      FROM source_items
      WHERE guide_id::text = ${guideRow.id}
      ORDER BY created_at ASC
    `,
    getCurrentHtmlMap([guideRow.id]),
  ]);
  const profileRows = profileRowsResult as ProfileRow[];
  const sourceRows = sourceRowsResult as SourceRow[];

  const profileRow = profileRows[0];

  return normalizeGuideRecord({
    id: guideRow.id,
    title: guideRow.title,
    status: guideRow.status,
    createdAt: toIsoString(guideRow.createdAt),
    updatedAt: toIsoString(guideRow.updatedAt),
    profile:
      profileRow == null
        ? emptyProfile()
        : {
            targetAudience: profileRow.targetAudience,
            goal: profileRow.goal,
            depth: profileRow.depth,
            tone: profileRow.tone,
            structureStyle: profileRow.structureStyle,
            readerLevel: profileRow.readerLevel,
          },
    sources: sourceRows.map((row) => ({
      id: row.id,
      kind: row.sourceType,
      name: row.originalFilename ?? "Untitled source",
      content: row.rawText,
      excerpt: row.normalizedText.slice(0, 180),
    })),
    html: htmlMap.get(guideRow.id) ?? "",
  });
}

export async function createGuideForUser(userId: string, input: GuideCreateInput) {
  await ensureAppSchema();

  const draft = createGuideRecord(input);
  const guideId = crypto.randomUUID();
  const createdAt = new Date(draft.createdAt);
  const updatedAt = new Date(draft.updatedAt);

  const sourceQueries = draft.sources.map((source) => {
    const sourceId = crypto.randomUUID();
    return sql`
      INSERT INTO source_items (
        id,
        guide_id,
        source_type,
        original_filename,
        raw_text,
        normalized_text,
        created_at
      )
      VALUES (
        ${sourceId},
        ${guideId},
        ${source.kind},
        ${source.name},
        ${source.content},
        ${source.excerpt || source.content.slice(0, 180)},
        ${createdAt}
      )
    `;
  });

  await sql.transaction([
    sql`
      INSERT INTO guides (
        id,
        user_id,
        title,
        status,
        created_at,
        updated_at
      )
      VALUES (
        ${guideId},
        ${userId},
        ${draft.title},
        ${draft.status},
        ${createdAt},
        ${updatedAt}
      )
    `,
    sql`
      INSERT INTO guide_profiles (
        guide_id,
        target_audience,
        goal,
        depth,
        tone,
        structure_style,
        reader_level,
        created_at,
        updated_at
      )
      VALUES (
        ${guideId},
        ${draft.profile.targetAudience},
        ${draft.profile.goal},
        ${draft.profile.depth},
        ${draft.profile.tone},
        ${draft.profile.structureStyle},
        ${draft.profile.readerLevel},
        ${createdAt},
        ${updatedAt}
      )
    `,
    ...sourceQueries,
  ]);

  return getGuideRecordForUser(userId, guideId);
}

export async function mutateGuideForUser(
  userId: string,
  guideId: string,
  input:
    | { action: "generate" | "regenerate" }
    | { action: "revise"; revisionPrompt: string }
    | {
        action: "regenerate-section";
        revisionPrompt?: string;
        targetSection: string;
      }
    | { action: "mark-exported" },
) {
  await ensureAppSchema();

  const current = await getGuideRecordForUser(userId, guideId);

  if (!current) {
    return null;
  }

  const [existingGuide] = (await sql`
    SELECT
      id::text AS id,
      title,
      status,
      created_at AS "createdAt",
      updated_at AS "updatedAt",
      current_html_version_id::text AS "currentHtmlVersionId"
    FROM guides
    WHERE id::text = ${guideId} AND user_id = ${userId}
    LIMIT 1
  `) as GuideRow[];

  if (!existingGuide) {
    return null;
  }

  const nextGuide =
    input.action === "generate" || input.action === "regenerate"
      ? withGeneratedHtml(current)
      : input.action === "revise"
        ? withGeneratedHtml(current, {
            revisionPrompt: input.revisionPrompt,
          })
        : input.action === "regenerate-section"
          ? withGeneratedHtml(current, {
              revisionPrompt: input.revisionPrompt,
              targetSection: input.targetSection,
            })
          : {
              ...current,
              status: "exported" as const,
              updatedAt: new Date().toISOString(),
            };

  const queries = [];

  if (nextGuide.html !== current.html) {
    const versionNumber = await getNextVersionNumber(guideId);
    const versionId = crypto.randomUUID();

    queries.push(sql`
      INSERT INTO html_versions (
        id,
        guide_id,
        html,
        version_number,
        created_at
      )
      VALUES (
        ${versionId},
        ${guideId},
        ${nextGuide.html},
        ${versionNumber},
        ${new Date(nextGuide.updatedAt)}
      )
    `);

    queries.push(sql`
      UPDATE guides
      SET
        title = ${nextGuide.title},
        status = ${nextGuide.status},
        updated_at = ${new Date(nextGuide.updatedAt)},
        current_html_version_id = ${versionId}
      WHERE id::text = ${guideId} AND user_id = ${userId}
    `);
  } else {
    queries.push(sql`
      UPDATE guides
      SET
        title = ${nextGuide.title},
        status = ${nextGuide.status},
        updated_at = ${new Date(nextGuide.updatedAt)},
        current_html_version_id = ${existingGuide.currentHtmlVersionId}
      WHERE id::text = ${guideId} AND user_id = ${userId}
    `);
  }

  await sql.transaction(queries);

  return getGuideRecordForUser(userId, guideId);
}

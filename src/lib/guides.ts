import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { createGuideRecord, withGeneratedHtml } from "@/lib/celion-model";
import { db } from "@/lib/db";
import {
  guideProfiles,
  guides,
  htmlVersions,
  sourceItems,
} from "@/lib/db/schema";
import type { GuideProfile, GuideRecord, GuideSource } from "@/types/guide";

type GuideCreateInput = {
  profile: GuideProfile;
  sources: GuideSource[];
};

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}

function normalizeGuideRecord(input: GuideRecord): GuideRecord {
  return {
    ...input,
    revisionPrompt: input.revisionPrompt || undefined,
  };
}

async function getCurrentHtmlMap(guideIds: string[]) {
  if (guideIds.length === 0) {
    return new Map<string, string>();
  }

  const rows = await db
    .select({
      guideId: htmlVersions.guideId,
      html: htmlVersions.html,
      versionNumber: htmlVersions.versionNumber,
    })
    .from(htmlVersions)
    .where(inArray(htmlVersions.guideId, guideIds))
    .orderBy(desc(htmlVersions.versionNumber));

  const htmlMap = new Map<string, string>();

  for (const row of rows) {
    if (!htmlMap.has(row.guideId)) {
      htmlMap.set(row.guideId, row.html);
    }
  }

  return htmlMap;
}

export async function listGuideRecordsForUser(userId: string) {
  const guideRows = await db
    .select()
    .from(guides)
    .where(eq(guides.userId, userId))
    .orderBy(desc(guides.updatedAt));

  if (guideRows.length === 0) {
    return [] as GuideRecord[];
  }

  const guideIds = guideRows.map((row) => row.id);
  const [profileRows, sourceRows] = await Promise.all([
    db
      .select()
      .from(guideProfiles)
      .where(inArray(guideProfiles.guideId, guideIds)),
    db
      .select()
      .from(sourceItems)
      .where(inArray(sourceItems.guideId, guideIds))
      .orderBy(desc(sourceItems.createdAt)),
  ]);

  const profileMap = new Map(
    profileRows.map((row) => [
      row.guideId,
      {
        targetAudience: row.targetAudience,
        goal: row.goal,
        depth: row.depth,
        tone: row.tone,
        structureStyle: row.structureStyle,
        readerLevel: row.readerLevel,
      } satisfies GuideProfile,
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
      profile:
        profileMap.get(row.id) ??
        ({
          targetAudience: "",
          goal: "",
          depth: "",
          tone: "",
          structureStyle: "",
          readerLevel: "",
        } satisfies GuideProfile),
      html: "",
    }),
  );
}

export async function getGuideRecordForUser(userId: string, guideId: string) {
  const guideRow = await db.query.guides.findFirst({
    where: (table, operators) =>
      operators.and(
        operators.eq(table.id, guideId),
        operators.eq(table.userId, userId),
      ),
  });

  if (!guideRow) {
    return null;
  }

  const [profileRow, sourceRows, htmlMap] = await Promise.all([
    db.query.guideProfiles.findFirst({
      where: (table, operators) => operators.eq(table.guideId, guideRow.id),
    }),
    db.query.sourceItems.findMany({
      where: (table, operators) => operators.eq(table.guideId, guideRow.id),
      orderBy: (table, operators) => [operators.asc(table.createdAt)],
    }),
    getCurrentHtmlMap([guideRow.id]),
  ]);

  return normalizeGuideRecord({
    id: guideRow.id,
    title: guideRow.title,
    status: guideRow.status,
    createdAt: toIsoString(guideRow.createdAt),
    updatedAt: toIsoString(guideRow.updatedAt),
    profile: {
      targetAudience: profileRow?.targetAudience ?? "",
      goal: profileRow?.goal ?? "",
      depth: profileRow?.depth ?? "",
      tone: profileRow?.tone ?? "",
      structureStyle: profileRow?.structureStyle ?? "",
      readerLevel: profileRow?.readerLevel ?? "",
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
  const draft = createGuideRecord(input);

  const createdGuide = await db.transaction(async (tx) => {
    const [guideRow] = await tx
      .insert(guides)
      .values({
        userId,
        title: draft.title,
        status: draft.status,
        createdAt: new Date(draft.createdAt),
        updatedAt: new Date(draft.updatedAt),
      })
      .returning({ id: guides.id });

    await tx.insert(guideProfiles).values({
      guideId: guideRow.id,
      targetAudience: draft.profile.targetAudience,
      goal: draft.profile.goal,
      depth: draft.profile.depth,
      tone: draft.profile.tone,
      structureStyle: draft.profile.structureStyle,
      readerLevel: draft.profile.readerLevel,
      createdAt: new Date(draft.createdAt),
      updatedAt: new Date(draft.updatedAt),
    });

    if (draft.sources.length > 0) {
      await tx.insert(sourceItems).values(
        draft.sources.map((source) => ({
          guideId: guideRow.id,
          sourceType: source.kind,
          originalFilename: source.name,
          rawText: source.content,
          normalizedText: source.excerpt || source.content.slice(0, 180),
        })),
      );
    }

    return guideRow;
  });

  return getGuideRecordForUser(userId, createdGuide.id);
}

async function getNextVersionNumber(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  guideId: string,
) {
  const [result] = await tx
    .select({
      count: sql<number>`coalesce(max(${htmlVersions.versionNumber}), 0)`,
    })
    .from(htmlVersions)
    .where(eq(htmlVersions.guideId, guideId));

  return (result?.count ?? 0) + 1;
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
  const current = await getGuideRecordForUser(userId, guideId);
  const guideRow = await db.query.guides.findFirst({
    where: (table, operators) =>
      operators.and(
        operators.eq(table.id, guideId),
        operators.eq(table.userId, userId),
      ),
  });

  if (!current || !guideRow) {
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

  await db.transaction(async (tx) => {
    let currentHtmlVersionId: string | null = null;

    if (nextGuide.html !== current.html) {
      const versionNumber = await getNextVersionNumber(tx, guideId);
      const [version] = await tx
        .insert(htmlVersions)
        .values({
          guideId,
          html: nextGuide.html,
          versionNumber,
        })
        .returning({ id: htmlVersions.id });

      currentHtmlVersionId = version.id;
    }

    await tx
      .update(guides)
      .set({
        title: nextGuide.title,
        status: nextGuide.status,
        updatedAt: new Date(nextGuide.updatedAt),
        currentHtmlVersionId:
          currentHtmlVersionId ?? guideRow.currentHtmlVersionId ?? null,
      })
      .where(and(eq(guides.id, guideId), eq(guides.userId, userId)));
  });

  return getGuideRecordForUser(userId, guideId);
}

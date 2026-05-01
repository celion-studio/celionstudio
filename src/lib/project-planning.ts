import type {
  ProjectProfile,
  ProjectRecord,
  ProjectSource,
  ProjectKind,
} from "@/types/project";

function idPart() {
  return crypto.randomUUID().slice(0, 8);
}

function toSlug(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function createProjectRecord(args: {
  title: string;
  kind?: ProjectKind;
  profile: ProjectProfile;
  sources: ProjectSource[];
}) {
  const title = args.title.trim();
  const now = new Date().toISOString();
  const id = `${toSlug(title)}-${idPart()}`;

  return {
    id,
    kind: args.kind ?? "product",
    title,
    status: "draft",
    createdAt: now,
    updatedAt: now,
    sources: args.sources,
    profile: args.profile,
  } as ProjectRecord;
}

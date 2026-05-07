import type { ProjectRecord } from "@/types/project";

export async function createDraftProject() {
  const response = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Untitled project",
      profile: {},
      sources: [],
    }),
  });
  const payload = (await response.json().catch(() => null)) as
    | { project?: ProjectRecord; message?: string }
    | null;

  if (!response.ok || !payload?.project) {
    throw new Error(payload?.message ?? "Could not create a project.");
  }

  return payload.project;
}

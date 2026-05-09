import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { getPageSession } from "@/lib/session";
import { getProjectRecordForUser } from "@/lib/projects";
import { buildAuthHref } from "@/lib/auth-redirect";
import { EditorShell } from "@/components/editor/EditorShell";

export const dynamic = "force-dynamic";

export default async function EditorPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const session = await getPageSession();
  if (!session?.user?.id) redirect(buildAuthHref("sign-in", `/editor/${projectId}`) as Route);

  const project = await getProjectRecordForUser(session.user.id, projectId);
  if (!project) notFound();

  return (
    <EditorShell
      projectId={project.id}
      projectTitle={project.title}
      projectStatus={project.status}
      initialHtml={project.profile.ebookHtml ?? ""}
      initialDocument={project.profile.ebookDocument}
    />
  );
}

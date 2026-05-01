import { notFound, redirect } from "next/navigation";
import { getPageSession } from "@/lib/session";
import { getProjectRecordForUser } from "@/lib/projects";
import { EditorShell } from "@/components/editor/EditorShell";

export const dynamic = "force-dynamic";

export default async function EditorPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await getPageSession();
  if (!session?.user?.id) redirect("/");

  const { projectId } = await params;
  const project = await getProjectRecordForUser(session.user.id, projectId);
  if (!project) notFound();

  return (
    <EditorShell
      projectId={project.id}
      projectTitle={project.title}
      initialHtml={project.profile.ebookHtml ?? ""}
      initialDocument={project.profile.ebookDocument}
    />
  );
}

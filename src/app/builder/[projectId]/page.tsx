import { notFound, redirect } from "next/navigation";
import { getPageSession } from "@/lib/session";
import { getProjectRecordForUser } from "@/lib/projects";
import { BuilderShell } from "@/components/builder/BuilderShell";

export const dynamic = "force-dynamic";

export default async function BuilderPage({
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
    <BuilderShell
      projectId={project.id}
      projectTitle={project.title}
      initialHtml={project.profile.ebookHtml ?? ""}
    />
  );
}

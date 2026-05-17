import { notFound, redirect } from "next/navigation";
import { getPageSession } from "@/lib/session";
import { getProjectRecordForUser } from "@/lib/projects";
import { EditorShell } from "@/components/editor/EditorShell";
import { NEON_AUTH_VERIFIER_PARAM } from "@/lib/auth-redirect";

export const dynamic = "force-dynamic";

export default async function EditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { projectId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const session = await getPageSession();

  const isOAuthCallback = typeof resolvedSearchParams[NEON_AUTH_VERIFIER_PARAM] === "string";
  if (!session?.user?.id && !isOAuthCallback) {
    redirect("/");
  }

  // OAuth callback with session still settling — let the client-side
  // OAuthCallbackHandler consume the verifier instead of dropping it
  // server-side. The verifier must remain in the URL for the client SDK.

  // Session is guaranteed non-null here — both redirect paths above handle the null cases.
  const project = await getProjectRecordForUser(session!.user.id, projectId);
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

import { redirect } from "next/navigation";
import type { Route } from "next";

export const dynamic = "force-dynamic";

export default async function LegacyEditorRedirect({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  redirect(`/editor/${projectId}` as Route);
}

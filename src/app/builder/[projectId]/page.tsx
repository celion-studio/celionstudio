import { BuilderShell } from "@/components/builder/BuilderShell";

export default async function BuilderPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return <BuilderShell projectId={projectId} />;
}


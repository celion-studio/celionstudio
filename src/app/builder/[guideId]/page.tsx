import { BuilderShell } from "@/components/builder/BuilderShell";

export default async function BuilderPage({
  params,
}: {
  params: Promise<{ guideId: string }>;
}) {
  const { guideId } = await params;

  return <BuilderShell guideId={guideId} />;
}

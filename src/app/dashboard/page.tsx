import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getServerSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession();

  return (
    <DashboardShell
      isSignedIn={Boolean(session?.user)}
      initialUserName={session?.user?.name ?? null}
      initialUserEmail={session?.user?.email ?? null}
    />
  );
}

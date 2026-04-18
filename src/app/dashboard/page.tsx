import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getServerSession } from "@/lib/session";

export default async function DashboardPage() {
  const session = await getServerSession();

  return (
    <DashboardShell
      isSignedIn={Boolean(session?.user)}
      sessionLabel={session?.user ? `Signed in as ${session.user.name ?? session.user.email}` : null}
    />
  );
}

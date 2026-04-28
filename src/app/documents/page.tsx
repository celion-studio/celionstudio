import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getPageSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const session = await getPageSession();

  return (
    <DashboardShell
      isSignedIn={Boolean(session?.user)}
      initialUserName={session?.user?.name ?? null}
      initialUserEmail={session?.user?.email ?? null}
      activeItem="documents"
      surface="documents"
    />
  );
}

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { isDatabaseUnavailableError } from "@/lib/db";
import { getSafeAuthNext, NEON_AUTH_VERIFIER_PARAM } from "@/lib/auth-redirect";
import {
  listDeletedProjectSummariesForUser,
  listProjectSummariesForUser,
  type ProjectSummary,
} from "@/lib/projects";
import { getPageSession } from "@/lib/session";
import type { SidebarItemKey } from "@/components/dashboard/WorkspaceSidebar";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getDashboardView(
  searchParams: Record<string, string | string[] | undefined>,
): SidebarItemKey {
  const view = searchParams.view;
  if (view === "home" || view === "projects" || view === "trash" || view === "settings") return view;
  return "projects";
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const view = getDashboardView(resolvedSearchParams);
  const initialBillingOpen = resolvedSearchParams.view === "billing";
  const session = await getPageSession();
  let initialProjects: ProjectSummary[] = [];
  let initialProjectsError = "";

  if (!session?.user?.id) {
    redirect("/");
  }

  const authNext = getSafeAuthNext(
    typeof resolvedSearchParams.next === "string" ? resolvedSearchParams.next : null,
    "",
  );
  if (authNext && authNext !== "/dashboard") {
    redirect(authNext as Route);
  }

  if (!initialBillingOpen) {
    try {
      if (view === "home" || view === "projects") {
        initialProjects = await listProjectSummariesForUser(session.user.id);
      } else if (view === "trash") {
        initialProjects = await listDeletedProjectSummariesForUser(session.user.id);
      }
    } catch (error) {
      if (!isDatabaseUnavailableError(error)) {
        throw error;
      }

      initialProjectsError = "Database is temporarily unavailable. Please retry in a moment.";
    }
  }

  return (
    <DashboardShell
      isSignedIn={Boolean(session?.user)}
      initialUserName={session?.user?.name ?? null}
      initialUserEmail={session?.user?.email ?? null}
      initialProjects={initialProjects}
      initialProjectsError={initialProjectsError}
      activeItem={view}
      initialBillingOpen={initialBillingOpen}
    />
  );
}

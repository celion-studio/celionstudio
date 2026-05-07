import { NewProjectLauncher } from "@/components/dashboard/NewProjectLauncher";
import { WorkspaceLayout } from "@/components/dashboard/WorkspaceLayout";
import { CelionButtonLink } from "@/components/ui/celion-controls";
import { getPageSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const session = await getPageSession();
  const isSignedIn = Boolean(session?.user);

  return (
    <WorkspaceLayout
      activeItem="new"
      isSignedIn={isSignedIn}
      initialUserName={session?.user?.name ?? null}
      initialUserEmail={session?.user?.email ?? null}
      breadcrumbCurrent="New project"
    >
      <div style={{ maxWidth: "56rem", width: "100%", margin: "0 auto" }}>
        {isSignedIn ? (
          <NewProjectLauncher />
        ) : (
          <section
            style={{
              border: "1px dashed #DEDAD3",
              borderRadius: "6px",
              background: "#f8f7f4",
              padding: "56px 32px",
              textAlign: "center",
            }}
          >
            <h2
              style={{
                margin: "0 0 10px",
                fontFamily: "'Geist', sans-serif",
                fontSize: "18px",
                fontWeight: 600,
                letterSpacing: "-0.03em",
                color: "#111",
              }}
            >
              Sign in to create a project
            </h2>
            <p
              style={{
                margin: "0 auto 22px",
                maxWidth: "360px",
                fontSize: "13.5px",
                lineHeight: 1.6,
                color: "#71717A",
              }}
            >
              Celion saves projects to your workspace, so the setup starts after your account is ready.
            </p>
            <CelionButtonLink
              href="/"
              variant="primary"
              style={{ minHeight: "38px", padding: "0 18px" }}
            >
              Return to sign in
            </CelionButtonLink>
          </section>
        )}
      </div>
    </WorkspaceLayout>
  );
}

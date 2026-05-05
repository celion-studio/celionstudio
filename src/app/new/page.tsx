import Link from "next/link";
import { WorkspaceLayout } from "@/components/dashboard/WorkspaceLayout";
import { WizardContent } from "@/components/wizard/WizardContent";
import { getPageSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NewEbookPage() {
  const session = await getPageSession();
  const isSignedIn = Boolean(session?.user);

  return (
    <WorkspaceLayout
      activeItem="new"
      isSignedIn={isSignedIn}
      initialUserName={session?.user?.name ?? null}
      initialUserEmail={session?.user?.email ?? null}
      breadcrumbCurrent="Brief"
    >
      <div style={{ maxWidth: "56rem", width: "100%", margin: "0 auto" }}>
        {isSignedIn ? (
          <WizardContent isSignedIn={isSignedIn} />
        ) : (
          <section
            style={{
              border: "1px dashed #DEDAD3",
              borderRadius: "4px",
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
              Sign in to create an ebook
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
              Celion saves drafts to your workspace, so the wizard starts after your account is ready.
            </p>
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "38px",
                padding: "0 18px",
                background: "#111",
                color: "#fff",
                borderRadius: "4px",
                textDecorationLine: "none",
                fontSize: "13px",
                fontWeight: 500,
                fontFamily: "'Geist', sans-serif",
              }}
            >
              Return to sign in
            </Link>
          </section>
        )}
      </div>
    </WorkspaceLayout>
  );
}

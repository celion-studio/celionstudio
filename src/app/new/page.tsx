import Link from "next/link";
import { WorkspaceSidebar } from "@/components/dashboard/WorkspaceSidebar";
import { WizardContent } from "@/components/wizard/WizardContent";
import { getPageSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NewEbookPage() {
  const session = await getPageSession();
  const isSignedIn = Boolean(session?.user);

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#F7F6F3",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <WorkspaceSidebar
        activeItem="new"
        isSignedIn={isSignedIn}
        initialUserName={session?.user?.name ?? null}
        initialUserEmail={session?.user?.email ?? null}
      />

      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            height: "57px",
            background: "#fff",
            borderBottom: "1px solid #ECEAE5",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            padding: "0 40px",
          }}
        >
          <span
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "#111",
              fontFamily: "'Geist', sans-serif",
            }}
          >
            New ebook
          </span>
        </header>

        <div
          style={{
            padding: "48px 56px 64px",
            maxWidth: "56rem",
            width: "100%",
            margin: "0 auto",
          }}
        >
          {isSignedIn ? (
            <WizardContent isSignedIn={isSignedIn} />
          ) : (
            <section
              style={{
                border: "1px dashed #DEDAD3",
                borderRadius: "12px",
                background: "#fff",
                padding: "56px 32px",
                textAlign: "center",
              }}
            >
              <h1
                style={{
                  margin: "0 0 10px",
                  fontFamily: "'Geist', sans-serif",
                  fontSize: "22px",
                  fontWeight: 600,
                  letterSpacing: "-0.03em",
                  color: "#111",
                }}
              >
                Sign in to create an ebook
              </h1>
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
                  borderRadius: "8px",
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
      </main>
    </div>
  );
}

import { WorkspaceSidebar } from "@/components/dashboard/WorkspaceSidebar";
import { WizardContent } from "@/components/wizard/WizardContent";
import { getPageSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NewEbookPage() {
  const session = await getPageSession();

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
        isSignedIn={Boolean(session?.user)}
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
          <WizardContent />
        </div>
      </main>
    </div>
  );
}

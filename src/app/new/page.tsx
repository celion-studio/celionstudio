import { WizardContent } from "@/components/wizard/WizardContent";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default function NewEbookPage() {
  return (
    <div style={{ display: "flex", height: "100vh", background: "#F7F6F3", fontFamily: "'Inter', sans-serif" }}>
      {/* Minimal sidebar strip */}
      <aside style={{ width: "220px", flexShrink: 0, background: "#fff", borderRight: "1px solid #ECEAE5", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #ECEAE5" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
            <div style={{ width: "30px", height: "30px", background: "#111", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 4v16M4 12h16M6.34 6.34l11.32 11.32M6.34 17.66l11.32-11.32"/>
              </svg>
            </div>
            <span style={{ fontFamily: "'Geist', sans-serif", fontSize: "15px", fontWeight: 600, color: "#111", letterSpacing: "-0.02em" }}>celion</span>
          </Link>
        </div>

        <nav style={{ flex: 1, padding: "12px 10px" }}>
          <Link
            href="/dashboard"
            style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "8px", textDecoration: "none", fontSize: "13.5px", color: "#71717A" }}
          >
            <ArrowLeft size={15} strokeWidth={1.8} />
            Back to workspace
          </Link>

          <div style={{ marginTop: "16px", padding: "8px 10px", borderRadius: "8px", background: "#F0EEE9" }}>
            <p style={{ margin: 0, fontSize: "11px", fontFamily: "'Geist', sans-serif", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.1em", color: "#A1A1AA" }}>Creating</p>
            <p style={{ margin: "4px 0 0", fontSize: "13.5px", fontWeight: 500, color: "#111" }}>New ebook</p>
          </div>
        </nav>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* Top bar */}
        <header style={{ height: "57px", background: "#fff", borderBottom: "1px solid #ECEAE5", flexShrink: 0, display: "flex", alignItems: "center", padding: "0 40px" }}>
          <span style={{ fontSize: "13px", fontWeight: 500, color: "#111", fontFamily: "'Geist', sans-serif" }}>New ebook</span>
        </header>

        {/* Wizard area */}
        <div style={{ flex: 1, overflow: "auto", padding: "48px 56px 64px", maxWidth: "1240px", width: "100%", margin: "0 auto" }}>
          <WizardContent />
        </div>
      </main>
    </div>
  );
}

"use client";

import { BookOpen, LogOut, Settings } from "lucide-react";
import { signOut } from "@/app/auth/actions";

type SettingsPanelProps = {
  userEmail: string | null;
  userName: string | null;
};

export function SettingsPanel({ userEmail, userName }: SettingsPanelProps) {
  return (
    <div className="dashboard-section-stack">
      <section className="dashboard-section">
        <div className="dashboard-section-icon">
          <Settings size={15} strokeWidth={1.8} />
        </div>
        <div>
          <h2>Account</h2>
          <div className="dashboard-field-list">
            <div className="dashboard-field-row">
              <span className="dashboard-field-label">Name</span>
              <span className="dashboard-field-value">{userName ?? "Not set"}</span>
            </div>
            <div className="dashboard-field-row">
              <span className="dashboard-field-label">Email</span>
              <span className="dashboard-field-value">{userEmail ?? "Not available"}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section-icon">
          <BookOpen size={15} strokeWidth={1.8} />
        </div>
        <div>
          <h2>Workspace defaults</h2>
          <p className="dashboard-muted-note">
            Default ebook style, brand kit, and export preferences can live here as the product grows.
          </p>
        </div>
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section-icon">
          <LogOut size={15} strokeWidth={1.8} />
        </div>
        <div>
          <h2>Sign out</h2>
          <p className="dashboard-muted-note">
            Sign out of your Celion account.
          </p>
          <form action={signOut}>
            <button type="submit" className="btn btn-light" style={{ marginTop: "12px" }}>
              Sign out
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

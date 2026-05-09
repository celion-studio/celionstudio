"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { buildDashboardCallbackUrl } from "@/lib/auth-redirect";
import { authClient } from "@/lib/auth-client";

type AuthMode = "sign-in" | "sign-up";

type AuthPageProps = {
  initialMode: AuthMode;
  initialNext: string;
};

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function AuthPage({ initialMode, initialNext }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"google" | "email" | null>(null);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const isSignUp = mode === "sign-up";
  const canSubmit = Boolean(
    email.trim() &&
    password.trim() &&
    (!isSignUp || name.trim()) &&
    loading === null,
  );

  function switchMode(next: AuthMode) {
    setMode(next);
    setMessage("");
    setIsSuccess(false);
  }

  async function handleEmailAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setLoading("email");
    setMessage("");
    setIsSuccess(false);

    try {
      if (isSignUp) {
        const result = await authClient.signUp.email({
          name: name.trim(),
          email,
          password,
        });
        if (result?.error) {
          setMessage(result.error.message ?? "Sign up failed.");
          return;
        }
        setMessage("Account created. Opening your workspace...");
      } else {
        const result = await authClient.signIn.email({ email, password });
        if (result?.error) {
          setMessage(result.error.message ?? "Invalid email or password.");
          return;
        }
        setMessage("Signed in. Opening your workspace...");
      }

      setIsSuccess(true);
      window.location.replace(initialNext);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setLoading(null);
    }
  }

  async function handleGoogle() {
    setLoading("google");
    setMessage("");
    setIsSuccess(false);

    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: buildDashboardCallbackUrl(initialNext),
      });
      if (result?.error) {
        setMessage(result.error.message ?? "Google sign-in failed.");
        setLoading(null);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Google sign-in failed.");
      setLoading(null);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-frame" aria-label="Celion account">
        <aside className="auth-image-panel" aria-label="Product image">
          <div className="auth-image-slot" aria-hidden="true" />
        </aside>

        <div className="auth-form-panel">
          <div className="auth-form-top">
            <Link href="/" className="auth-brand" aria-label="Celion home">
              <span className="auth-brand-mark">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 4v16M4 12h16M6.34 6.34l11.32 11.32M6.34 17.66l11.32-11.32" />
                </svg>
              </span>
              <span>celion</span>
            </Link>
            <Link href="/" className="auth-home-link">
              Back to home
            </Link>
          </div>

          <div className="auth-copy">
            <h1>
              {isSignUp ? "Create your account" : "Welcome back"}
            </h1>
            <p>
              {isSignUp
                ? "Start making editable ebooks with Celion."
                : "Sign in to continue to your workspace."}
            </p>
          </div>

          <div className="auth-mode-switch" aria-label="Authentication mode">
            <button
              type="button"
              aria-pressed={isSignUp}
              onClick={() => switchMode("sign-up")}
              data-active={isSignUp ? "true" : "false"}
            >
              Sign up
            </button>
            <button
              type="button"
              aria-pressed={!isSignUp}
              onClick={() => switchMode("sign-in")}
              data-active={!isSignUp ? "true" : "false"}
            >
              Sign in
            </button>
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading !== null}
            className="auth-google-button"
          >
            <GoogleIcon />
            {loading === "google" ? "Redirecting..." : "Continue with Google"}
          </button>

          <div className="auth-divider">
            <span />
            <p>or</p>
            <span />
          </div>

          <form className="auth-form" onSubmit={handleEmailAuth}>
            {isSignUp ? (
              <label>
                <span>Name</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  placeholder="Jane Doe"
                  required
                />
              </label>
            ) : null}

            <label>
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </label>

            <label>
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                placeholder="Enter your password"
                required
              />
            </label>

            <button type="submit" disabled={!canSubmit} className="auth-submit-button">
              {loading === "email"
                ? "Working..."
                : isSignUp
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>

          <p
            className="auth-message"
            aria-live="polite"
            data-success={isSuccess ? "true" : "false"}
            data-visible={message ? "true" : "false"}
          >
            {message || "Your workspace is saved to your account."}
          </p>
        </div>
      </section>
    </main>
  );
}

"use client";

import { useActionState, useCallback } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { getSafeAuthNext } from "@/lib/auth-redirect";
import { signIn, signUp, type AuthActionResult } from "./actions";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function Divider() {
  return <div className="auth-divider" role="separator" aria-orientation="horizontal" />;
}

type AuthFormProps = {
  mode: "sign-in" | "sign-up";
  next: string;
};

function AuthFormInner({
  mode,
  action,
  state,
  isPending,
  next,
  onGoogleSignIn,
  googleBusy,
}: {
  mode: "sign-in" | "sign-up";
  action: (payload: FormData) => void;
  state: AuthActionResult;
  isPending: boolean;
  next: string;
  onGoogleSignIn: () => void;
  googleBusy: boolean;
}) {
  const isSignIn = mode === "sign-in";
  const toggleMode = isSignIn ? "sign-up" : "sign-in";
  const toggleLabel = isSignIn ? "Create an account" : "Already have an account?";
  const heading = isSignIn ? "Sign in" : "Create an account";
  const submitLabel = isSignIn ? "Sign in" : "Create account";

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <Link href="/" className="auth-logo">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 4v16M4 12h16M6.34 6.34l11.32 11.32M6.34 17.66l11.32-11.32" />
            </svg>
            <span>celion</span>
          </Link>
          <h1 className="auth-heading">{heading}</h1>
        </div>

        <button
          type="button"
          onClick={onGoogleSignIn}
          disabled={googleBusy}
          className="auth-oauth-btn"
        >
          <GoogleIcon />
          {googleBusy ? "Redirecting…" : `Continue with Google`}
        </button>

        <Divider />

        <form action={action} className="auth-form">
          <input type="hidden" name="next" value={next} />

          {!isSignIn && (
            <div className="auth-field">
              <label htmlFor="name" className="auth-label">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                autoComplete="name"
                placeholder="Your name"
                className="auth-input"
              />
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="email" className="auth-label">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete={isSignIn ? "email" : "username"}
              placeholder="you@example.com"
              className="auth-input"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password" className="auth-label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete={isSignIn ? "current-password" : "new-password"}
              placeholder="••••••••"
              className="auth-input"
            />
          </div>

          {state?.error && (
            <div className="auth-error" role="alert">
              {state.error}
            </div>
          )}

          <button type="submit" disabled={isPending} className="auth-submit">
            {isPending ? (
              <span className="auth-spinner" aria-hidden="true" />
            ) : null}
            {isPending ? "Please wait…" : submitLabel}
          </button>
        </form>

        <p className="auth-toggle">
          {isSignIn ? "Don't have an account?" : "Already have an account?"}{" "}
          <Link
            href={`/auth?mode=${toggleMode}${next ? `&next=${encodeURIComponent(next)}` : ""}`}
            className="auth-toggle-link"
          >
            {toggleLabel}
          </Link>
        </p>
      </div>
    </div>
  );
}

export function AuthForm({ mode, next }: AuthFormProps) {
  const [signInState, signInAction, signInPending] = useActionState<
    AuthActionResult,
    FormData
  >(signIn, null);
  const [signUpState, signUpAction, signUpPending] = useActionState<
    AuthActionResult,
    FormData
  >(signUp, null);

  const isSignIn = mode === "sign-in";
  const state = isSignIn ? signInState : signUpState;
  const formAction = isSignIn ? signInAction : signUpAction;
  const isPending = isSignIn ? signInPending : signUpPending;

  const handleGoogleSignIn = useCallback(() => {
    const callbackURL = getSafeAuthNext(next);
    authClient.signIn.social({
      provider: "google",
      callbackURL,
    });
  }, [next]);

  return (
    <AuthFormInner
      mode={mode}
      action={formAction}
      state={state}
      isPending={isPending}
      next={next}
      onGoogleSignIn={handleGoogleSignIn}
      googleBusy={false}
    />
  );
}

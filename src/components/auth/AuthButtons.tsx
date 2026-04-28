"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function AuthButtons() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-up");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"google" | "email" | null>(null);
  const [message, setMessage] = useState("");

  async function handleEmailAuth() {
    setLoading("email");
    setMessage("");

    try {
      if (mode === "sign-up") {
        const result = await authClient.signUp.email({
          name: name.trim() || "Celion User",
          email,
          password,
        });
        if (result?.error) {
          setMessage(result.error.message ?? "Sign up failed.");
          return;
        }
        setMessage("Account created. Redirecting...");
      } else {
        const result = await authClient.signIn.email({ email, password });
        if (result?.error) {
          setMessage(result.error.message ?? "Invalid email or password.");
          return;
        }
        setMessage("Signed in successfully.");
      }

      window.location.assign("/dashboard");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Authentication request failed.",
      );
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mx-auto mt-8 max-w-[560px] rounded-[28px] border border-black/[0.07] bg-white p-5 text-left shadow-[0_18px_50px_rgba(0,0,0,0.06)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#71717a]">
            Account
          </p>
          <h2 className="mt-2 text-[20px] font-semibold tracking-[-0.02em] text-[#1F1F1F]">
            Sign in before your work moves to the cloud
          </h2>
        </div>
        <div className="flex rounded-full border border-black/[0.08] bg-[#f1f2f4] p-1">
          <button
            type="button"
            onClick={() => setMode("sign-up")}
            className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition ${
              mode === "sign-up" ? "bg-[#1F1F1F] text-white" : "text-[#71717a]"
            }`}
          >
            Sign up
          </button>
          <button
            type="button"
            onClick={() => setMode("sign-in")}
            className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition ${
              mode === "sign-in" ? "bg-[#1F1F1F] text-white" : "text-[#71717a]"
            }`}
          >
            Sign in
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {mode === "sign-up" ? (
          <label className="sm:col-span-2">
            <span className="mb-2 block text-[12px] font-medium text-[#1F1F1F]">
              Name
            </span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              className="w-full rounded-2xl border border-black/[0.08] bg-[#f1f2f4] px-4 py-3 text-sm text-[#1F1F1F] outline-none"
            />
          </label>
        ) : null}

        <label>
          <span className="mb-2 block text-[12px] font-medium text-[#1F1F1F]">
            Email
          </span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-2xl border border-black/[0.08] bg-[#f1f2f4] px-4 py-3 text-sm text-[#1F1F1F] outline-none"
          />
        </label>

        <label>
          <span className="mb-2 block text-[12px] font-medium text-[#1F1F1F]">
            Password
          </span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            className="w-full rounded-2xl border border-black/[0.08] bg-[#f1f2f4] px-4 py-3 text-sm text-[#1F1F1F] outline-none"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleEmailAuth}
          disabled={
            !email || !password || (mode === "sign-up" && !name) || loading !== null
          }
          className="rounded-xl bg-[#1F1F1F] px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading === "email"
            ? "Working..."
            : mode === "sign-up"
              ? "Create account"
              : "Sign in with email"}
        </button>

        <button
          type="button"
          onClick={async () => {
            setLoading("google");
            setMessage("");
            try {
              await authClient.signIn.social({
                provider: "google",
                callbackURL: "/dashboard",
              });
            } catch (error) {
              setMessage(
                error instanceof Error ? error.message : "Google sign-in failed.",
              );
              setLoading(null);
            }
          }}
          disabled={loading !== null}
          className="rounded-xl border border-black/[0.08] bg-white px-5 py-3 text-sm font-medium text-[#1F1F1F] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading === "google" ? "Redirecting..." : "Continue with Google"}
        </button>
      </div>

      <p className="mt-3 text-[12px] leading-6 text-[#71717a]">
        Use Google for the fastest setup, or create an email/password account for
        local development.
      </p>

      {message ? (
        <p className="mt-4 rounded-2xl bg-[#eef0f3] px-4 py-3 text-sm leading-6 text-[#1F1F1F]">
          {message}
        </p>
      ) : null}
    </div>
  );
}

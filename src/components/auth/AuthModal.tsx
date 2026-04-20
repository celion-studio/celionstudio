"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { authClient } from "@/lib/auth-client";

type Props = {
  onClose: () => void;
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

export function AuthModal({ onClose }: Props) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"google" | "email" | null>(null);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  function switchMode(next: "sign-in" | "sign-up") {
    setMode(next);
    setMessage("");
    setIsSuccess(false);
  }

  async function handleEmailAuth() {
    setLoading("email");
    setMessage("");
    setIsSuccess(false);

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
        setMessage("Signed in. Redirecting...");
      }

      setIsSuccess(true);
      window.location.assign("/dashboard");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Authentication failed.",
      );
    } finally {
      setLoading(null);
    }
  }

  async function handleGoogle() {
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
  }

  const canSubmit =
    email.trim() &&
    password.trim() &&
    (mode === "sign-in" || name.trim()) &&
    loading === null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(20,19,17,0.55)" }}
      onClick={onClose}
    >
      <div
        className="absolute inset-0"
        style={{
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={mode === "sign-in" ? "Sign in" : "Create account"}
        className="relative w-full max-w-[400px] animate-in fade-in zoom-in-95 duration-200"
        style={{ perspective: 800 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="rounded-[28px] p-8"
          style={{
            background: "rgba(255,255,255,0.82)",
            backdropFilter: "blur(28px) saturate(180%)",
            WebkitBackdropFilter: "blur(28px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.7)",
            boxShadow:
              "0 40px 100px rgba(0,0,0,0.16), 0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full border border-black/[0.07] bg-white/80 text-[#71717a] transition hover:bg-white hover:text-[#1F1F1F]"
          >
            <X className="size-[15px]" />
          </button>

          <div className="mb-6 flex h-9 w-9 items-center justify-center rounded-xl bg-[#1F1F1F]">
            <span className="font-mono text-[12px] font-bold text-white">C</span>
          </div>

          <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.025em] text-[#1F1F1F]">
            {mode === "sign-in" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="mt-1.5 text-[13px] leading-[1.65] text-[#71717a]">
            {mode === "sign-in"
              ? "Sign in to access your ebook workspace."
              : "Start turning your knowledge into ebooks."}
          </p>

          <div className="mt-6 flex rounded-full border border-black/[0.06] bg-[#FAF9F5] p-[3px]">
            {(["sign-up", "sign-in"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => switchMode(value)}
                className={`flex-1 rounded-full py-[7px] text-[12px] font-medium transition-all duration-150 ${
                  mode === value
                    ? "bg-[#1F1F1F] text-white shadow-sm"
                    : "text-[#71717a] hover:text-[#1F1F1F]"
                }`}
              >
                {value === "sign-up" ? "Sign up" : "Sign in"}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading !== null}
            className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-2xl border border-black/[0.08] bg-white py-[11px] text-[14px] font-medium text-[#1F1F1F] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:bg-[#FAF9F5] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <GoogleIcon />
            {loading === "google" ? "Redirecting..." : "Continue with Google"}
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-black/[0.06]" />
            <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#a1a1aa]">
              or
            </span>
            <div className="h-px flex-1 bg-black/[0.06]" />
          </div>

          <div className="space-y-2.5">
            {mode === "sign-up" ? (
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Full name"
                autoComplete="name"
                className="w-full rounded-2xl border border-black/[0.08] bg-[#FAF9F5] px-4 py-[11px] text-[14px] text-[#1F1F1F] outline-none transition placeholder:text-[#a1a1aa] focus:border-[#C4622D]/50 focus:bg-white focus:ring-2 focus:ring-[#C4622D]/10"
              />
            ) : null}

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email address"
              autoComplete="email"
              className="w-full rounded-2xl border border-black/[0.08] bg-[#FAF9F5] px-4 py-[11px] text-[14px] text-[#1F1F1F] outline-none transition placeholder:text-[#a1a1aa] focus:border-[#C4622D]/50 focus:bg-white focus:ring-2 focus:ring-[#C4622D]/10"
            />

            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
              className="w-full rounded-2xl border border-black/[0.08] bg-[#FAF9F5] px-4 py-[11px] text-[14px] text-[#1F1F1F] outline-none transition placeholder:text-[#a1a1aa] focus:border-[#C4622D]/50 focus:bg-white focus:ring-2 focus:ring-[#C4622D]/10"
            />
          </div>

          <button
            type="button"
            onClick={handleEmailAuth}
            disabled={!canSubmit}
            className="mt-4 w-full rounded-2xl bg-[#1F1F1F] py-[11px] text-[14px] font-medium text-white transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading === "email"
              ? "Working..."
              : mode === "sign-up"
                ? "Create account"
                : "Sign in"}
          </button>

          {message ? (
            <p
              className={`mt-3 rounded-2xl px-4 py-3 text-[13px] leading-[1.6] ${
                isSuccess
                  ? "bg-[#F0FDF4] text-[#166534]"
                  : "bg-[#FFF1E6] text-[#9B4C19]"
              }`}
            >
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

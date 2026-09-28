"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { browserClient, configured } from "@/lib/supabase/browser";
export function AuthForm() {
  const params = useSearchParams();
  const mode = params.get("mode") ?? "login";
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const titles: Record<string, string> = {
    login: "Welcome back.",
    signup: "Your world starts here.",
    reset: "Let’s get you back in.",
    update: "Set your new password.",
  };
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const form = new FormData(e.currentTarget);
    try {
      const db = browserClient();
      const email = String(form.get("email") ?? ""),
        password = String(form.get("password") ?? "");
      let result;
      if (mode === "signup")
        result = await db.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: form.get("name") },
            emailRedirectTo: `${location.origin}/auth/callback`,
          },
        });
      else if (mode === "reset")
        result = await db.auth.resetPasswordForEmail(email, {
          redirectTo: `${location.origin}/auth/callback?next=/auth?mode=update`,
        });
      else if (mode === "update")
        result = await db.auth.updateUser({ password });
      else result = await db.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (mode === "reset")
        setMessage(
          "If an account exists for this email, you’ll receive a password reset link.",
        );
      else if (mode === "signup")
        setMessage("Check your email to confirm your account, then sign in.");
      else window.location.assign("/account");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container page-shell">
      <div className="auth-wrap">
        <p className="eyebrow blue">SKYVISTA ACCOUNT</p>
        <h1>{titles[mode] ?? titles.login}</h1>
        <p className="muted">
          Save your journeys. Keep every detail in one place.
        </p>
        <div className="panel">
          {!configured() && (
            <p className="notice">
              Account services are not connected yet. Flight search and journey
              planning are available.
            </p>
          )}
          <form onSubmit={submit}>
            {mode === "signup" && (
              <label className="field">
                Full name
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                />
              </label>
            )}
            {mode !== "update" && (
              <label className="field">
                Email address
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                />
              </label>
            )}
            {mode !== "reset" && (
              <label className="field">
                Password
                <input
                  name="password"
                  type="password"
                  minLength={8}
                  required
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                />
                <small className="muted">At least 8 characters.</small>
              </label>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {message && (
              <p className="success-message" role="status">
                {message}
              </p>
            )}
            <button className="btn full-width" disabled={busy || !configured()}>
              {busy
                ? "Please wait…"
                : mode === "signup"
                  ? "Create account"
                  : mode === "reset"
                    ? "Send reset link"
                    : mode === "update"
                      ? "Save new password"
                      : "Sign in"}
            </button>
          </form>
          <div className="auth-links">
            <Link
              href={mode === "login" ? "/auth?mode=signup" : "/auth?mode=login"}
            >
              {mode === "login" ? "Create an account" : "Back to sign in"}
            </Link>
            {mode === "login" && (
              <Link href="/auth?mode=reset">Forgot password?</Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

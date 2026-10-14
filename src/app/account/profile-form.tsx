"use client";
import { useState } from "react";
import Link from "next/link";
import { browserClient } from "@/lib/supabase/browser";
export function ProfileForm({
  name,
  phone,
  country,
  email,
}: {
  name: string;
  phone: string;
  country: string;
  email: string;
}) {
  const [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const form = new FormData(e.currentTarget);
    try {
      const db = browserClient();
      const {
        data: { user },
      } = await db.auth.getUser();
      if (!user) throw new Error("Sign in again to update your profile.");
      const { error } = await db
        .from("profiles")
        .update({
          full_name: String(form.get("name")).trim(),
          phone: String(form.get("phone")).trim(),
          country: String(form.get("country")).trim(),
        })
        .eq("id", user.id);
      if (error) throw error;
      setMessage("Your profile has been updated.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    try {
      const { error } = await browserClient().auth.signOut();
      if (error) throw error;
      window.location.assign("/");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <aside className="panel profile-card">
      <p className="eyebrow blue">PROFILE</p>
      <h2>Your details</h2>
      <p className="profile-email">{email}</p>
      <form onSubmit={save}>
        <label className="field">
          Full name
          <input
            name="name"
            defaultValue={name}
            required
            minLength={2}
            maxLength={100}
          />
        </label>
        <label className="field">
          Phone number
          <input name="phone" type="tel" defaultValue={phone} maxLength={25} />
        </label>
        <label className="field">
          Country of residence
          <input name="country" defaultValue={country} maxLength={100} />
        </label>
        <button className="btn full-width" disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </button>
      </form>
      {message && (
        <p role="status" className="success-message">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="account-security">
        <h3>Account &amp; security</h3>
        <Link href="/auth?mode=reset">Reset password</Link>
        <button className="text-button" style={{ padding: 0 }} onClick={logout}>
          Sign out
        </button>
      </div>
    </aside>
  );
}

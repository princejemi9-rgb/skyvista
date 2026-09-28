"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
export function VerifyPayment() {
  const params = useSearchParams(),
    ref = params.get("reference") ?? params.get("trxref");
  const [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    if (!ref) {
      setError(
        "No payment reference was provided. Open your booking to check its status.",
      );
      return;
    }
    setError("");
    fetch("/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference: ref }),
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        if (active) window.location.replace(`/bookings/${d.id}`);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [ref, attempt]);
  return (
    <div className="container page-shell">
      <div className="auth-wrap">
        <h1>
          {error ? "Let’s check your payment." : "Verifying your test payment…"}
        </h1>
        {error ? (
          <>
            <p role="alert" className="form-error">
              {error}
            </p>
            <div className="row">
              <button className="btn" onClick={() => setAttempt((n) => n + 1)}>
                Check again
              </button>
              <Link className="btn btn-outline" href="/account">
                Your bookings
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="loading-orbit" />
            <p className="muted">
              We’re confirming the transaction securely with Paystack. Please
              keep this page open.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

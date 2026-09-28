"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="container page-shell">
      <h1>Something interrupted your journey.</h1>
      <p>Please try again. Your completed bookings are safe in your account.</p>
      <button className="btn" onClick={reset}>
        Try again
      </button>
    </div>
  );
}

import { Suspense } from "react";
import { AuthForm } from "./auth-form";
export const metadata = { title: "Your SkyVista account" };
export default function Auth() {
  return (
    <Suspense fallback={<div className="page-shell container">Loading…</div>}>
      <AuthForm />
    </Suspense>
  );
}

import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/server";
import { AdminDashboard } from "./dashboard";
export const dynamic = "force-dynamic";
export default async function Admin() {
  try {
    await requireAdmin();
  } catch {
    return (
      <div className="container page-shell">
        <h1>Administrator access required.</h1>
        <p>Sign in with an account assigned the administrator role.</p>
        <Link className="btn" href="/auth?mode=login">
          Sign in
        </Link>
      </div>
    );
  }
  return <AdminDashboard />;
}

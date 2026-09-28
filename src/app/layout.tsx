import type { Metadata } from "next";
import { connection } from "next/server";
import { Header, Footer } from "@/components/site";
import { isConfigured, serverClient } from "@/lib/supabase/server";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "SkyVista — Fly Further. Live Bigger.",
    template: "%s | SkyVista",
  },
  description:
    "Discover your next destination with SkyVista. Beautiful journeys, transparent prices, and a thoughtful booking experience.",
};
export default async function Layout({ children }: { children: React.ReactNode }) {
  await connection();
  let account: { name: string; isAdmin: boolean } | undefined;
  if (isConfigured()) {
    const db = await serverClient();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (user) {
      const { data: profile } = await db
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .maybeSingle();
      account = {
        name: profile?.full_name?.split(" ")[0] || user.email?.split("@")[0] || "Account",
        isAdmin: profile?.role === "admin",
      };
    }
  }
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Header account={account} />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const db = await serverClient();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) {
      const next = url.searchParams.get("next");
      return NextResponse.redirect(
        new URL(
          next === "/auth?mode=update" ? next : "/account",
          process.env.APP_URL ?? url.origin,
        ),
      );
    }
  }
  return NextResponse.redirect(
    new URL("/auth?mode=login", process.env.APP_URL ?? url.origin),
  );
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, serviceClient } from "@/lib/supabase/server";
import { errorResponse } from "@/lib/server/http";

export async function GET(request: Request) {
  try {
    const { user } = await requireUser();
    const params = new URL(request.url).searchParams;
    const bookingId = z.uuid().parse(params.get("bookingId"));
    const walletId = z.uuid().parse(params.get("walletId"));
    const db = serviceClient();
    const [{ data: booking }, { data: wallet }, { data: method }] = await Promise.all([
      db.from("bookings").select("id").eq("id", bookingId).eq("user_id", user.id).single(),
      db.from("bitcoin_wallets").select("qr_path,enabled").eq("id", walletId).single(),
      db.from("payment_methods").select("enabled").eq("id", "bitcoin").single(),
    ]);
    if (!booking || !method?.enabled || !wallet?.enabled || !wallet.qr_path) throw new Error("QR code is unavailable.");
    const { data, error } = await db.storage.from("payment-qr").createSignedUrl(wallet.qr_path, 300);
    if (error) throw new Error("QR code is unavailable.");
    return NextResponse.json({ url: data.signedUrl });
  } catch (error) { return errorResponse(error); }
}

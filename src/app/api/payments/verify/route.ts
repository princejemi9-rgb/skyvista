import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { verifyTransaction } from "@/lib/server/paystack";
import { checkOrigin, errorResponse } from "@/lib/server/http";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { db, user } = await requireUser();
    const { reference } = z
      .object({ reference: z.string().max(64) })
      .parse(await request.json());
    const { data: t } = await db
      .from("transactions")
      .select("booking_id")
      .eq("reference", reference)
      .single();
    if (!t) throw new Error("Payment record not found.");
    const { data: b } = await db
      .from("bookings")
      .select("id")
      .eq("id", t.booking_id)
      .eq("user_id", user.id)
      .single();
    if (!b) throw new Error("Booking not found.");
    const id = await verifyTransaction(reference);
    return NextResponse.json({ id });
  } catch (e) {
    return errorResponse(e);
  }
}

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, serviceClient } from "@/lib/supabase/server";
import { paystack, paystackKey } from "@/lib/server/paystack";
import { checkOrigin, errorResponse } from "@/lib/server/http";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { db, user } = await requireUser();
    const { bookingId } = z
      .object({ bookingId: z.uuid() })
      .parse(await request.json());
    paystackKey();
    const { data: b } = await db
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .eq("user_id", user.id)
      .single();
    if (!b) throw new Error("Booking not found.");
    const {data:paystackMethod}=await db.from("payment_methods").select("enabled").eq("id","paystack").single();
    if(!paystackMethod?.enabled)throw new Error("Paystack checkout is currently unavailable.");
    if (b.status !== "pending")
      throw new Error("This booking does not need a payment.");
    if (
      b.flights.some(
        (f: { departure: string }) => Date.parse(f.departure) <= Date.now(),
      )
    )
      throw new Error(
        "This itinerary has expired. Please search for new flights.",
      );
    const origin = process.env.APP_URL;
    if (!origin) throw new Error("Checkout return URL is not configured.");
    const service = serviceClient(),
      reference = `SVT-${randomUUID()}`;
    const { data: t, error } = await service.rpc("claim_test_checkout", {
      p_booking: bookingId,
      p_reference: reference,
    });
    if (error || !t) throw new Error("Unable to start checkout.");
    if (t.authorization_url)
      return NextResponse.json({ url: t.authorization_url });
    if (t.reference !== reference)
      throw new Error(
        "Checkout is being prepared or needs reconciliation. Check payment status shortly; a second payment will not be created.",
      );
    try {
      const checkout = await paystack<{
        authorization_url: string;
        reference: string;
      }>("/transaction/initialize", {
        email: b.email,
        amount: String(b.total),
        currency: "NGN",
        reference,
        callback_url: `${origin}/payment/return`,
        metadata: { booking_id: b.id, simulation: true },
      });
      const checkoutUrl = new URL(checkout.authorization_url);
      if (
        checkoutUrl.protocol !== "https:" ||
        checkoutUrl.hostname !== "checkout.paystack.com"
      )
        throw new Error("Unexpected checkout destination.");
      const { error: saveError } = await service
        .from("transactions")
        .update({
          authorization_url: checkout.authorization_url,
          status: "pending",
        })
        .eq("id", t.id)
        .neq("status", "success");
      if (saveError) throw new Error("Checkout could not be saved.");
      return NextResponse.json({ url: checkout.authorization_url });
    } catch (e) {
      await service
        .from("transactions")
        .update({ status: "failed" })
        .eq("id", t.id)
        .neq("status", "success");
      throw e;
    }
  } catch (e) {
    return errorResponse(e);
  }
}

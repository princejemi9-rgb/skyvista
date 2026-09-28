import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { bookingSchema, validateBooking } from "@/lib/flights";
import { getContent, getProvider } from "@/lib/server/content";
import { requireUser, serviceClient } from "@/lib/supabase/server";
import { checkOrigin, errorResponse } from "@/lib/server/http";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { user } = await requireUser();
    const body = await request.json();
    const input = bookingSchema.parse(body);
    const expectedTotal = z
      .object({ expectedTotal: z.number().int().positive() })
      .parse(body).expectedTotal;
    const db = serviceClient();
    const { data: existing } = await db
      .from("bookings")
      .select("id")
      .eq("user_id", user.id)
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();
    if (existing) return NextResponse.json(existing);
    const content = await getContent();
    if (!content.settings.bookingEnabled)
      throw new Error(
        "Bookings are temporarily paused. Please try again later.",
      );
    const offer = input.promo
      ? content.offers.find((o) => o.active && o.code === input.promo)
      : null;
    if (input.promo && !offer)
      throw new Error("The offer has expired. Remove the code and try again.");
    const { data, flights, price } = await validateBooking(
      input,
      await getProvider(),
      offer?.discount ?? 0,
    );
    if (price.total !== expectedTotal)
      throw new Error(
        "The fare has changed. Please search again and review the updated price before booking.",
      );
    const result = await db
      .from("bookings")
      .insert({
        user_id: user.id,
        reference: `SV-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`,
        idempotency_key: data.idempotencyKey,
        total: price.total,
        price,
        flights,
        passengers: data.passengers,
        seats: data.seats,
        bags: data.bags,
        email: data.email,
        phone: data.phone,
        promo: data.promo,
      })
      .select("id")
      .single();
    if (result.error) {
      if (result.error.code === "23505") {
        const { data: again } = await db
          .from("bookings")
          .select("id")
          .eq("user_id", user.id)
          .eq("idempotency_key", input.idempotencyKey)
          .single();
        if (again) return NextResponse.json(again);
      }
      throw new Error("Your booking could not be saved. Please try again.");
    }
    return NextResponse.json(result.data);
  } catch (e) {
    return errorResponse(e);
  }
}

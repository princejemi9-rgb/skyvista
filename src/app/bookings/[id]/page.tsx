import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Check, Download } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import type { Booking, Transaction } from "@/lib/booking-types";
import { money } from "@/lib/flights";
import { Notice } from "@/components/site";
import { FlightCard } from "@/components/flight-card";
import { PaymentActions } from "./payment-actions";
export const dynamic = "force-dynamic";
export default async function BookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  let auth;
  try {
    auth = await requireUser();
  } catch {
    redirect("/auth?mode=login");
  }
  const { id } = await params;
  const { data } = await auth.db
    .from("bookings")
    .select("*")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .single();
  if (!data) notFound();
  const booking = data as Booking;
  const { data: transaction } = await auth.db
    .from("transactions")
    .select("*")
    .eq("booking_id", id)
    .maybeSingle();
  const [{ data: methods }, { data: accounts }, { data: crypto }, { data: wallets }] = await Promise.all([
    auth.db.from("payment_methods").select("id,display_name,instructions,display_order").eq("enabled", true).order("display_order"),
    auth.db.from("bank_accounts").select("id,bank_name,account_name,account_number,currency,instructions").eq("enabled", true).order("display_order"),
    auth.db.from("crypto_payment_settings").select("display_name,wallet_address,network,instructions").eq("id", "bitcoin").maybeSingle(),
    auth.db.from("bitcoin_wallets").select("id,display_name,wallet_address,network,instructions").eq("enabled", true).order("display_order"),
  ]);
  const confirmed = booking.status === "test_confirmed" || booking.payment_status === "paid";
  return (
    <div className="container page-shell">
      <div className="page-title">
        {confirmed && (
          <div className="confirm-icon">
            <Check size={30} />
          </div>
        )}
        <p className="eyebrow blue">
          {confirmed ? "TEST PAYMENT VERIFIED" : "YOUR SAVED JOURNEY"}
        </p>
        <h1>
          {confirmed
            ? "Your test booking is confirmed."
            : booking.status === "cancelled"
              ? "This booking was cancelled."
              : "One step closer to your next story."}
        </h1>
        <p>
          SkyVista booking reference: <strong>{booking.reference}</strong>
        </p>
      </div>
      <Notice>
        {confirmed
          ? "This is a test booking confirmation, not a valid airline ticket. No real money was charged, no seat was reserved, and no airline ticket was issued."
          : "This saved itinerary uses simulated inventory. The booking reference is for SkyVista only, not an airline confirmation number. Paystack checkout is in test mode."}
      </Notice>
      <div className="booking-layout">
        <div>
          {booking.flights.map((f) => (
            <FlightCard key={f.id} flight={f} />
          ))}
          <section className="panel">
            <h2>Traveller details</h2>
            {booking.passengers.map((p, i) => (
              <div className="summary-route" key={i}>
                <strong>
                  {p.firstName} {p.lastName}
                </strong>
                <p>
                  Seat{booking.flights.length > 1 ? "s" : ""}:{" "}
                  {booking.seats.map((s) => s[i]).join(", ")} ·{" "}
                  {booking.bags[i]} extra bag(s) per flight
                </p>
              </div>
            ))}
            <p className="muted">Contact: {booking.email}</p>
          </section>
          {confirmed && (
            <a className="btn" href={`/api/bookings/${booking.id}/pdf`}>
              <Download size={17} /> Download test confirmation PDF
            </a>
          )}
          <div style={{ marginTop: 20 }}>
            <Link className="text-link" href="/account">
              ← Back to your bookings
            </Link>
          </div>
        </div>
        <aside className="panel">
          <h2>Payment summary</h2>
          {[
            ["Flight fare", booking.price.fare],
            ["Taxes", booking.price.taxes],
            ["Seats", booking.price.seats],
            ["Extra baggage", booking.price.baggage],
            ["Savings", -booking.price.discount],
          ].map(([label, value]) => (
            <div className="summary-line" key={label}>
              <span>{label}</span>
              <span>{money(Number(value))}</span>
            </div>
          ))}
          <div className="summary-line total">
            <span>Total</span>
            <span>{money(booking.total)}</span>
          </div>
          <span className={`badge ${confirmed ? "green" : "amber"}`}>
            {confirmed
              ? "Verified · test mode"
              : booking.status === "cancelled"
                ? "Cancelled"
                : transaction?.status === "failed"
                  ? "Test payment incomplete"
                  : "Awaiting test payment"}
          </span>
          {booking.status === "pending" && (
            <PaymentActions
              bookingId={id}
              transaction={transaction as Transaction | null}
              methods={methods ?? []}
              accounts={accounts ?? []}
              crypto={crypto ?? null}
              wallets={wallets ?? []}
            />
          )}
        </aside>
      </div>
    </div>
  );
}

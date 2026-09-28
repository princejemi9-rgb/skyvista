import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, PlaneTakeoff, Ticket } from "lucide-react";
import { isConfigured, serverClient } from "@/lib/supabase/server";
import { money } from "@/lib/flights";
import type { Booking } from "@/lib/booking-types";
import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

export default async function Account() {
  if (!isConfigured()) return <div className="container page-shell"><h1>Your journeys, all together.</h1><p>Accounts are not connected yet. You can still explore flights and plan your journey.</p><Link className="btn" href="/flights">Explore flights</Link></div>;
  const db = await serverClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/auth?mode=login");
  const [{ data: profile }, { data: bookings, error }] = await Promise.all([
    db.from("profiles").select("*").eq("id", user.id).single(),
    db.from("bookings").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
  ]);
  if (error) throw new Error("Unable to load bookings.");
  const savedBookings = (bookings as Booking[]) ?? [];
  const firstName = profile?.full_name?.split(" ")[0] || user.email?.split("@")[0] || "there";
  return <div className="container page-shell account-dashboard">
    <div className="page-title account-hero"><p className="eyebrow blue">YOUR SKYVISTA</p><h1>Good to see you, {firstName}.</h1><p>Your next adventure is waiting.</p>{profile?.role === "admin" && <Link className="text-link" href="/admin">Open admin dashboard →</Link>}</div>
    <div className="account-layout">
      <section className="account-bookings">
        <div className="account-section-heading"><div><p className="eyebrow blue">ACCOUNT OVERVIEW</p><h2>Upcoming trips</h2></div><Link className="text-link" href="/flights">Find a flight</Link></div>
        {!savedBookings.length ? <div className="empty-state account-empty-state"><span className="empty-state-icon"><PlaneTakeoff size={28} /></span><h3>A fresh page for your next story.</h3><p>When you save a journey, your itinerary and payment progress will appear here.</p><Link className="btn" href="/flights">Find a flight</Link></div> : <section className="panel booking-panel"><div className="account-section-heading compact"><div><Ticket size={19} /><h2>My bookings</h2></div><span>{savedBookings.length} saved</span></div>{savedBookings.map((booking) => <article className="booking-row" key={booking.id}><div><span className={`badge ${booking.status === "test_confirmed" ? "green" : "amber"}`}>{booking.status === "test_confirmed" ? "Test payment verified" : booking.status === "cancelled" ? "Cancelled" : "Awaiting test payment"}</span><h3>{booking.flights.map((flight) => `${flight.from} → ${flight.to}`).join(" · ")}</h3><p className="booking-meta"><Ticket size={14} /> {booking.reference} <span>•</span> <CalendarDays size={14} /> {booking.flights[0].date} <span>•</span> {money(booking.total)}</p></div><Link className="btn btn-outline btn-small" href={`/bookings/${booking.id}`}>View booking</Link></article>)}</section>}
      </section>
      <ProfileForm name={profile?.full_name ?? ""} phone={profile?.phone ?? ""} email={user.email ?? ""} />
    </div>
  </div>;
}

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { requireUser } from "@/lib/supabase/server";
import { errorResponse } from "@/lib/server/http";
import type { Booking } from "@/lib/booking-types";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db, user } = await requireUser();
    const { id } = await params;
    const { data } = await db
      .from("bookings")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    const b = data as Booking | null;
    if (!b || (b.status !== "test_confirmed" && b.payment_status !== "paid"))
      throw new Error(
        "A verified test payment is required to download this confirmation.",
      );
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica),
      bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    let page = pdf.addPage([595, 842]),
      y = 785;
    const write = (text: string, size = 11, strong = false) => {
      if (y < 70) {
        page = pdf.addPage([595, 842]);
        y = 785;
      }
      page.drawText(text.replace(/[^\x20-\x7E]/g, "?"), {
        x: 45,
        y,
        size,
        font: strong ? bold : font,
        color: rgb(0.07, 0.18, 0.28),
      });
      y -= size + 13;
    };
    write("SkyVista", 28, true);
    write("TEST BOOKING CONFIRMATION", 17, true);
    write("NOT A VALID AIRLINE TICKET", 13, true);
    write(
      "Simulated itinerary. No airline reservation or ticket has been issued.",
      10,
    );
    write("Test payment only. No real money was charged.", 10);
    y -= 15;
    write(`SkyVista reference: ${b.reference}`, 13, true);
    write(`Created: ${new Date(b.created_at).toISOString().slice(0, 10)}`);
    write("Status: Test payment verified");
    y -= 12;
    for (const f of b.flights) {
      write(
        `${f.from} to ${f.to} | ${f.date} | ${f.number} | ${f.cabin}`,
        12,
        true,
      );
      write(`Departure: ${f.departure} (UTC)`, 10);
      write(`Arrival: ${f.arrival} (UTC)`, 10);
      write(f.baggage, 10);
    }
    y -= 10;
    write("Travellers", 14, true);
    b.passengers.forEach((p, i) => {
      write(`${p.firstName} ${p.lastName}`.slice(0, 75));
      write(
        `Seats: ${b.seats.map((s) => s[i]).join(", ")} | Extra bags per flight: ${b.bags[i]}`,
        10,
      );
    });
    y -= 10;
    write("Price breakdown (NGN)", 14, true);
    for (const [label, value] of Object.entries(b.price)) {
      if (typeof value === "number")
        write(
          `${label.charAt(0).toUpperCase() + label.slice(1)}: NGN ${(value / 100).toLocaleString("en-US")}`,
          11,
          label === "total",
        );
    }
    y -= 15;
    write(
      "This document cannot be used for travel, check-in, or visa applications.",
      9,
    );
    write(
      "Your reference identifies a SkyVista simulation, not an airline booking.",
      9,
    );
    return new Response(new Uint8Array(await pdf.save()), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="SkyVista-TEST-${b.reference}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}

import Link from "next/link";
import { getContent } from "@/lib/server/content";
import { Notice } from "@/components/site";
export const metadata = { title: "A little more reason to go" };
export default async function Offers() {
  const { offers } = await getContent();
  return (
    <div className="container page-shell article">
      <p className="eyebrow blue">YOUR NEXT ADVENTURE</p>
      <h1>Good journeys. Even better value.</h1>
      <p>Make a little more room in your travel plans.</p>
      {offers.map((o) => (
        <section key={o.id} className="panel">
          <span className="badge">{o.discount}% off the flight fare</span>
          <h2>{o.title}</h2>
          <p>
            Use <strong>{o.code}</strong> in the booking review to save{" "}
            {o.discount}% on your simulated base fare. Taxes, seat selection,
            and extra baggage are excluded. One code per booking. Valid while
            this offer is active.
          </p>
          <Link className="btn" href="/flights">
            Find your flight →
          </Link>
        </section>
      ))}
      {!offers.length && (
        <p>There are no current offers. Check back for more inspiration.</p>
      )}
      <Notice>
        Offers apply to simulated bookings and test checkout only. They do not
        represent discounts on real airline tickets.
      </Notice>
    </div>
  );
}

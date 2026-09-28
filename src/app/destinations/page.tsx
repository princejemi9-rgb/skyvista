import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getContent } from "@/lib/server/content";
import { dateAfter } from "@/lib/flights";
export const metadata = { title: "Explore destinations" };
export default async function Destinations() {
  const { destinations } = await getContent();
  return (
    <div className="container page-shell">
      <div className="page-title">
        <p className="eyebrow blue">YOUR WORLD, A LITTLE BIGGER</p>
        <h1>Somewhere new. Something unforgettable.</h1>
        <p>
          Find inspiration for your next chapter. Departures below start from
          Lagos; change your route in search.
        </p>
      </div>
      <div className="destination-grid">
        {destinations.map((d) => (
          <Link
            key={d.id}
            className="destination-card"
            href={`/flights?q=${encodeURIComponent(JSON.stringify({ type: "one-way", legs: [{ from: "LOS", to: d.airport, date: dateAfter(14) }], passengers: 1, cabin: "economy" }))}`}
          >
            <div className="destination-photo">
              <Image
                src={d.image}
                fill
                sizes="(max-width:640px) 70vw,22vw"
                alt={d.city}
              />
            </div>
            <div className="destination-info">
              <div>
                <h3>{d.city}</h3>
                <p>{d.country}</p>
              </div>
              <ArrowUpRight size={19} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

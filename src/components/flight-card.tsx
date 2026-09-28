import Image from "next/image";
import { Plane } from "lucide-react";
import {
  airlines,
  airport,
  localTime,
  localDate,
  durationText,
  money,
  type Flight,
} from "@/lib/flights";
export function FlightCard({
  flight: f,
  onSelect,
}: {
  flight: Flight;
  onSelect?: () => void;
}) {
  const a = airlines.find((a) => a.code === f.airline)!;
  return (
    <article className="flight-card">
      <div className="flight-main">
        <div className="airline">
          <span
            className="airline-logo"
            style={{ background: "white", border: "1px solid #e7edf3" }}
          >
            <Image
              src={`/images/airline-${a.code}.png`}
              alt={`${a.name} logo`}
              width={30}
              height={30}
              style={{ objectFit: "contain" }}
            />
          </span>
          <div>
            <strong>{a.name}</strong>
            <small>
              {f.number} · {f.cabin}
            </small>
          </div>
        </div>
        <div className="flight-times">
          <div className="flight-time">
            <strong>{localTime(f.departure, f.from)}</strong>
            <span>
              {f.from} · {localDate(f.departure, f.from)}
            </span>
          </div>
          <div className="flight-route">
            <span>{durationText(f.duration)}</span>
            <div>
              <i />
              <Plane size={15} />
              <i />
            </div>
            <span>{f.stops ? `1 stop · ${f.via}` : "Non-stop"}</span>
          </div>
          <div className="flight-time">
            <strong>{localTime(f.arrival, f.to)}</strong>
            <span>
              {f.to} · {localDate(f.arrival, f.to)}
            </span>
          </div>
        </div>
        <div className="flight-price">
          <strong>{money(f.price)}</strong>
          <small>per traveller · before taxes</small>
          {onSelect && (
            <button className="btn" onClick={onSelect}>
              Select flight
            </button>
          )}
        </div>
      </div>
      <details className="flight-details">
        <summary>Flight details & baggage</summary>
        <p>
          {airport(f.from).name} → {airport(f.to).name}. {f.baggage}. All times
          are local to each airport.{" "}
          {f.via && `Connection via ${airport(f.via).city}.`} Aircraft and
          schedules are illustrative. Simulated fare; no ticket issuance or
          airline reservation.
        </p>
      </details>
    </article>
  );
}

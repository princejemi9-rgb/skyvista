"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, LockKeyhole, Plane } from "lucide-react";
import { Notice } from "@/components/site";
import {
  calculatePrice,
  bookingSchema,
  searchSchema,
  seatIds,
  unavailableSeats,
  money,
  seatPrice,
  birthDateLimit,
  type Flight,
  type SearchInput,
  type BookingInput,
} from "@/lib/flights";
type Draft = { search: SearchInput; flights: Flight[] };
const blank = () => ({
  firstName: "",
  lastName: "",
  dob: "",
  nationality: "",
  document: "",
});
export default function Booking() {
  const [draft, setDraft] = useState<Draft | null>(null),
    [ready, setReady] = useState(false),
    [step, setStep] = useState(0),
    [people, setPeople] = useState<BookingInput["passengers"]>([]),
    [email, setEmail] = useState(""),
    [phone, setPhone] = useState(""),
    [seats, setSeats] = useState<string[][]>([]),
    [bags, setBags] = useState<number[]>([]),
    [leg, setLeg] = useState(0),
    [traveller, setTraveller] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [accepted, setAccepted] = useState(false),
    [promo, setPromo] = useState(""),
    [discount, setDiscount] = useState(0),
    [key, setKey] = useState("");
  useEffect(() => {
    try {
      const data = JSON.parse(
        sessionStorage.getItem("skyvista-draft") ?? "null",
      );
      if (data) {
        searchSchema.parse(data.search);
        if (!Array.isArray(data.flights) || data.flights.length !== data.search.legs.length || data.flights.some((flight: Flight) => !flight || typeof flight.id !== 'string' || !Number.isSafeInteger(flight.price) || flight.price <= 0)) {
          throw new Error('Invalid saved itinerary.');
        }
        setDraft(data);
        setPeople(Array.from({ length: data.search.passengers }, blank));
        setBags(Array(data.search.passengers).fill(0));
        setSeats(
          data.flights.map(() => Array(data.search.passengers).fill("")),
        );
        setKey(crypto.randomUUID());
      }
    } catch {
      sessionStorage.removeItem("skyvista-draft");
    }
    setReady(true);
  }, []);
  if (!ready)
    return <div className="container page-shell">Preparing your journey…</div>;
  if (!draft)
    return (
      <div className="container page-shell">
        <h1>Let’s find your flight first.</h1>
        <p>Select your flights to start your booking.</p>
        <Link className="btn" href="/flights">
          Search flights
        </Link>
      </div>
    );
  const price = calculatePrice(
    draft.flights,
    people.length,
    seats,
    bags,
    discount,
  );
  const payload = () => ({
    search: draft.search,
    flightIds: draft.flights.map((f) => f.id),
    passengers: people,
    email,
    phone,
    seats,
    bags,
    promo,
    idempotencyKey: key,
    expectedTotal: price.total,
  });
  function updatePerson(i: number, field: string, value: string) {
    setPeople((p) =>
      p.map((person, j) => (i === j ? { ...person, [field]: value } : person)),
    );
  }
  function next(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const result = bookingSchema.safeParse(payload());
    if (step === 0 && !result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    if (step === 1 && seats.some((s) => s.some((v) => !v))) {
      setError("Please select a seat for every traveller on every flight.");
      return;
    }
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function applyPromo() {
    setError("");
    try {
      const r = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promo }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setDiscount(d.discount);
    } catch (e) {
      setDiscount(0);
      setError((e as Error).message);
    }
  }
  async function pay() {
    if (!accepted) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload()),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      window.location.assign(`/bookings/${d.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container page-shell">
      <div className="page-title">
        <p className="eyebrow blue">MAKE IT YOUR JOURNEY</p>
        <h1>
          {
            [
              "Who’s coming along?",
              "A little more comfort.",
              "Everything, just as you like it.",
            ][step]
          }
        </h1>
      </div>
      <div className="steps">
        {["Traveller details", "Seats & baggage", "Review booking"].map(
          (s, i) => (
            <span key={s} className={i === step ? "current" : ""}>
              <i>{i < step ? "✓" : i + 1}</i>
              {s}
            </span>
          ),
        )}
      </div>
      <Notice />
      <div className="booking-layout">
        <div>
          <form onSubmit={next}>
            {step === 0 && (
              <>
                {people.map((p, i) => (
                  <section key={i} className="panel">
                    <h2>Traveller {i + 1}</h2>
                    <p className="muted">
                      Use the name shown on your travel document. All travellers
                      must be aged 12 or older.
                    </p>
                    <div className="form-grid">
                      {[
                        ["firstName", "First name"],
                        ["lastName", "Last name"],
                        ["dob", "Date of birth"],
                        ["nationality", "Nationality"],
                        ["document", "Passport / national ID number"],
                      ].map(([field, label]) => (
                        <label className="field" key={field}>
                          {label}
                          <input
                            aria-label={`Traveller ${i + 1} ${label}`}
                            autoComplete={
                              field === "firstName"
                                ? "given-name"
                                : field === "lastName"
                                  ? "family-name"
                                  : "off"
                            }
                            required
                            type={field === "dob" ? "date" : "text"}
                            max={
                            field === "dob" ? birthDateLimit(12) : undefined
                            }
                            value={p[field as keyof typeof p]}
                            onChange={(e) =>
                              updatePerson(i, field, e.target.value)
                            }
                          />
                        </label>
                      ))}
                    </div>
                  </section>
                ))}
                <section className="panel">
                  <h2>Contact details</h2>
                  <div className="form-grid">
                    <label className="field">
                      Email address
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                      />
                    </label>
                    <label className="field">
                      Phone number
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        autoComplete="tel"
                        placeholder="+234"
                      />
                    </label>
                  </div>
                  <p className="muted">
                    Your confirmation is saved to your account. No airline
                    ticket will be issued.
                  </p>
                </section>
              </>
            )}
            {step === 1 && (
              <>
                <section className="panel">
                  <h2>A seat with your name on it.</h2>
                  <p className="muted">
                    Choose a seat for each traveller. Standard seats are
                    included; the first three rows add {money(1500000)} per
                    flight.
                  </p>
                  <div className="leg-tabs">
                    {draft.flights.map((f, i) => (
                      <button
                        type="button"
                        key={f.id}
                        className={`leg-tab ${i === leg ? "active" : ""}`}
                        onClick={() => setLeg(i)}
                      >
                        {f.from} → {f.to}
                      </button>
                    ))}
                  </div>
                  <div className="traveller-tabs">
                    {people.map((p, i) => (
                      <button
                        type="button"
                        className={i === traveller ? "active" : ""}
                        key={i}
                        onClick={() => setTraveller(i)}
                      >
                        {p.firstName} · {seats[leg][i] || "Select seat"}
                      </button>
                    ))}
                  </div>
                  <div className="seat-map">
                    <div
                      className="row"
                      style={{ justifyContent: "center", color: "#92aac0" }}
                    >
                      <Plane size={25} />
                    </div>
                    <div className="seat-grid">
                      {seatIds.map((s) => {
                        const occupied =
                          unavailableSeats(draft.flights[leg].id).includes(s) ||
                          seats[leg].some((v, i) => i !== traveller && v === s);
                        return (
                          <button
                            type="button"
                            key={s}
                            disabled={occupied}
                            aria-label={`Seat ${s}${occupied ? ", unavailable" : ""}`}
                            aria-pressed={seats[leg][traveller] === s}
                            className={`${seatPrice(s) ? "preferred" : ""} ${seats[leg][traveller] === s ? "selected" : ""}`}
                            onClick={() =>
                              setSeats((p) =>
                                p.map((row, i) =>
                                  i === leg
                                    ? row.map((v, j) =>
                                        j === traveller ? s : v,
                                      )
                                    : row,
                                ),
                              )
                            }
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="seat-legend">
                    <span>White · included</span>
                    <span>Gold · preferred</span>
                    <span>Blue · selected</span>
                    <span>Grey · unavailable</span>
                  </div>
                </section>
                <section className="panel">
                  <h2>Room for a little more.</h2>
                  <p className="muted">
                    Each traveller includes 7 kg cabin baggage and one 23 kg
                    checked bag. Extra 23 kg bags cost {money(2500000)} per
                    flight.
                  </p>
                  {people.map((p, i) => (
                    <label className="field" key={i}>
                      {p.firstName} {p.lastName}
                      <select
                        aria-label={`Extra baggage for traveller ${i + 1}`}
                        value={bags[i]}
                        onChange={(e) =>
                          setBags((b) =>
                            b.map((v, j) => (j === i ? +e.target.value : v)),
                          )
                        }
                      >
                        <option value={0}>Included baggage only</option>
                        <option value={1}>1 extra checked bag</option>
                        <option value={2}>2 extra checked bags</option>
                      </select>
                    </label>
                  ))}
                </section>
              </>
            )}
            {step === 2 && (
              <>
                <section className="panel">
                  <h2>Your travellers</h2>
                  {people.map((p, i) => (
                    <div className="summary-route" key={i}>
                      <strong>
                        {p.firstName} {p.lastName}
                      </strong>
                      <p>
                        {p.nationality} · {p.dob} · Document ending{" "}
                        {p.document.slice(-4)}
                      </p>
                      <p>
                        Seats: {seats.map((s) => s[i]).join(", ")} · {bags[i]}{" "}
                        extra bag(s) per flight
                      </p>
                    </div>
                  ))}
                  <p>
                    {email} · {phone}
                  </p>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => setStep(0)}
                  >
                    Edit traveller details
                  </button>
                </section>
                <section className="panel">
                  <h2>Have an offer code?</h2>
                  <div className="row">
                    <label className="field" style={{ margin: 0, flex: 1 }}>
                      <span className="sr-only">Offer code</span>
                      <input
                        value={promo}
                        onChange={(e) => {
                          setPromo(e.target.value.toUpperCase());
                          setDiscount(0);
                        }}
                        placeholder="Enter your code"
                        maxLength={30}
                      />
                    </label>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={applyPromo}
                    >
                      Apply
                    </button>
                  </div>
                  {discount > 0 && (
                    <p className="success-message">
                      {discount}% off your flight fare applied.
                    </p>
                  )}
                </section>
                <section className="panel">
                  <h2>Ready for test checkout?</h2>
                  <p className="muted">
                    Sign in to save your booking securely. Paystack’s hosted
                    checkout handles payment information. Test transactions do
                    not move real money or buy an airline ticket.
                  </p>
                  <Link
                    className="text-link"
                    target="_blank"
                    href="/auth?mode=login"
                  >
                    Sign in / create account in a new tab{" "}
                    <ArrowRight size={14} />
                  </Link>
                  <label
                    className="row"
                    style={{ margin: "20px 0", alignItems: "flex-start" }}
                  >
                    <input
                      type="checkbox"
                      checked={accepted}
                      onChange={(e) => setAccepted(e.target.checked)}
                    />
                    <span style={{ flex: 1, fontSize: 12 }}>
                      I accept the{" "}
                      <Link className="text-link" href="/terms" target="_blank">
                        terms
                      </Link>{" "}
                      and understand this is a simulated booking with test
                      payments, not a valid airline reservation.
                    </span>
                  </label>
                  <button
                    type="button"
                    className="btn full-width"
                    disabled={busy || !accepted}
                    onClick={pay}
                  >
                    <LockKeyhole size={16} />
                    {busy ? "Saving your booking…" : "Save booking & continue"}
                  </button>
                </section>
              </>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="row spread">
              {step > 0 && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setStep((s) => s - 1);
                    setError("");
                  }}
                >
                  Back
                </button>
              )}
              {step < 2 && (
                <button className="btn" type="submit">
                  {step === 0
                    ? "Choose seats & baggage"
                    : "Review your booking"}
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          </form>
        </div>
        <aside className="panel booking-summary">
          <h2>Your journey</h2>
          {draft.flights.map((f) => (
            <div className="summary-route" key={f.id}>
              <strong>
                {f.from} <ArrowRight size={15} /> {f.to}
              </strong>
              <p>
                {f.date} · {f.number} · {f.cabin}
              </p>
            </div>
          ))}
          <p className="muted">
            {people.length} traveller{people.length > 1 ? "s" : ""} ·{" "}
            {draft.flights.length} flight{draft.flights.length > 1 ? "s" : ""}
          </p>
          {[
            ["Flight fare", price.fare],
            ["Taxes (7.5%)", price.taxes],
            ["Seat selection", price.seats],
            ["Extra baggage", price.baggage],
            ["Offer savings", -price.discount],
          ].map(([label, n]) => (
            <div key={label} className="summary-line">
              <span>{label}</span>
              <span>{money(Number(n))}</span>
            </div>
          ))}
          <div className="summary-line total">
            <span>Total</span>
            <span>{money(price.total)}</span>
          </div>
          <small className="muted">
            NGN · test checkout only. Final price is rechecked when you save.
          </small>
        </aside>
      </div>
    </div>
  );
}

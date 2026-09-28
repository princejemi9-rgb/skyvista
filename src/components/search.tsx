"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  MapPin,
  Search,
  Plane,
  Plus,
  X,
  Users,
  ChevronDown,
} from "lucide-react";
import {
  airports,
  airport,
  dateAfter,
  searchSchema,
  type SearchInput,
} from "@/lib/flights";
export function AirportInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = `${label.replace(/\s/g, "")}-options`;
  const found = airports.filter((a) =>
    `${a.city} ${a.name} ${a.code}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="airport-input">
      <label>
        <span>{label}</span>
        <div className="input-icon">
          <MapPin size={18} />
          <input
            aria-label={label}
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            aria-controls={listId}
            aria-activedescendant={open && found[active] ? `${listId}-${found[active].code}` : undefined}
            value={
              open
                ? query
                : value
                  ? `${airport(value)?.city ?? value} (${value})`
                  : ""
            }
            placeholder="City or airport"
            onFocus={() => {
              setOpen(true);
              setQuery("");
              setActive(0);
            }}
            onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true); }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                setOpen(true);
                setActive(index => Math.max(0, Math.min(found.length - 1, index + (e.key === "ArrowDown" ? 1 : -1))));
              }
              if (e.key === "Enter" && open) {
                e.preventDefault();
                if (found[active]) onChange(found[active].code);
                setOpen(false);
              }
            }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          />
        </div>
      </label>
      {open && (
        <div
          className="airport-options"
          role="listbox"
          id={listId}
        >
          {found.map((a, index) => (
            <button
              key={a.code}
              type="button"
              role="option"
              id={`${listId}-${a.code}`}
              style={index === active ? { background: '#eff6ff' } : undefined}
              aria-selected={a.code === value}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(a.code);
                setOpen(false);
              }}
            >
              <Plane size={17} />
              <span>
                <strong>{a.city}</strong>
                <small>{a.name}</small>
              </span>
              <b>{a.code}</b>
            </button>
          ))}
          {!found.length && <p>No matching airports.</p>}
        </div>
      )}
    </div>
  );
}
export function SearchWidget({
  initial,
  compact = false,
}: {
  initial?: SearchInput;
  compact?: boolean;
}) {
  const router = useRouter();
  const [type, setType] = useState<SearchInput["type"]>(
    initial?.type ?? "round-trip",
  );
  const [legs, setLegs] = useState(
    initial?.legs ?? [
      { from: "LOS", to: "JFK", date: dateAfter(14) },
      { from: "JFK", to: "LOS", date: dateAfter(21) },
    ],
  );
  const [count, setCount] = useState(initial?.passengers ?? 1);
  const [cabin, setCabin] = useState<SearchInput["cabin"]>(
    initial?.cabin ?? "economy",
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  function update(i: number, key: "from" | "to" | "date", value: string) {
    setLegs((prev) => {
      const next = [...prev];
      next[i] = {
        ...(next[i] ?? {
          from: prev[0].to,
          to: prev[0].from,
          date: dateAfter(21),
        }),
        [key]: value,
      };
      return next;
    });
  }
  function changeType(t: SearchInput["type"]) {
    setType(t);
    if (t !== "one-way" && legs.length < 2)
      setLegs((p) => [
        ...p,
        {
          from: p[0].to,
          to: p[0].from,
          date: p[0].date > dateAfter(21) ? p[0].date : dateAfter(21),
        },
      ]);
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const normalized =
      type === "one-way"
        ? [legs[0]]
        : type === "round-trip"
          ? [
              legs[0],
              {
                from: legs[0].to,
                to: legs[0].from,
                date: legs[1]?.date ?? dateAfter(21),
              },
            ]
          : legs;
    const parsed = searchSchema.safeParse({
      type,
      legs: normalized,
      passengers: count,
      cabin,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    router.push(
      `/flights?q=${encodeURIComponent(JSON.stringify(parsed.data))}`,
    );
    setTimeout(() => setBusy(false), 800);
  }
  return (
    <form
      className={`search-widget ${compact ? "compact" : ""}`}
      onSubmit={submit}
    >
      <div className="search-tabs">
        <span>
          <Plane size={18} /> Flights
        </span>
        <span className="search-tab-note">Every great journey starts here</span>
      </div>
      <div className="search-options">
        <div className="trip-types">
          {(["round-trip", "one-way", "multi-city"] as const).map((t) => (
            <label key={t}>
              <input
                type="radio"
                name="tripType"
                checked={type === t}
                onChange={() => changeType(t)}
              />
              {t === "round-trip"
                ? "Round trip"
                : t === "one-way"
                  ? "One way"
                  : "Multi-city"}
            </label>
          ))}
        </div>
        <div className="traveller-select">
          <Users size={15} />
          <select
            aria-label="Number of travellers"
            value={count}
            onChange={(e) => setCount(+e.target.value)}
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} Traveller{n > 1 ? "s" : ""}
              </option>
            ))}
          </select>
          <span>·</span>
          <select
            aria-label="Cabin class"
            value={cabin}
            onChange={(e) => setCabin(e.target.value as SearchInput["cabin"])}
          >
            <option value="economy">Economy</option>
            <option value="business">Business</option>
          </select>
          <ChevronDown size={13} />
        </div>
      </div>
      {(type === "multi-city" ? legs : [legs[0]]).map((leg, i) => (
        <div className="search-fields" key={i}>
          <AirportInput
            label={i ? `From, flight ${i + 1}` : "From"}
            value={leg.from}
            onChange={(v) => update(i, "from", v)}
          />
          <button
            className="swap"
            type="button"
            aria-label={`Swap airports for flight ${i + 1}`}
            onClick={() =>
              setLegs((prev) =>
                prev.map((l, j) =>
                  j === i ? { ...l, from: l.to, to: l.from } : l,
                ),
              )
            }
          >
            <ArrowLeftRight size={17} />
          </button>
          <AirportInput
            label={i ? `To, flight ${i + 1}` : "To"}
            value={leg.to}
            onChange={(v) => update(i, "to", v)}
          />
          <label className="date-input">
            <span>Departure</span>
            <input
              aria-label={`Departure date${i ? ` ${i + 1}` : ""}`}
              type="date"
              min={dateAfter(1)}
              max={dateAfter(365)}
              required
              value={leg.date}
              onChange={(e) => update(i, "date", e.target.value)}
            />
          </label>
          {type === "round-trip" && (
            <label className="date-input">
              <span>Return</span>
              <input
                aria-label="Return date"
                type="date"
                min={leg.date}
                max={dateAfter(365)}
                required
                value={legs[1]?.date ?? ""}
                onChange={(e) => update(1, "date", e.target.value)}
              />
            </label>
          )}
          {type === "multi-city" && i > 1 ? (
            <button
              type="button"
              className="icon-button"
              aria-label={`Remove flight ${i + 1}`}
              onClick={() => setLegs((p) => p.filter((_, j) => j !== i))}
            >
              <X size={18} />
            </button>
          ) : (
            i === 0 && (
              <button
                className="btn search-submit"
                disabled={busy}
                type="submit"
              >
                <Search size={18} />
                {busy ? "Searching…" : "Search Flights"}
              </button>
            )
          )}
        </div>
      ))}
      {type === "multi-city" && legs.length < 4 && (
        <button
          className="text-button"
          type="button"
          onClick={() =>
            setLegs((p) => [
              ...p,
              { from: p[p.length - 1].to, to: "LHR", date: dateAfter(28) },
            ])
          }
        >
          <Plus size={15} /> Add another flight
        </button>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

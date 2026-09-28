"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Plane, ArrowRight, RotateCcw } from "lucide-react";
import { SearchWidget } from "@/components/search";
import { Notice } from "@/components/site";
import { FlightCard } from "@/components/flight-card";
import {
  searchSchema,
  airlines,
  money,
  type SearchInput,
  type Flight,
} from "@/lib/flights";
export function Results() {
  const params = useSearchParams(),
    router = useRouter();
  const raw = params.get("q");
  let parsed: SearchInput | null = null;
  let invalid = false;
  try {
    if (raw) parsed = searchSchema.parse(JSON.parse(raw));
  } catch {
    invalid = true;
  }
  const [groups, setGroups] = useState<Flight[][]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [leg, setLeg] = useState(0);
  const [selected, setSelected] = useState<Flight[]>([]);
  const [stops, setStops] = useState(false);
  const [carriers, setCarriers] = useState<string[]>([]);
  const [sort, setSort] = useState("price");
  const [max, setMax] = useState(1000000000);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!raw) return;
    const abort = new AbortController();
    setLoading(true);
    setError("");
    setLeg(0);
    setSelected([]);
    setCarriers([]);
    setStops(false);
    setMax(1000000000);
    fetch("/api/flights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: raw,
      signal: abort.signal,
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        setGroups(data.flights);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [raw, retry]);
  function choose(f: Flight) {
    const next = [...selected.slice(0, leg), f];
    setSelected(next);
    if (leg + 1 < groups.length) {
      setLeg(leg + 1);
      window.scrollTo({ top: 400, behavior: "smooth" });
    } else {
      sessionStorage.setItem(
        "skyvista-draft",
        JSON.stringify({ search: parsed, flights: next }),
      );
      router.push("/booking");
    }
  }
  const flights = (groups[leg] ?? [])
    .filter(
      (f) =>
        (!stops || f.stops === 0) &&
        (!carriers.length || carriers.includes(f.airline)) &&
        f.price <= max,
    )
    .sort((a, b) =>
      sort === "price"
        ? a.price - b.price
        : sort === "duration"
          ? a.duration - b.duration
          : a.departure.localeCompare(b.departure),
    );
  return (
    <div className="container page-shell">
      <div className="page-title">
        <p className="eyebrow blue">THE JOURNEY STARTS HERE</p>
        <h1>Find your next great escape.</h1>
        <p>Choose the flight that feels right for you.</p>
      </div>
      <SearchWidget
        key={raw ?? "empty"}
        initial={parsed ?? undefined}
        compact
      />
      <Notice />
      {invalid && (
        <p className="form-error">
          Your search details are invalid or expired. Choose new dates and
          search again.
        </p>
      )}
      {!raw && (
        <div className="empty-state">
          <Plane size={38} />
          <h2>A world of possibilities.</h2>
          <p>Choose your destination and dates above to explore flights.</p>
        </div>
      )}
      {loading && (
        <div className="panel" aria-live="polite">
          <div className="loading-orbit" />
          Finding flights for your journey…
        </div>
      )}
      {error && (
        <div className="form-error" role="alert">
          {error}{" "}
          <button
            className="text-button"
            onClick={() => setRetry((x) => x + 1)}
          >
            Try again
          </button>
        </div>
      )}
      {parsed && !loading && !error && groups.length > 0 && (
        <>
          <div className="leg-tabs">
            {parsed.legs.map((l, i) => (
              <button
                key={i}
                className={`leg-tab ${leg === i ? "active" : ""}`}
                disabled={i > selected.length}
                onClick={() => setLeg(i)}
              >
                {selected[i] ? "✓ " : ""}Flight {i + 1}: {l.from} → {l.to} ·{" "}
                {l.date}
              </button>
            ))}
          </div>
          <div className="results-layout">
            <aside className="panel filters">
              <div className="filter-group">
                <h3>Stops</h3>
                <label>
                  <input
                    type="checkbox"
                    checked={stops}
                    onChange={(e) => setStops(e.target.checked)}
                  />{" "}
                  Non-stop only
                </label>
              </div>
              <div className="filter-group">
                <h3>Airlines</h3>
                {airlines.map((a) => (
                  <label key={a.code}>
                    <input
                      type="checkbox"
                      checked={carriers.includes(a.code)}
                      onChange={(e) =>
                        setCarriers((p) =>
                          e.target.checked
                            ? [...p, a.code]
                            : p.filter((c) => c !== a.code),
                        )
                      }
                    />
                    {a.name}
                  </label>
                ))}
              </div>
              <div className="filter-group">
                <h3>Maximum fare</h3>
                <input
                  aria-label="Maximum fare"
                  type="range"
                  min="10000000"
                  max="1000000000"
                  step="1000000"
                  value={max}
                  onChange={(e) => setMax(+e.target.value)}
                />
                <small>{money(max)}</small>
              </div>
              <button
                className="text-button"
                onClick={() => {
                  setStops(false);
                  setCarriers([]);
                  setMax(1000000000);
                }}
              >
                <RotateCcw size={13} /> Reset filters
              </button>
            </aside>
            <div>
              <div className="results-toolbar">
                <span>
                  <strong>{flights.length} flights</strong> ·{" "}
                  {parsed.legs[leg].from}{" "}
                  <ArrowRight size={12} style={{ display: "inline" }} />{" "}
                  {parsed.legs[leg].to}
                </span>
                <select
                  aria-label="Sort flights"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="price">Lowest price first</option>
                  <option value="duration">Shortest duration</option>
                  <option value="departure">Earliest departure</option>
                </select>
              </div>
              {flights.map((f) => (
                <FlightCard key={f.id} flight={f} onSelect={() => choose(f)} />
              ))}
              {!flights.length && (
                <div className="empty-state">
                  <h3>No flights match these filters.</h3>
                  <p>
                    Try another airline, a higher budget, or a different route.
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

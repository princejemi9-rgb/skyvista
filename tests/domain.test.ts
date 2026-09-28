import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  SeededFlightProvider,
  searchSchema,
  validateBooking,
  calculatePrice,
  unavailableSeats,
  seatIds,
  dateAfter,
  defaultInventory,
  type SearchInput,
} from "../src/lib/flights";
import { assertTestPayment } from "../src/lib/payments";
const search: SearchInput = {
  type: "round-trip",
  legs: [
    { from: "LOS", to: "LHR", date: dateAfter(14) },
    { from: "LHR", to: "LOS", date: dateAfter(21) },
  ],
  passengers: 2,
  cabin: "economy",
};
test("inventory is deterministic and matches every requested route and date", async () => {
  const provider = new SeededFlightProvider();
  const a = await provider.search(search),
    b = await provider.search(search);
  assert.deepEqual(a, b);
  a.forEach((flights, i) =>
    flights.forEach((f) => {
      assert.equal(f.from, search.legs[i].from);
      assert.equal(f.to, search.legs[i].to);
      assert.equal(f.date, search.legs[i].date);
      assert.equal(f.source, "simulated");
      assert.ok(f.price > 0);
      assert.equal(
        (Date.parse(f.arrival) - Date.parse(f.departure)) / 60000,
        f.duration,
      );
    }),
  );
});
test("invalid routes, impossible dates, reversed trip dates, and excessive travellers fail", () => {
  assert.throws(() => searchSchema.parse({ ...search, passengers: 7 }));
  assert.throws(() =>
    searchSchema.parse({
      ...search,
      legs: [{ from: "LOS", to: "LOS", date: dateAfter(2) }],
    }),
  );
  assert.throws(() =>
    searchSchema.parse({
      ...search,
      legs: [{ ...search.legs[0], date: "2027-02-30" }, search.legs[1]],
    }),
  );
  assert.throws(() =>
    searchSchema.parse({
      ...search,
      legs: [search.legs[0], { ...search.legs[1], date: dateAfter(3) }],
    }),
  );
  assert.throws(() => searchSchema.parse({ ...search, type: "one-way" }));
});
test("inactive inventory disappears and fare multipliers apply", async () => {
  const p = new SeededFlightProvider(
    defaultInventory.map((r) => ({
      ...r,
      active: r.airline !== "EK",
      multiplier: 2,
    })),
  );
  const result = await p.search(search);
  assert.ok(!result[0].some((f) => f.airline === "EK"));
  const base = await new SeededFlightProvider().search(search);
  assert.ok(result[0][0].price > base[0][0].price * 1.99);
});
test("multi-city searches preserve all legs", async () => {
  const input: SearchInput = {
    ...search,
    type: "multi-city",
    legs: [...search.legs, { from: "LOS", to: "DXB", date: dateAfter(28) }],
  };
  const result = await new SeededFlightProvider().search(input);
  assert.equal(result.length, 3);
  assert.equal(result[2][0].to, "DXB");
});
test("price breakdown charges extras per person and per leg with base-fare discount", async () => {
  const flights = (await new SeededFlightProvider().search(search)).map(
    (g) => g[0],
  );
  const p = calculatePrice(
    flights,
    2,
    [
      ["1A", "4A"],
      ["4B", "4C"],
    ],
    [1, 2],
    30,
  );
  assert.equal(p.fare, flights.reduce((n, f) => n + f.price, 0) * 2);
  assert.equal(p.seats, 1500000);
  assert.equal(p.baggage, 15000000);
  assert.equal(p.discount, Math.round(p.fare * 0.3));
  assert.equal(p.total, p.fare + p.taxes + p.seats + p.baggage - p.discount);
  assert.ok(Number.isSafeInteger(p.total));
});
async function validBooking() {
  const provider = new SeededFlightProvider(),
    flights = (await provider.search(search)).map((g) => g[0]);
  return {
    provider,
    input: {
      search,
      flightIds: flights.map((f) => f.id),
      passengers: [
        {
          firstName: "Ada",
          lastName: "Test",
          dob: "1990-03-10",
          nationality: "Nigerian",
          document: "TEST001",
        },
        {
          firstName: "James",
          lastName: "Test",
          dob: "1991-05-10",
          nationality: "Nigerian",
          document: "TEST002",
        },
      ],
      email: "test@example.com",
      phone: "+2348000000000",
      seats: flights.map((f) =>
        seatIds.filter((s) => !unavailableSeats(f.id).includes(s)).slice(0, 2),
      ),
      bags: [0, 1],
      promo: "",
      idempotencyKey: randomUUID(),
    },
  };
}
test("server reprices trusted inventory and rejects tampered flight identifiers", async () => {
  const { provider, input } = await validBooking();
  const result = await validateBooking({ ...input, total: 1 }, provider);
  assert.ok(result.price.total > 1);
  await assert.rejects(() =>
    validateBooking(
      { ...input, flightIds: ["fake", input.flightIds[1]] },
      provider,
    ),
  );
});
test("duplicate seats, unavailable seats, missing passengers and invalid documents fail", async () => {
  const { provider, input } = await validBooking();
  await assert.rejects(() =>
    validateBooking(
      { ...input, seats: input.seats.map((s) => [s[0], s[0]]) },
      provider,
    ),
  );
  await assert.rejects(() =>
    validateBooking(
      { ...input, passengers: input.passengers.slice(0, 1) },
      provider,
    ),
  );
  await assert.rejects(() =>
    validateBooking(
      {
        ...input,
        passengers: input.passengers.map((p) => ({ ...p, document: "!" })),
      },
      provider,
    ),
  );
  await assert.rejects(() =>
    validateBooking(
      {
        ...input,
        seats: [
          [unavailableSeats(input.flightIds[0])[0], input.seats[0][1]],
          input.seats[1],
        ],
      },
      provider,
    ),
  );
});
test("successful payments require test domain, exact amount, currency, reference and booking metadata", () => {
  const expected = { reference: "ref", amount: 150000, bookingId: "booking" };
  const payment = {
    status: "success",
    reference: "ref",
    amount: 150000,
    currency: "NGN",
    domain: "test",
    id: 1,
    metadata: { booking_id: "booking" },
  };
  assert.doesNotThrow(() => assertTestPayment(payment, expected));
  for (const wrong of [
    { domain: "live" },
    { amount: 1 },
    { currency: "USD" },
    { reference: "another" },
    { status: "pending" },
    { metadata: { booking_id: "wrong" } },
  ])
    assert.throws(() => assertTestPayment({ ...payment, ...wrong }, expected));
});

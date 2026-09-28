import { z } from "zod";

export const airports = [
  {
    code: "LOS",
    city: "Lagos",
    name: "Murtala Muhammed International",
    timezone: "Africa/Lagos",
    lat: 6.58,
    lon: 3.32,
  },
  {
    code: "ABV",
    city: "Abuja",
    name: "Nnamdi Azikiwe International",
    timezone: "Africa/Lagos",
    lat: 9,
    lon: 7.26,
  },
  {
    code: "JFK",
    city: "New York",
    name: "John F. Kennedy International",
    timezone: "America/New_York",
    lat: 40.64,
    lon: -73.78,
  },
  {
    code: "LHR",
    city: "London",
    name: "London Heathrow",
    timezone: "Europe/London",
    lat: 51.47,
    lon: -0.45,
  },
  {
    code: "DXB",
    city: "Dubai",
    name: "Dubai International",
    timezone: "Asia/Dubai",
    lat: 25.25,
    lon: 55.36,
  },
  {
    code: "CDG",
    city: "Paris",
    name: "Charles de Gaulle",
    timezone: "Europe/Paris",
    lat: 49,
    lon: 2.55,
  },
  {
    code: "IST",
    city: "Istanbul",
    name: "Istanbul Airport",
    timezone: "Europe/Istanbul",
    lat: 41.27,
    lon: 28.75,
  },
  {
    code: "ACC",
    city: "Accra",
    name: "Kotoka International",
    timezone: "Africa/Accra",
    lat: 5.61,
    lon: -0.17,
  },
  {
    code: "JNB",
    city: "Johannesburg",
    name: "O. R. Tambo International",
    timezone: "Africa/Johannesburg",
    lat: -26.14,
    lon: 28.24,
  },
  {
    code: "NBO",
    city: "Nairobi",
    name: "Jomo Kenyatta International",
    timezone: "Africa/Nairobi",
    lat: -1.32,
    lon: 36.92,
  },
  {
    code: "DOH",
    city: "Doha",
    name: "Hamad International",
    timezone: "Asia/Qatar",
    lat: 25.27,
    lon: 51.61,
  },
  {
    code: "AMS",
    city: "Amsterdam",
    name: "Amsterdam Schiphol",
    timezone: "Europe/Amsterdam",
    lat: 52.31,
    lon: 4.76,
  },
];
export const airlines = [
  { code: "BA", name: "British Airways", color: "#153e74", hub: "LHR" },
  { code: "EK", name: "Emirates", color: "#c52430", hub: "DXB" },
  { code: "QR", name: "Qatar Airways", color: "#742348", hub: "DOH" },
  { code: "TK", name: "Turkish Airlines", color: "#d92531", hub: "IST" },
];
export const airport = (code: string) => airports.find((a) => a.code === code)!;
export const money = (minor: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(minor / 100);
export function dateAfter(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function birthDateLimit(years: number) {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() - years);
  return date.toISOString().slice(0, 10);
}
const codeSchema = z
  .string()
  .refine(
    (c) => airports.some((a) => a.code === c),
    "Choose an airport from the list.",
  );
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (d) =>
      Number.isFinite(Date.parse(d)) &&
      new Date(d).toISOString().slice(0, 10) === d,
    "Invalid date",
  )
  .refine(
    (d) => d >= dateAfter(1) && d <= dateAfter(365),
    "Choose a date from tomorrow to one year ahead.",
  );
export const legSchema = z
  .object({ from: codeSchema, to: codeSchema, date: dateSchema })
  .refine(
    (l) => l.from !== l.to,
    "Choose different departure and arrival airports.",
  );
export const searchSchema = z
  .object({
    type: z.enum(["one-way", "round-trip", "multi-city"]),
    legs: z.array(legSchema).min(1).max(4),
    passengers: z.number().int().min(1).max(6),
    cabin: z.enum(["economy", "business"]),
  })
  .superRefine((s, c) => {
    if (s.type === "one-way" && s.legs.length !== 1)
      c.addIssue({
        code: "custom",
        message: "One-way requires one flight.",
        path: ["legs"],
      });
    if (
      s.type === "round-trip" &&
      (s.legs.length !== 2 ||
        s.legs[0].from !== s.legs[1].to ||
        s.legs[0].to !== s.legs[1].from)
    )
      c.addIssue({
        code: "custom",
        message: "Return flight must reverse your route.",
        path: ["legs"],
      });
    if (s.type === "multi-city" && s.legs.length < 2)
      c.addIssue({
        code: "custom",
        message: "Add at least two flights.",
        path: ["legs"],
      });
    s.legs.forEach((l, i) => {
      if (i > 0 && l.date < s.legs[i - 1].date)
        c.addIssue({
          code: "custom",
          message: "Flight dates must be in order.",
          path: ["legs", i, "date"],
        });
    });
  });
export type SearchInput = z.infer<typeof searchSchema>;
export type Flight = {
  id: string;
  from: string;
  to: string;
  date: string;
  airline: string;
  number: string;
  departure: string;
  arrival: string;
  duration: number;
  stops: number;
  via: string | null;
  price: number;
  cabin: "economy" | "business";
  source: "simulated";
  baggage: string;
};
export type InventoryRule = {
  id: string;
  airline: string;
  active: boolean;
  multiplier: number;
};
export const defaultInventory: InventoryRule[] = airlines.map((a) => ({
  id: a.code,
  airline: a.code,
  active: true,
  multiplier: 1,
}));
export interface FlightProvider {
  search(input: SearchInput): Promise<Flight[][]>;
}
function distance(from: string, to: string) {
  const a = airport(from),
    b = airport(to),
    r = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * r) / 2) ** 2 +
    Math.cos(a.lat * r) *
      Math.cos(b.lat * r) *
      Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}
function hash(s: string) {
  return [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
}
export class SeededFlightProvider implements FlightProvider {
  constructor(private inventory: InventoryRule[] = defaultInventory) {}
  async search(input: SearchInput): Promise<Flight[][]> {
    const s = searchSchema.parse(input);
    return s.legs.map((leg) =>
      airlines
        .filter((a) => this.inventory.find((r) => r.airline === a.code)?.active)
        .map((a, i) => {
          const seed = hash(leg.from + leg.to + a.code),
            km = distance(leg.from, leg.to),
            stops =
              i === 0 || km < 1000 || leg.from === a.hub || leg.to === a.hub
                ? 0
                : 1;
          const flownKm = stops
            ? distance(leg.from, a.hub) + distance(a.hub, leg.to)
            : km;
          const duration =
            Math.round(((flownKm / 810) * 60 + 45 + stops * 140) / 5) * 5;
          const departure = new Date(
            `${leg.date}T${String(6 + i * 4 + (seed % 2)).padStart(2, "0")}:30:00Z`,
          ).toISOString();
          const price =
            Math.round(
              ((45000 + km * 82) *
                (1 + i * 0.07) *
                (s.cabin === "business" ? 2.7 : 1) *
                this.inventory.find((r) => r.airline === a.code)!.multiplier) /
                1000,
            ) * 100000;
          return {
            id: `${leg.from}-${leg.to}-${leg.date}-${a.code}-${s.cabin}`,
            ...leg,
            airline: a.code,
            number: `${a.code} ${100 + (seed % 800)}`,
            departure,
            arrival: new Date(
              Date.parse(departure) + duration * 60000,
            ).toISOString(),
            duration,
            stops,
            via: stops ? a.hub : null,
            price,
            cabin: s.cabin,
            source: "simulated",
            baggage: "7 kg cabin bag + 23 kg checked bag",
          };
        }),
    );
  }
}
export function localTime(iso: string, code: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: airport(code).timezone,
  }).format(new Date(iso));
}
export function localDate(iso: string, code: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: airport(code).timezone,
  }).format(new Date(iso));
}
export const durationText = (m: number) => `${Math.floor(m / 60)}h ${m % 60}m`;
export const seatIds = Array.from({ length: 12 }, (_, i) =>
  ["A", "B", "C", "D", "E", "F"].map((c) => `${i + 1}${c}`),
).flat();
export function unavailableSeats(flightId: string) {
  const seed = hash(flightId);
  return seatIds.filter((_, i) => (i + seed) % 11 === 0);
}
export function seatPrice(seat: string) {
  return seat && parseInt(seat) <= 3 ? 1500000 : 0;
}
const person = z.object({
  firstName: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[\p{L} '-]+$/u, "Use letters as shown on your travel document."),
  lastName: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[\p{L} '-]+$/u),
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(
      (d) =>
        !isNaN(Date.parse(d)) &&
        new Date(d).toISOString().slice(0, 10) === d &&
        d <= birthDateLimit(12) &&
        d > birthDateLimit(120),
      "Travellers must be 12 or older.",
    ),
  nationality: z.string().trim().min(2).max(60),
  document: z
    .string()
    .trim()
    .regex(
      /^[A-Za-z0-9]{5,20}$/,
      "Enter a valid passport or national ID number.",
    ),
});
export const bookingSchema = z.object({
  search: searchSchema,
  flightIds: z.array(z.string()).min(1).max(4),
  passengers: z.array(person).min(1).max(6),
  email: z.email(),
  phone: z
    .string()
    .regex(/^\+?[0-9 ()-]{8,20}$/, "Enter a valid phone number."),
  seats: z.array(z.array(z.string())).max(4),
  bags: z.array(z.number().int().min(0).max(2)).min(1).max(6),
  promo: z.string().max(30).default(""),
  idempotencyKey: z.uuid(),
});
export type BookingInput = z.infer<typeof bookingSchema>;
export type PriceBreakdown = {
  fare: number;
  taxes: number;
  seats: number;
  baggage: number;
  discount: number;
  total: number;
  currency: "NGN";
};
export function calculatePrice(
  flights: Flight[],
  count: number,
  seats: string[][],
  bags: number[],
  discountPercent = 0,
): PriceBreakdown {
  const fare = flights.reduce((n, f) => n + f.price, 0) * count;
  const taxes = Math.round(fare * 0.075);
  const seatTotal = seats.flat().reduce((n, s) => n + seatPrice(s), 0);
  const baggage = bags.reduce((n, b) => n + b, 0) * 2500000 * flights.length;
  const discount = Math.round(
    (fare * Math.min(30, Math.max(0, discountPercent))) / 100,
  );
  return {
    fare,
    taxes,
    seats: seatTotal,
    baggage,
    discount,
    total: fare + taxes + seatTotal + baggage - discount,
    currency: "NGN",
  };
}
export async function validateBooking(
  input: unknown,
  provider: FlightProvider,
  discount = 0,
) {
  const data = bookingSchema.parse(input),
    groups = await provider.search(data.search);
  if (
    data.passengers.length !== data.search.passengers ||
    data.bags.length !== data.passengers.length ||
    data.flightIds.length !== groups.length ||
    data.seats.length !== groups.length
  )
    throw new Error("Passenger and flight selections are incomplete.");
  const flights = groups.map((g, i) => {
    const f = g.find((f) => f.id === data.flightIds[i]);
    if (!f)
      throw new Error(
        "A selected flight is no longer available. Search again.",
      );
    return f;
  });
  flights.forEach((f, i) => {
    const seats = data.seats[i];
    if (
      seats.length !== data.passengers.length ||
      new Set(seats).size !== seats.length ||
      seats.some(
        (s) => !seatIds.includes(s) || unavailableSeats(f.id).includes(s),
      )
    )
      throw new Error(
        "Choose a different available seat for every traveller on every flight.",
      );
  });
  for (let i = 1; i < flights.length; i++)
    if (
      Date.parse(flights[i].departure) <
      Date.parse(flights[i - 1].arrival) + 120 * 60000
    )
      throw new Error("Allow at least two hours between your flights.");
  return {
    data,
    flights,
    price: calculatePrice(
      flights,
      data.passengers.length,
      data.seats,
      data.bags,
      discount,
    ),
  };
}

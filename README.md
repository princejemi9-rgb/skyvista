# SkyVista

A Next.js App Router, TypeScript, Tailwind CSS, Supabase and Paystack **test-mode** flight-booking simulation, designed from the supplied SkyVista screenshot.

## Run locally

```powershell
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```

Open http://localhost:3000. The homepage, destination pages, flight search, filters, multi-leg selections, passenger forms, seats, baggage and booking review work without external credentials. Authentication, saved bookings, admin data, and test payments require the services below. They fail closed when unconfigured; there is no fake successful checkout.

## Connect Supabase

1. Create a Supabase project and run `supabase/migrations/001_skyvista.sql` in its SQL editor.
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. Only the URL and anonymous key are public. Never prefix the service-role key with `NEXT_PUBLIC_`.
3. In Authentication URL configuration, set the site URL and allow `http://localhost:3000/auth/callback` and `http://localhost:3000/auth/callback?next=/auth?mode=update` for local development. Add the corresponding HTTPS URLs for deployment.
4. Enable email/password authentication and email confirmation. Configure SMTP for dependable registration and password-reset delivery.
5. Register and verify a customer account. Assign an administrator explicitly in the SQL editor, using that account's UUID:

```sql
update public.profiles set role = 'admin' where id = 'YOUR-AUTH-USER-UUID';
```

Roles are not accepted from registration metadata or exposed as an editable browser field. Customers can update only their name and phone; RLS restricts booking and transaction reads. All booking, content-management and payment mutations run on authorised server routes. Admins can edit customer profiles, cancel pending bookings before checkout, enable/disable airline inventory, adjust fare multipliers, manage destination cards/offers, set a support email and pause new bookings. The admin dashboard currently loads at most 1,000 records per category.

## Connect Paystack test checkout

1. Put an `sk_test_…` secret in `PAYSTACK_SECRET_KEY`. No public Paystack key is required for hosted redirect checkout. Live keys are explicitly rejected.
2. Set `APP_URL` to the exact application origin, such as `http://localhost:3000` or your deployed HTTPS origin.
3. Configure the Paystack test webhook URL as `https://YOUR-HOST/api/payments/webhook`. Local webhook delivery needs an HTTPS tunnel.
4. Save a booking while signed in, then continue to Paystack. Use Paystack-provided **test** payment credentials and methods offered in the hosted checkout.
5. The callback and signed webhook both call Paystack's verification endpoint. Only a successful test-domain transaction with the expected reference, NGN currency, amount and booking metadata can confirm a booking.

One database transaction per booking, unique references, row locks, and an idempotent confirmation function prevent duplicate payment records and repeated confirmation. Retrying an existing checkout reuses its URL. If initialization times out before the authorization URL is saved, the booking stays unconfirmed and a new charge is blocked pending reconciliation. Inspect the original reference in the Paystack test dashboard; do not delete transaction records or initiate another payment blindly. A verified success can always be reconciled through Check payment status or webhook redelivery.

The application stores no card numbers, CVVs or raw Paystack authorization payloads. It stores only transaction identifiers, state, amount and timestamps. No confirmation emails are sent by the application; confirmations are available in the account and as downloadable PDFs.

## Operational payment controls

Run `supabase/migrations/002_admin_payment_control.sql` after the initial migration. It adds payment methods, bank accounts, Bitcoin configuration, manual payments, payment proofs, audit logs, booking/payment status fields, RLS, and the private `payment-proofs` bucket.

The admin dashboard can enable Paystack, Bank Transfer, and Bitcoin; change their customer-facing names, instructions, and display order; manage bank accounts; and configure a public Bitcoin wallet address. It never stores or displays Paystack secret keys, Bitcoin private keys, or seed phrases. Keep `PAYSTACK_SECRET_KEY`, Supabase server-role credentials, and `APP_URL` in `.env.local` only.

Manual transfer and BTC submissions always enter `awaiting_verification`. An administrator must explicitly approve, reject, or request information, and the resulting decision is written to `admin_audit_logs`. Approval changes the booking to `confirmed` with payment status `paid`; it does not claim an airline ticket was issued.

## Architecture

- `src/lib/flights.ts`: airports, deterministic seeded provider, provider interface, search/passenger validation, seat rules and integer-kobo pricing.
- `src/lib/server/content.ts`: inventory and site content from Supabase; seed fallback only when Supabase is unconfigured.
- `src/lib/supabase/`: browser, cookie-aware server and server-only service-role clients.
- `src/proxy.ts`: Supabase auth-cookie refresh. Protected handlers validate users independently.
- `src/app/api/bookings/`: authoritative booking creation and owner-only confirmation PDF.
- `src/lib/server/paystack.ts`: test-key guard, hosted checkout requests, verification and reconciliation.
- `supabase/migrations/001_skyvista.sql`: database schema, RLS, role separation, seed content, serialized checkout and atomic confirmation.
- `src/app/admin/`: protected management interface; every API mutation rechecks admin authorization.

All itinerary inventory is explicitly simulated, including seat maps, airline schedules, baggage rules and fare calculations. Airline logos identify carriers in explicitly simulated results and do not imply affiliation. Flights are deterministic by route, date, airline and cabin; they do not randomly change on refresh. Paid status is never trusted from URL parameters or client state. The review total is checked against the newly calculated server total before saving.

To connect a real flight provider, implement `FlightProvider` and introduce a real offer/repricing and fulfilment lifecycle. Live payments remain disabled in this version. Real fulfilment needs airline offer expiry, reservation/ticket issuance, reconciliation, cancellations/refunds, operational support and updated contractual/privacy terms before a separate release enables live checkout.

## Verification

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd exec playwright install chromium
npm.cmd run test:e2e
```

The browser suite exercises search, filters, round trips/multi-city, passenger forms, seat selection, baggage, offer codes, mobile overflow, navigation and rejection of unauthorised admin/payment requests. Domain tests exercise deterministic inventory, malformed input, pricing, seat validation, and payment-verification invariants. See `VERIFICATION.md` for the actual results from this workspace and the external-service tests still required.

External integration acceptance: verify registration/email confirmation/login/reset; save and reload a booking; complete hosted test checkout; confirm idempotent callback + webhook delivery; compare stored amounts and PDF; try access from a second customer; verify non-admin mutation denial and admin CRUD. Use fictional passenger data for testing. These checks require configured accounts and must not be inferred from unit tests.

## Design assets and reference

Hero: `public/images/hero.png`, generated using built-in imagegen. The prompt is recorded in `IMPLEMENTATION.md`. Destination and window photographs are stored locally from Unsplash image URLs; see `public/images/SOURCES.md`. The review section deliberately contains an honest empty state rather than fabricated testimonials. Unimplemented hotel/car/package tabs and social/newsletter buttons were omitted to keep every displayed control functional.

Implementation references: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [Supabase SSR](https://supabase.com/docs/guides/auth/server-side), [Paystack hosted checkout](https://paystack.com/docs/payments/accept-payments/), [verification](https://paystack.com/docs/payments/verify-payments/), [signed webhooks](https://paystack.com/docs/payments/webhooks/).

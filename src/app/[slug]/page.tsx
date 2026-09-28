import Link from "next/link";
import { notFound } from "next/navigation";
import { getContent } from "@/lib/server/content";
const articles: Record<
  string,
  { title: string; intro: string; sections: [string, string][] }
> = {
  "travel-info": {
    title: "A little preparation. A better journey.",
    intro: "Everything you need to know about planning with SkyVista.",
    sections: [
      [
        "Before you book",
        "Search one way, return, or up to four multi-city flights. All travellers in this simulation must be aged 12 or older. Dates and prices follow a consistent sample schedule; no live airline inventory is offered.",
      ],
      [
        "Baggage made simple",
        "Each fare includes a 7 kg cabin bag and a 23 kg checked bag. You can add up to two extra 23 kg bags per traveller, per flight. The full total appears before checkout. These are simulation allowances, not an airline baggage policy.",
      ],
      [
        "Choosing your seat",
        "Pick a seat for each traveller on each flight. Standard seats are included; the first three rows carry an additional fee. Selection is illustrative and does not reserve an airline seat.",
      ],
      [
        "Times and connections",
        "Flight results display local airport times and arrival dates. Leave at least two hours between selected flights. Check real schedules, transit visas, and entry requirements directly with your airline and destination authorities before actual travel.",
      ],
      [
        "Your booking confirmation",
        "After Paystack verifies a successful test payment, download your test confirmation from your account. It is not valid for travel, airport check-in, or visa applications.",
      ],
    ],
  },
  support: {
    title: "How can we help?",
    intro: "A few straightforward answers to keep your journey moving.",
    sections: [
      [
        "Where can I find my booking?",
        "Sign in and open Manage Booking. You can view every saved journey, its payment status, and the complete itinerary.",
      ],
      [
        "My payment did not finish. What should I do?",
        "Open the saved booking and select Check payment status. If it is still incomplete, reopen the original test checkout. Do not create a second booking to retry the same payment. If checkout preparation was interrupted, contact the site operator for reconciliation.",
      ],
      [
        "Is this a real airline ticket?",
        "No. SkyVista currently operates a booking simulation. All inventory is simulated and Paystack is in test mode. No actual payment, airline reservation, or ticket issuance takes place.",
      ],
      [
        "Can I change or cancel a booking?",
        "Before saving, use the Back and Edit controls to change your itinerary details. Saved bookings are immutable so their price and transaction stay consistent. Contact the site operator to cancel a pending booking before checkout begins. Test payments are not refundable monetary transactions.",
      ],
      [
        "I cannot sign in.",
        "Use Forgot password on the sign-in page. You may need to confirm your email before your first login. If account services have not been connected, you can still search flights and plan a journey.",
      ],
    ],
  },
  reviews: {
    title: "Real travellers. Honest experiences.",
    intro: "Trust should come from real experiences, never invented ones.",
    sections: [
      [
        "Our review promise",
        "We do not display fabricated names, ratings, or testimonials. SkyVista has not published verified customer reviews yet.",
      ],
      [
        "What belongs here",
        "Future reviews will be tied to a verified customer experience, labelled accurately, and published with the customer’s consent. Simulated bookings will never be presented as real airline journeys.",
      ],
    ],
  },
  privacy: {
    title: "Your information, handled thoughtfully.",
    intro:
      "This policy describes the data used by the SkyVista booking simulation.",
    sections: [
      [
        "Information you provide",
        "Accounts store your email, name, and optional phone number. Saved bookings include traveller names, birth dates, nationality, travel document identifiers, contact details, and itinerary choices. Use fictional traveller details when testing; never enter real payment card details.",
      ],
      [
        "Why we use it",
        "We use this information to authenticate your account, validate simulated bookings, calculate prices, and display booking history. Supabase hosts account and booking data. Paystack handles hosted test checkout and transaction verification.",
      ],
      [
        "Payment information",
        "SkyVista does not collect or store raw card details. Payment records contain the test transaction reference, amount, currency, status, and verification time.",
      ],
      [
        "Access and retention",
        "Your booking records are available to your account and authorised administrators. We keep them for the operation and reconciliation of the simulation. Contact the site operator to request correction or deletion of stored information.",
      ],
      [
        "Cookies",
        "Essential authentication cookies maintain your signed-in session. Your browser session temporarily stores the selected itinerary. No advertising or analytics cookies are installed by this application.",
      ],
    ],
  },
  terms: {
    title: "A clear understanding before takeoff.",
    intro: "Terms for using the SkyVista booking simulation.",
    sections: [
      [
        "Simulation only",
        "SkyVista currently provides simulated flight search and booking. Listed flights are illustrative, not live inventory. Saving a booking, choosing a seat, or completing checkout does not reserve travel or issue an airline ticket.",
      ],
      [
        "Test payments",
        "Only Paystack test checkout is enabled. No real monetary payment is collected. A successful test transaction produces a test booking confirmation clearly marked as invalid for travel.",
      ],
      [
        "Pricing and availability",
        "Prices are shown in Nigerian naira. Fare, taxes, baggage, seats, and offer discounts are itemised. Prices are revalidated on the server before a booking is saved. Sample schedules may be updated by an administrator.",
      ],
      [
        "Your responsibilities",
        "Use the service lawfully and provide appropriate test information. Do not upload real identity documents or rely on a simulated booking for travel, check-in, immigration, or visa purposes.",
      ],
      [
        "Changes and cancellations",
        "You can edit details before saving. Saved bookings preserve the itinerary and price at creation. Pending bookings can be cancelled by an administrator before checkout starts. No airline change or refund rights are created by the simulation.",
      ],
    ],
  },
};
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return { title: articles[slug]?.title ?? "Page not found" };
}
export default async function Article({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = articles[slug];
  if (!article) notFound();
  const content = slug === "support" ? await getContent() : null;
  return (
    <div className="container page-shell article">
      <p className="eyebrow blue">
        SKYVISTA · {slug.replaceAll("-", " ").toUpperCase()}
      </p>
      <h1>{article.title}</h1>
      <p>{article.intro}</p>
      {article.sections.map(([title, text]) =>
        slug === "support" ? (
          <details key={title}>
            <summary>{title}</summary>
            <p>{text}</p>
          </details>
        ) : (
          <section key={title}>
            <h2>{title}</h2>
            <p>{text}</p>
          </section>
        ),
      )}
      {slug === "support" && content?.settings.supportEmail && (
        <p style={{ marginTop: 25 }}>
          Need more help?{" "}
          <a
            className="text-link"
            href={`mailto:${content.settings.supportEmail}`}
          >
            {content.settings.supportEmail}
          </a>
        </p>
      )}
      <div className="row" style={{ marginTop: 35 }}>
        <Link href="/flights" className="btn">
          Explore flights
        </Link>
        <Link href="/account" className="text-link">
          Manage your booking →
        </Link>
      </div>
    </div>
  );
}

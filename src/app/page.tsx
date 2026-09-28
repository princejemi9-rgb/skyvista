import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  Plane,
  Globe2,
  BadgePercent,
  Headphones,
  ShieldCheck,
  HeartHandshake,
  Quote,
  Sparkles,
} from "lucide-react";
import { SearchWidget } from "@/components/search";
import { getContent } from "@/lib/server/content";
import { dateAfter } from "@/lib/flights";
const benefits = [
  { icon: ShieldCheck, title: "Secure Booking", text: "Your data is safe with us" },
  { icon: BadgePercent, title: "Transparent Prices", text: "See the full cost upfront" },
  { icon: Headphones, title: "Helpful Support", text: "Answers for every journey" },
  { icon: Globe2, title: "Global Coverage", text: "A world of possibilities" },
];
export default async function Home() {
  const { destinations, offers } = await getContent();
  const offer = offers.find((o) => o.active);
  return (
    <>
      <section className="hero">
        <Image
          src="/images/hero.png"
          alt="SkyVista aircraft above golden clouds"
          fill
          priority
          sizes="100vw"
          className="hero-image"
        />
        <div className="hero-shade" />
        <div className="container hero-content">
          <p className="eyebrow">
            <span /> EXPLORE THE WORLD
          </p>
          <h1>
            Fly Further.
            <br />
            <span>Live Bigger.</span>
          </h1>
          <p className="hero-description">
            Extraordinary places. Unforgettable moments.
            <br />
            Your next great story starts in the sky.
          </p>
          <div className="hero-actions">
            <a className="btn" href="#flight-search">
              Book a Flight <ArrowUpRight size={17} />
            </a>
            <Link className="hero-explore" href="/destinations">
              Explore Destinations <ArrowRight size={16} />
            </Link>
          </div>
          <div className="hero-caption">
            <span /> A world of possibilities awaits
          </div>
        </div>
        <p className="hero-handwriting">
          More than a trip.
          <br />A whole new perspective.
        </p>
      </section>
      <div className="container search-overlap" id="flight-search">
        <SearchWidget />
      </div>
      <div className="container trust-strip">
        {benefits.map((b) => (
          <div key={b.title}>
            <span className="round-icon">
              <b.icon size={21} />
            </span>
            <div>
              <strong>{b.title}</strong>
              <small>{b.text}</small>
            </div>
          </div>
        ))}
      </div>
      <section className="container section" id="destinations">
        <div className="section-heading">
          <div>
            <p className="eyebrow blue">A LITTLE INSPIRATION</p>
              <h2>Popular Destinations</h2>
            <p>
              Iconic cities. Hidden corners. Find a place that speaks to you.
            </p>
          </div>
          <Link className="text-link" href="/destinations">
            View all destinations <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="destination-grid">
          {destinations
            .filter((d) => d.active)
            .slice(0, 5)
            .map((d, i) => (
              <Link
                className="destination-card"
                key={d.id}
                href={`/flights?q=${encodeURIComponent(JSON.stringify({ type: "one-way", legs: [{ from: "LOS", to: d.airport, date: dateAfter(14) }], passengers: 1, cabin: "economy" }))}`}
              >
                <div className="destination-photo">
                  <Image
                    src={d.image}
                    alt={`${d.city} skyline`}
                    fill
                    sizes="(max-width:640px) 70vw, 22vw"
                  />
                  <span className="destination-number">0{i + 1}</span>
                </div>
                <div className="destination-info">
                  <div>
                    <h3>{d.city}</h3>
                    <p>{d.country}</p>
                  </div>
                  <span className="circle-arrow">
                    <ArrowUpRight size={18} />
                  </span>
                </div>
              </Link>
            ))}
        </div>
      </section>
      {offer && (
        <section className="container">
          <div className="offer-banner">
            <div className="offer-copy">
              <p className="eyebrow">A LITTLE MORE REASON TO GO</p>
              <h2>{offer.title}</h2>
              <p>Your next adventure, with a little extra saved.</p>
              <Link className="btn btn-white" href="/offers">
                Explore the offer <ArrowUpRight size={16} />
              </Link>
            </div>
            <div className="window-art">
              <Image
                src="/images/window.jpg"
                alt="A sunset seen through an aircraft window"
                fill
                sizes="400px"
              />
            </div>
            <div className="offer-badge">
              <span>SAVE UP TO</span>
              <strong>
                {offer.discount}
                <small>%</small>
              </strong>
              <span>ON YOUR NEXT JOURNEY</span>
            </div>
          </div>
        </section>
      )}
      <section className="container section why-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow blue">THE SKYVISTA DIFFERENCE</p>
              <h2>Why Choose SkyVista?</h2>
            <p>Thoughtful details. Less hassle. More looking forward.</p>
          </div>
          <Plane className="heading-plane" size={42} strokeWidth={1} />
        </div>
        <div className="why-grid">
          {[
            {
              icon: Globe2,
              title: "Your world, connected",
              text: "Discover inspiring destinations and routes that bring you closer.",
            },
            {
              icon: BadgePercent,
              title: "Good fares. No surprises.",
              text: "Clear price breakdowns, so you know exactly what to expect.",
            },
            {
              icon: Headphones,
              title: "Here when you need us",
              text: "Straightforward travel guidance at every step of your journey.",
            },
            {
              icon: HeartHandshake,
              title: "Made around you",
              text: "Your seat, your baggage, your journey. Make it feel like yours.",
            },
          ].map((b) => (
            <div className="why-card" key={b.title}>
              <span className="round-icon">
                <b.icon size={24} />
              </span>
              <h3>{b.title}</h3>
              <p>{b.text}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="reviews-section">
        <div className="container reviews-inner">
          <div>
            <p className="eyebrow blue">YOUR JOURNEY MATTERS</p>
            <h2>
              Great journeys make
              <br />
              great stories.
            </h2>
            <p>
              We’re just getting started. Your experience
              <br />
              will help shape where we go next.
            </p>
            <Link className="text-link" href="/reviews">
              Our approach to reviews <ArrowRight size={16} />
            </Link>
          </div>
          <div className="review-note">
            <Quote size={36} />
            <p>
              Real travellers.
              <br />
              Honest experiences.
              <br />
              <span>Always.</span>
            </p>
            <div>
              <Sparkles size={17} />
              <span>Verified customer stories will appear here.</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

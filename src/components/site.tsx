"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Plane,
  Menu,
  X,
  ArrowUpRight,
  ShieldCheck,
  Globe2,
  Headphones,
  BadgePercent,
  UserRound,
} from "lucide-react";
export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="SkyVista home">
      <span className="logo-mark">
        <Plane size={31} strokeWidth={1.7} />
        <i />
      </span>
      <span>
        SkyVista<small>Fly Beyond Boundaries</small>
      </span>
    </Link>
  );
}
export function Header({
  account,
}: {
  account?: { name: string; isAdmin: boolean };
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className={`site-header ${path === "/" ? "over-hero" : ""}`}>
      <div className="container header-inner">
        <Logo />
        <button
          className="mobile-toggle"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
        <nav className={open ? "open" : ""} aria-label="Main navigation">
          {[
            ["Home", "/"],
            ["Flights", "/flights"],
            ["Manage Booking", "/account"],
            ["Travel Info", "/travel-info"],
            ["Support", "/support"],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={path === href ? "active" : ""}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="header-account">
          <span className="currency">
            <Globe2 size={14} /> NGN
          </span>
          {account ? (
            <Link href="/account" className="account-link" onClick={() => setOpen(false)}>
              <UserRound size={16} />
              <span>{account.name}</span>
            </Link>
          ) : (
            <>
              <Link href="/auth?mode=login" className="login-link">
                Log in
              </Link>
              <Link href="/auth?mode=signup" className="btn btn-small">
                Sign up <ArrowUpRight size={14} />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
export const benefits = [
  {
    icon: ShieldCheck,
    title: "Secure Booking",
    text: "Your data is safe with us",
  },
  {
    icon: BadgePercent,
    title: "Transparent Prices",
    text: "See the full cost upfront",
  },
  {
    icon: Headphones,
    title: "Helpful Support",
    text: "Answers for every journey",
  },
  { icon: Globe2, title: "Global Coverage", text: "A world of possibilities" },
];
export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <Logo />
          <p>
            Connecting you to places and possibilities.
            <br />
            Fly with confidence. Travel with inspiration.
          </p>
        </div>
        <div>
          <h3>Explore</h3>
          <Link href="/flights">Find a flight</Link>
          <Link href="/destinations">Our destinations</Link>
          <Link href="/offers">Special offers</Link>
          <Link href="/account">Your bookings</Link>
        </div>
        <div>
          <h3>Here to help</h3>
          <Link href="/support">Help centre</Link>
          <Link href="/travel-info">Travel information</Link>
          <Link href="/terms">Terms & conditions</Link>
          <Link href="/privacy">Privacy policy</Link>
        </div>
        <div className="footer-journey">
          <h3>Your next chapter starts here.</h3>
          <p>
            A new city. A familiar face.
            <br />A little more of the world.
          </p>
          <Link href="/flights">
            Find your next flight <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} SkyVista. All rights reserved.</span>
        <span>
          <ShieldCheck size={13} /> Secure checkout powered by Paystack
        </span>
      </div>
    </footer>
  );
}
export function Notice({ children }: { children?: React.ReactNode }) {
  return (
    <div className="notice">
      <ShieldCheck size={19} />
      <p>
        {children ??
          "These flights use simulated inventory. No airline seat will be reserved and no ticket will be issued. Checkout uses Paystack test mode only."}
      </p>
    </div>
  );
}

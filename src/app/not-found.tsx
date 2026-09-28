import Link from "next/link";
export default function NotFound() {
  return (
    <div className="container page-shell">
      <p className="eyebrow blue">404 · A SMALL DETOUR</p>
      <h1>This destination isn’t on the map.</h1>
      <Link href="/" className="btn">
        Back to home
      </Link>
    </div>
  );
}

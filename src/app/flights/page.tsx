import { Suspense } from "react";
import { Results } from "./results";
export const metadata = { title: "Find your flight" };
export default function Flights() {
  return (
    <Suspense
      fallback={
        <div className="container page-shell">Loading flight search…</div>
      }
    >
      <Results />
    </Suspense>
  );
}

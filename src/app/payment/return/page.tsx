import { Suspense } from "react";
import { VerifyPayment } from "./verify";
export default function PaymentReturn() {
  return (
    <Suspense
      fallback={<div className="container page-shell">Checking payment…</div>}
    >
      <VerifyPayment />
    </Suspense>
  );
}

import "server-only";
import { assertTestPayment, type VerifiedPayment } from "@/lib/payments";
import { serviceClient } from "@/lib/supabase/server";
export function paystackKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("Test checkout is not configured.");
  if (!key.startsWith("sk_test_"))
    throw new Error(
      "Only Paystack test keys are permitted. Live payments are disabled.",
    );
  return key;
}
export async function paystack<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(`https://api.paystack.co${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${paystackKey()}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  const data = await r.json();
  if (!r.ok || !data.status)
    throw new Error(
      "Paystack could not complete this request. Please check the payment status before trying again.",
    );
  return data.data as T;
}
export async function verifyTransaction(reference: string) {
  if (!/^SVT-[a-f0-9-]{36}$/.test(reference))
    throw new Error("Invalid payment reference.");
  const db = serviceClient();
  const { data: t, error } = await db
    .from("transactions")
    .select("*")
    .eq("reference", reference)
    .single();
  if (error || !t) throw new Error("Payment record not found.");
  const payment = await paystack<VerifiedPayment>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
  );
  if (["failed", "abandoned", "reversed"].includes(payment.status)) {
    await db
      .from("transactions")
      .update({ status: "failed" })
      .eq("id", t.id)
      .neq("status", "success");
    throw new Error(
      "Payment was not completed. You can reopen the original checkout from your booking.",
    );
  }
  assertTestPayment(payment, {
    reference: t.reference,
    amount: t.amount,
    bookingId: t.booking_id,
  });
  const { data: id, error: confirmError } = await db.rpc(
    "confirm_test_payment",
    {
      p_reference: reference,
      p_amount: payment.amount,
      p_currency: payment.currency,
      p_provider_id: String(payment.id),
    },
  );
  if (confirmError)
    throw new Error(
      "Payment could not be recorded. Please check again shortly.",
    );
  return id as string;
}

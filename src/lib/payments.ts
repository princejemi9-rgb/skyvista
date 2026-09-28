export type VerifiedPayment = {
  status: string;
  reference: string;
  amount: number;
  currency: string;
  domain: string;
  id: number | string;
  customer?: { email?: string };
  metadata?: { booking_id?: string };
};
export function assertTestPayment(
  data: VerifiedPayment,
  expected: { reference: string; amount: number; bookingId: string },
) {
  if (data.status !== "success")
    throw new Error("Payment has not completed successfully.");
  if (data.domain !== "test")
    throw new Error("Live transactions are not accepted.");
  if (
    data.reference !== expected.reference ||
    data.amount !== expected.amount ||
    data.currency !== "NGN" ||
    data.metadata?.booking_id !== expected.bookingId
  )
    throw new Error("Payment details do not match this booking.");
}

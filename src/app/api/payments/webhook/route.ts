import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { paystackKey, verifyTransaction } from "@/lib/server/paystack";
export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > 100000)
      return new NextResponse("Payload too large", { status: 413 });
    const signature = request.headers.get("x-paystack-signature") ?? "";
    if (!/^[a-f0-9]{128}$/i.test(signature))
      return new NextResponse("Invalid signature", { status: 401 });
    const expected = createHmac("sha512", paystackKey()).update(raw).digest();
    if (!timingSafeEqual(expected, Buffer.from(signature, "hex")))
      return new NextResponse("Invalid signature", { status: 401 });
    const event = JSON.parse(raw);
    if (event.event === "charge.success") {
      if (event.data?.domain !== "test")
        return new NextResponse("Live payments disabled", { status: 400 });
      await verifyTransaction(event.data.reference);
    }
    return NextResponse.json({ received: true });
  } catch {
    return new NextResponse("Webhook processing failed; retry required", {
      status: 500,
    });
  }
}

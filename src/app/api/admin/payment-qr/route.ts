import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { z } from "zod";
import { requireAdmin, serviceClient } from "@/lib/supabase/server";
import { checkOrigin, errorResponse } from "@/lib/server/http";

const input = z.object({ walletId: z.uuid() });

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const walletId = z.uuid().parse(new URL(request.url).searchParams.get("walletId"));
    const db = serviceClient();
    const { data: wallet } = await db.from("bitcoin_wallets").select("qr_path").eq("id", walletId).single();
    if (!wallet?.qr_path) return NextResponse.json({ url: null });
    const { data, error } = await db.storage.from("payment-qr").createSignedUrl(wallet.qr_path, 300);
    if (error) throw new Error("QR preview is unavailable.");
    return NextResponse.json({ url: data.signedUrl });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { user } = await requireAdmin();
    const { walletId } = input.parse(await request.json());
    const db = serviceClient();
    const { data: wallet } = await db.from("bitcoin_wallets").select("id,wallet_address,network").eq("id", walletId).single();
    if (!wallet) throw new Error("Bitcoin wallet was not found.");
    const svg = await QRCode.toString(`bitcoin:${wallet.wallet_address}`, { type: "svg", margin: 1, width: 360, errorCorrectionLevel: "M" });
    const path = `bitcoin/${wallet.id}.svg`;
    const { error: uploadError } = await db.storage.from("payment-qr").upload(path, svg, { contentType: "image/svg+xml", upsert: true });
    if (uploadError) throw new Error("QR code could not be stored.");
    const { error } = await db.from("bitcoin_wallets").update({ qr_path: path, updated_at: new Date().toISOString(), updated_by: user.id }).eq("id", wallet.id);
    if (error) throw new Error("QR code could not be attached to the wallet.");
    await db.from("admin_audit_logs").insert({ admin_id: user.id, action: "bitcoin_qr_generated", entity_type: "bitcoin_wallet", entity_id: wallet.id, detail: { network: wallet.network } });
    return NextResponse.json({ saved: true });
  } catch (error) { return errorResponse(error); }
}

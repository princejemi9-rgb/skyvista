import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, serviceClient } from "@/lib/supabase/server";
import { checkOrigin, errorResponse } from "@/lib/server/http";
import { airports } from "@/lib/flights";
const schemas = {
  inventory: z
    .object({
      id: z.enum(["BA", "EK", "QR", "TK"]),
      airline: z.enum(["BA", "EK", "QR", "TK"]),
      active: z.boolean(),
      multiplier: z.number().min(0.5).max(3),
    })
    .refine((v) => v.id === v.airline),
  destinations: z.object({
    id: z.string().regex(/^[a-z0-9-]{2,40}$/),
    city: z.string().min(2).max(60),
    country: z.string().min(2).max(60),
    airport: z.string().refine((v) => airports.some((a) => a.code === v)),
    image: z.enum([
      "/images/new-york.jpg",
      "/images/london.jpg",
      "/images/dubai.jpg",
      "/images/paris.jpg",
      "/images/istanbul.jpg",
    ]),
    active: z.boolean(),
  }),
  offers: z.object({
    id: z.string().regex(/^[a-z0-9-]{2,40}$/),
    title: z.string().min(2).max(70),
    code: z.string().regex(/^[A-Z0-9]{3,20}$/),
    discount: z.number().int().min(1).max(30),
    active: z.boolean(),
  }),
  settings: z.object({
    id: z.literal("website"),
    value: z.object({
      brand: z.literal("SkyVista"),
      tagline: z.string().max(100),
      supportEmail: z.union([z.email(), z.literal("")]),
      bookingEnabled: z.boolean(),
    }),
  }),
  profiles: z.object({
    id: z.uuid(),
    full_name: z.string().min(2).max(100),
    phone: z.string().max(25),
    country: z.string().max(100),
  }),
  payment_methods: z.object({id:z.enum(["paystack","bank_transfer","bitcoin"]),display_name:z.string().min(2).max(60),enabled:z.boolean(),instructions:z.string().max(3000),display_order:z.number().int().min(0).max(100)}),
  bank_accounts: z.object({id:z.uuid().optional(),bank_name:z.string().min(2).max(120),account_name:z.string().min(2).max(120),account_number:z.string().regex(/^[A-Za-z0-9 -]{5,40}$/),currency:z.string().regex(/^[A-Z]{3}$/),routing_information:z.string().max(240),instructions:z.string().max(3000),enabled:z.boolean(),display_order:z.number().int().min(0).max(100)}),
  crypto_payment_settings: z.object({id:z.literal("bitcoin"),display_name:z.string().min(2).max(60),wallet_address:z.string().max(200),network:z.string().min(2).max(80),instructions:z.string().max(3000)}),
  bitcoin_wallets: z.object({id:z.uuid().optional(),display_name:z.string().min(2).max(60),wallet_address:z.string().min(8).max(200),network:z.string().min(2).max(80),instructions:z.string().max(3000),qr_path:z.string().max(300).nullable().optional(),enabled:z.boolean(),display_order:z.number().int().min(0).max(100)}),
};
export async function GET() {
  try {
    const { user } = await requireAdmin();
    const db = serviceClient();
    const tables = [
      "profiles",
      "bookings",
      "transactions",
      "inventory",
      "destinations",
      "offers",
      "settings",
      "payment_methods",
      "bank_accounts",
      "crypto_payment_settings",
      "bitcoin_wallets",
      "payments",
      "payment_proofs",
      "admin_audit_logs",
    ] as const;
    const result = await Promise.all(
      tables.map(async (table) => {
        const { data, error } = await db.from(table).select("*").limit(1000);
        if (error) throw new Error("Unable to load admin data.");
        return [table, data];
      }),
    );
    return NextResponse.json(Object.fromEntries(result));
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { user } = await requireAdmin();
    const body = z
      .object({
        table: z.enum([
          "inventory",
          "destinations",
          "offers",
          "settings",
          "profiles",
          "bookings",
          "payment_methods",
          "bank_accounts",
          "crypto_payment_settings",
          "bitcoin_wallets",
        ]),
        record: z.unknown(),
      })
      .parse(await request.json());
    const db = serviceClient();
    if (body.table === "bookings") {
      const { id } = z.object({ id: z.uuid() }).parse(body.record);
      const { error } = await db.rpc("cancel_unpaid_booking", { p_id: id });
      if (error) throw new Error(error.message);
      return NextResponse.json({ saved: true });
    }
    const record = schemas[body.table as keyof typeof schemas].parse(body.record);
    const result =
      body.table === "profiles"
        ? await db
            .from("profiles")
            .update({
              full_name: (record as { full_name: string }).full_name,
              phone: (record as { phone: string }).phone,
              country: (record as { country: string }).country,
            })
            .eq("id", record.id)
        : body.table === "payment_methods" ||
            body.table === "bank_accounts" ||
            body.table === "crypto_payment_settings" ||
            body.table === "bitcoin_wallets"
          ? await db.from(body.table).upsert({
              ...record,
              updated_at: new Date().toISOString(),
              updated_by: user.id,
            })
          : body.table === "settings"
            ? await db
                .from("settings")
                .upsert({ ...record, updated_at: new Date().toISOString() })
            : await db.from(body.table).upsert(record as never);
    if (result.error)
      throw new Error(
        "Changes could not be saved. Check for a duplicate code or missing fields.",
      );
    await db.from("admin_audit_logs").insert({admin_id:user.id,action:"admin_settings_updated",entity_type:body.table,entity_id:String((record as {id?:string}).id??"new"),detail:{}});
    return NextResponse.json({ saved: true });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(request: Request) {
  try {
    checkOrigin(request);
    const { user } = await requireAdmin();
    const body = z
      .object({ table: z.enum(["bank_accounts", "bitcoin_wallets"]), id: z.uuid() })
      .parse(await request.json());
    const db = serviceClient();
    const { error } = await db.from(body.table).delete().eq("id", body.id);
    if (error) throw new Error("This payment setting could not be removed.");
    await db.from("admin_audit_logs").insert({
      admin_id: user.id,
      action: "payment_setting_removed",
      entity_type: body.table,
      entity_id: body.id,
      detail: {},
    });
    return NextResponse.json({ deleted: true });
  } catch (e) {
    return errorResponse(e);
  }
}

import "server-only";
import { connection } from "next/server";
import {
  destinations,
  offers,
  defaultSettings,
  type Destination,
  type Offer,
  type Settings,
} from "@/lib/content";
import {
  defaultInventory,
  type InventoryRule,
  SeededFlightProvider,
} from "@/lib/flights";
import { isConfigured, serverClient } from "@/lib/supabase/server";
export async function getContent() {
  await connection();
  if (!isConfigured())
    return { destinations, offers, settings: defaultSettings };
  const db = await serverClient();
  const [d, o, s] = await Promise.all([
    db.from("destinations").select("*").eq("active", true).order("id"),
    db.from("offers").select("*").eq("active", true),
    db.from("settings").select("value").eq("id", "website").single(),
  ]);
  if (d.error || o.error || s.error)
    throw new Error("Unable to load website content.");
  return {
    destinations: d.data as Destination[],
    offers: o.data as Offer[],
    settings: s.data.value as Settings,
  };
}
export async function getProvider() {
  if (!isConfigured()) return new SeededFlightProvider(defaultInventory);
  const db = await serverClient();
  const { data, error } = await db.from("inventory").select("*");
  if (error) throw new Error("Flight search is temporarily unavailable.");
  return new SeededFlightProvider(data as InventoryRule[]);
}

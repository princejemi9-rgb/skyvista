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
  try {
    const db = await serverClient();
    const [d, o, s] = await Promise.all([
      db.from("destinations").select("*").eq("active", true).order("id"),
      db.from("offers").select("*").eq("active", true),
      db.from("settings").select("value").eq("id", "website").single(),
    ]);
    if (d.error || o.error || s.error || !s.data) {
      throw new Error("Public website content is unavailable.");
    }
    return {
      destinations: d.data as Destination[],
      offers: o.data as Offer[],
      settings: s.data.value as Settings,
    };
  } catch (error) {
    console.error("SkyVista public content fallback", error);
    return { destinations, offers, settings: defaultSettings };
  }
}
export async function getProvider() {
  if (!isConfigured()) return new SeededFlightProvider(defaultInventory);
  try {
    const db = await serverClient();
    const { data, error } = await db.from("inventory").select("*");
    if (error || !data) throw new Error("Flight inventory is unavailable.");
    return new SeededFlightProvider(data as InventoryRule[]);
  } catch (error) {
    console.error("SkyVista inventory fallback", error);
    return new SeededFlightProvider(defaultInventory);
  }
}

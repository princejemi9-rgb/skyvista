import { NextResponse } from "next/server";
import { searchSchema } from "@/lib/flights";
import { getProvider } from "@/lib/server/content";
import { errorResponse } from "@/lib/server/http";
export async function POST(request: Request) {
  try {
    const input = searchSchema.parse(await request.json());
    return NextResponse.json({
      flights: await (await getProvider()).search(input),
      source: "simulated",
    });
  } catch (e) {
    return errorResponse(e);
  }
}

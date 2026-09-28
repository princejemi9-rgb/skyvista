import { NextResponse } from "next/server";
import { z } from "zod";
import { getContent } from "@/lib/server/content";
import { errorResponse } from "@/lib/server/http";
export async function POST(request: Request) {
  try {
    const { code } = z
      .object({ code: z.string().max(30) })
      .parse(await request.json());
    const offer = (await getContent()).offers.find(
      (o) => o.active && o.code === code.toUpperCase(),
    );
    if (!offer) throw new Error("This offer code is not available.");
    return NextResponse.json({ discount: offer.discount });
  } catch (e) {
    return errorResponse(e);
  }
}

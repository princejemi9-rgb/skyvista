import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
export function errorResponse(e: unknown) {
  const message =
    e instanceof ZodError
      ? e.issues[0]?.message
      : e instanceof Error
        ? e.message
        : "Request could not be completed.";
  const status = message?.includes("Sign in")
    ? 401
    : message?.includes("Administrator")
      ? 403
      : message?.includes("not configured")
        ? 503
        : 400;
  return NextResponse.json({ error: message }, { status });
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_URL ?? new URL(request.url).origin;
  if (!origin || origin !== new URL(expected).origin)
    throw new Error("Invalid request origin.");
}

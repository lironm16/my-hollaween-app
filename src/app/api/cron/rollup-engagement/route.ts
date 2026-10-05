import { NextResponse } from "next/server";
import { rollupActivitySessions } from "@/lib/engagement-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Cron hits a public URL — allow Vercel cron, optional CRON_SECRET, or local dev. */
function authorized(request: Request) {
  if (process.env.NODE_ENV !== "production") return true;
  if (request.headers.get("x-vercel-cron") === "1") return true;
  const secret = process.env.CRON_SECRET?.trim();
  if (secret && request.headers.get("authorization") === `Bearer ${secret}`) return true;
  return false;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await rollupActivitySessions();
  return NextResponse.json({ ok: true, ...result });
}

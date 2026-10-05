import { NextResponse } from "next/server";
import { normalizeDeviceId } from "@/lib/device-id";
import {
  appendActivitySessionEvents,
  isCommunityEngagementEnabled,
} from "@/lib/engagement-store";
import type { EngagementEvent } from "@/lib/house-engagement";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET() {
  const enabled = await isCommunityEngagementEnabled();
  return NextResponse.json({ enabled }, { headers: NO_STORE });
}

export async function POST(request: Request) {
  if (!(await isCommunityEngagementEnabled())) {
    return NextResponse.json({ ok: false, disabled: true }, { headers: NO_STORE });
  }
  if (!rateLimit(`activity:${clientKey(request.headers)}`, 24, 60 * 1000)) {
    return NextResponse.json({ error: "יותר מדי עדכונים." }, { status: 429, headers: NO_STORE });
  }
  const deviceId = normalizeDeviceId(request.headers.get("x-hw-device-id"));
  if (!deviceId) {
    return NextResponse.json({ error: "חסר מזהה מכשיר." }, { status: 400, headers: NO_STORE });
  }
  const json = (await request.json().catch(() => null)) as { events?: EngagementEvent[] } | null;
  const events = Array.isArray(json?.events) ? json.events : [];
  await appendActivitySessionEvents(deviceId, events);
  return NextResponse.json({ ok: true, queued: events.length }, { headers: NO_STORE });
}

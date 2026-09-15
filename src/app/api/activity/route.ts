import { NextResponse } from "next/server";
import {
  activityBackendEnabled,
  getActivityTotals,
  reportDeviceActivity,
} from "@/lib/activity-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function activityDisabled() {
  return !activityBackendEnabled();
}

const disabledTotals = {
  totalLiked: 0,
  totalVisited: 0,
  devicesReporting: 0,
  disabled: true,
};

export async function GET() {
  if (activityDisabled()) {
    return NextResponse.json(disabledTotals, {
      headers: { "Cache-Control": "no-store" },
    });
  }
  const totals = await getActivityTotals();
  return NextResponse.json(totals, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  if (activityDisabled()) {
    return NextResponse.json(disabledTotals, {
      headers: { "Cache-Control": "no-store" },
    });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const deviceId =
    (typeof payload.deviceId === "string" ? payload.deviceId : "") ||
    request.headers.get("x-hw-device-id")?.trim() ||
    "";
  const totals = await reportDeviceActivity(
    deviceId,
    payload.likedCount as number,
    payload.visitedCount as number,
  );
  return NextResponse.json(totals, {
    headers: { "Cache-Control": "no-store" },
  });
}

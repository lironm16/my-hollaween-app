import { NextResponse } from "next/server";
import { firestoreConfigured, resolveAdminFirestore } from "@/lib/firestore-admin";
import { PRESENCE_COLLECTION, PRESENCE_WINDOW_MS, type PresenceSummary } from "@/lib/presence";

export const runtime = "nodejs";

function sessionIdFromRequest(req: Request) {
  const header = req.headers.get("x-hw-session")?.trim();
  if (header && header.length >= 8 && header.length <= 64) return header;
  return null;
}

export async function GET() {
  if (!firestoreConfigured()) {
    return NextResponse.json({ active: null, windowMinutes: PRESENCE_WINDOW_MS / 60_000 });
  }
  try {
    const db = await resolveAdminFirestore();
    const since = Date.now() - PRESENCE_WINDOW_MS;
    const snap = await db
      .collection(PRESENCE_COLLECTION)
      .where("lastSeen", ">=", since)
      .count()
      .get();
    const body: PresenceSummary = {
      active: snap.data().count,
      windowMinutes: PRESENCE_WINDOW_MS / 60_000,
    };
    return NextResponse.json(body, {
      headers: { "Cache-Control": "private, max-age=30" },
    });
  } catch {
    return NextResponse.json({ active: null, windowMinutes: PRESENCE_WINDOW_MS / 60_000 });
  }
}

export async function POST(req: Request) {
  const sessionId = sessionIdFromRequest(req);
  if (!sessionId) {
    return NextResponse.json({ ok: false, error: "missing session" }, { status: 400 });
  }
  if (!firestoreConfigured()) {
    return NextResponse.json({ ok: true, tracked: false });
  }
  try {
    const db = await resolveAdminFirestore();
    await db.collection(PRESENCE_COLLECTION).doc(sessionId).set(
      { lastSeen: Date.now() },
      { merge: true },
    );
    return NextResponse.json({ ok: true, tracked: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

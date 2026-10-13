import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { readNightPassSettings, writeNightPassSettings } from "@/lib/night-pass-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הרשאת מנהל." }, { status: 401, headers: NO_STORE });
  }
  return NextResponse.json(await readNightPassSettings(), { headers: NO_STORE });
}

export async function PUT(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הרשאת מנהל." }, { status: 401, headers: NO_STORE });
  }
  const json = (await request.json().catch(() => null)) as { enabled?: unknown } | null;
  if (typeof json?.enabled !== "boolean") {
    return NextResponse.json({ error: "חסר enabled." }, { status: 400, headers: NO_STORE });
  }
  try {
    const settings = await writeNightPassSettings({ enabled: json.enabled });
    return NextResponse.json({ ok: true, ...settings }, { headers: NO_STORE });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "";
    return NextResponse.json(
      { error: detail ? `השמירה נכשלה: ${detail}` : "השמירה נכשלה." },
      { status: 500, headers: NO_STORE },
    );
  }
}

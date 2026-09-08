import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { PUSH_KINDS, type PushKind, type StoredPushSettings } from "@/lib/push-templates";
import { getPushTemplateList, savePushTemplates } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הרשאת מנהל." }, { status: 401, headers: NO_STORE });
  }
  const templates = await getPushTemplateList();
  return NextResponse.json({ templates }, { headers: NO_STORE });
}

export async function PUT(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הרשאת מנהל." }, { status: 401, headers: NO_STORE });
  }
  const json = (await request.json().catch(() => null)) as {
    templates?: Array<{ id?: string; enabled?: boolean; title?: string; body?: string }>;
  } | null;
  const incoming: StoredPushSettings = { templates: {} };
  for (const row of json?.templates ?? []) {
    if (!PUSH_KINDS.includes(row.id as PushKind)) continue;
    incoming.templates![row.id as PushKind] = {
      enabled: row.enabled !== false,
      title: (row.title ?? "").slice(0, 80),
      body: (row.body ?? "").slice(0, 280),
    };
  }
  if (!incoming.templates || Object.keys(incoming.templates).length === 0) {
    return NextResponse.json({ error: "אין תבניות לשמירה." }, { status: 400, headers: NO_STORE });
  }
  const templates = await savePushTemplates(incoming);
  return NextResponse.json({ ok: true, templates }, { headers: NO_STORE });
}

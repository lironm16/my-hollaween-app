import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { PUSH_KINDS, type PushKind, type StoredPushSettings } from "@/lib/push-templates";
import { getPushTemplateList, savePushTemplates } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הרשאת מנהל." }, { status: 401 });
  }
  const templates = await getPushTemplateList();
  return NextResponse.json({ templates });
}

export async function PUT(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הרשאת מנהל." }, { status: 401 });
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
  const templates = await savePushTemplates(incoming);
  return NextResponse.json({ ok: true, templates });
}

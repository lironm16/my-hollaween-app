import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { PUSH_KINDS, type PushKind } from "@/lib/push-templates";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { notifyHouseKind } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const json = (await request.json().catch(() => null)) as {
    editCode?: string;
    kind?: string;
  } | null;
  const kind = json?.kind as PushKind | undefined;
  if (!kind || !PUSH_KINDS.includes(kind)) {
    return NextResponse.json({ error: "סוג התראה לא מוכר." }, { status: 400 });
  }
  const admin = await isAdmin();
  if (!admin && !json?.editCode) {
    return NextResponse.json({ error: "נדרש קוד עריכה." }, { status: 401 });
  }
  if (!rateLimit(`house-notify:${id}:${clientKey(request.headers)}`, 8, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "יותר מדי שליחות. המתינו כמה דקות." }, { status: 429 });
  }
  const result = await notifyHouseKind({
    id,
    kind,
    editCode: json?.editCode,
    admin,
  });
  if ("error" in result) {
    const status =
      result.error === "forbidden" || result.error === "missing"
        ? 403
        : result.error === "auto"
          ? 400
          : 409;
    const message =
      result.error === "disabled"
        ? "סוג ההתראה כבוי אצל המנהלים."
        : result.error === "mismatch"
          ? "מצב הבית כבר לא מתאים להתראה הזו."
          : result.error === "auto"
            ? "התראה זו נשלחת אוטומטית."
            : "לא הצלחנו לשלוח.";
    return NextResponse.json({ error: message }, { status });
  }
  return NextResponse.json(result);
}

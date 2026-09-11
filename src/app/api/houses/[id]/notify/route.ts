import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { PUSH_KINDS, type PushKind } from "@/lib/push-templates";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { notifyHouseKind } from "@/lib/store";
import { canonicalHouseId } from "@/lib/ids";
import { ownerMayEdit } from "@/lib/owner-session";
import { readIncludeEndpoint } from "@/lib/push";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await context.params;
  const id = canonicalHouseId(rawId);
  const json = (await request.json().catch(() => null)) as {
    editCode?: string;
    kind?: string;
  } | null;
  const kind = json?.kind as PushKind | undefined;
  if (!kind || !PUSH_KINDS.includes(kind)) {
    return NextResponse.json({ error: "סוג התראה לא מוכר." }, { status: 400 });
  }
  const admin = await isAdmin();
  const ownerOk = await ownerMayEdit(id);
  if (!admin && !ownerOk && !json?.editCode) {
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
    ownerSession: ownerOk,
    includeEndpoint: readIncludeEndpoint(json),
  });
  if ("error" in result) {
    const status =
      result.error === "missing"
        ? 404
        : result.error === "forbidden"
          ? 403
          : result.error === "auto"
            ? 400
            : 409;
    const message =
      result.error === "mapOnly"
        ? "עדכוני בית בלילה מופיעים במפה בלבד — לא נשלחים כהתראה."
        : result.error === "disabled"
        ? "סוג ההתראה כבוי אצל המנהלים."
        : result.error === "mismatch"
          ? "מצב הבית כבר לא מתאים להתראה הזו."
          : result.error === "auto"
            ? "התראה זו נשלחת אוטומטית."
            : result.error === "missing"
              ? "הבית לא נמצא."
              : result.error === "forbidden"
                ? "קוד העריכה שגוי."
                : "לא הצלחנו לשלוח.";
    return NextResponse.json({ error: message }, { status });
  }
  return NextResponse.json(result);
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin";
import { HOUSE_ANOMALY_KINDS } from "@/lib/types";
import { saveHouseAnomalyReview } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

const bodySchema = z.object({
  houseId: z.string().min(1),
  kind: z.enum(HOUSE_ANOMALY_KINDS),
  status: z.enum(["fixed", "not_an_issue"]),
  note: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הרשאת מנהל." }, { status: 401, headers: NO_STORE });
  }
  const json = (await request.json().catch(() => null)) as unknown;
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 400, headers: NO_STORE });
  }
  const result = await saveHouseAnomalyReview(parsed.data);
  if ("error" in result) {
    return NextResponse.json({ error: "הבית לא נמצא." }, { status: 404, headers: NO_STORE });
  }
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}

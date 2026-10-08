import { NextResponse } from "next/server";
import { helpRequestSubmitSchema } from "@/lib/help-request-schema";
import { helpRequestPublicId } from "@/lib/help-request-format";
import { helpRequestDeliveryConfigured, persistHelpRequest } from "@/lib/help-request-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!helpRequestDeliveryConfigured()) {
    return NextResponse.json(
      {
        error: "טופס העזרה עדיין לא מחובר בשרת. פנו למנהל האירוע.",
        code: "NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "גוף הבקשה אינו תקין." }, { status: 400 });
  }

  const parsed = helpRequestSubmitSchema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "בדקו את השדות.";
    return NextResponse.json({ error: first, code: "VALIDATION" }, { status: 400 });
  }

  if (parsed.data.company) {
    return NextResponse.json({ ok: true, ticket: "ok" });
  }

  try {
    const record = await persistHelpRequest(parsed.data);
    return NextResponse.json({
      ok: true,
      ticket: helpRequestPublicId(record.id),
      createdAt: record.createdAt,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "HELP_REQUEST_NOT_CONFIGURED") {
      return NextResponse.json(
        { error: "טופס העזרה לא מוגדר (חסר HELP_REQUEST_NOTIFY_EMAIL).", code: "NOT_CONFIGURED" },
        { status: 503 },
      );
    }
    if (error instanceof Error && error.message === "HELP_REQUEST_EMAIL_FAILED") {
      return NextResponse.json(
        { error: "לא הצלחנו לשלוח מייל. נסו שוב בעוד רגע.", code: "EMAIL_FAILED" },
        { status: 502 },
      );
    }
    console.error("[help-request] persist failed", error);
    return NextResponse.json(
      { error: "לא הצלחנו לשלוח את הפנייה. נסו שוב.", code: "UNKNOWN" },
      { status: 500 },
    );
  }
}

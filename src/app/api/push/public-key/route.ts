import { NextResponse } from "next/server";
import { getVapidPublicKey } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const publicKey = await getVapidPublicKey();
    if (!publicKey) {
      return NextResponse.json(
        {
          error: "השרת לא הצליח לטעון מפתח התראות. זה לא קשור להרשאת הדפדפן — נסו שוב בעוד רגע.",
          code: "SERVER_KEY",
        },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { publicKey },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        error: "השרת לא הצליח לטעון מפתח התראות. זה לא קשור להרשאת הדפדפן — נסו שוב בעוד רגע.",
        code: "SERVER_KEY",
      },
      { status: 500 },
    );
  }
}

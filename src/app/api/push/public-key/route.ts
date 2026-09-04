import { NextResponse } from "next/server";
import { getVapidPublicKey } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const publicKey = await getVapidPublicKey();
    return NextResponse.json(
      { publicKey },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "לא הצלחנו להכין התראות." }, { status: 500 });
  }
}

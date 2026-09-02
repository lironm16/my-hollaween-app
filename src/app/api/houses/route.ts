import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { houseInputSchema } from "@/lib/schema";
import { submitHouse } from "@/lib/store";
import { toPublicHouse } from "@/lib/ids";
import { geocodeHttpError } from "@/lib/geocode";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!rateLimit(`submit:${clientKey(request.headers)}`, 8, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "יותר מדי בקשות. נסו שוב בעוד שעה." },
      { status: 429 },
    );
  }
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "גוף הבקשה אינו תקין." }, { status: 400 });
  }
  const parsed = houseInputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "בדקו את השדות ואת המיקום על המפה." },
      { status: 400 },
    );
  }
  try {
    const house = await submitHouse(parsed.data);
    return NextResponse.json({
      house: toPublicHouse(house),
      editCode: house.editCode,
    });
  } catch (error) {
    const geo = geocodeHttpError(error);
    if (geo) return NextResponse.json({ error: geo.error }, { status: geo.status });
    if (error instanceof Error && error.message === "STORE_UNAVAILABLE") {
      return NextResponse.json(
        { error: "לא הצלחנו לשמור לשכונה. נסו שוב בעוד רגע." },
        { status: 503 },
      );
    }
    throw error;
  }
}

import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { houseInputSchema } from "@/lib/schema";
import { submitHouse } from "@/lib/store";
import { toPublicHouse } from "@/lib/ids";

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
    if (error instanceof Error && error.message === "OUT_OF_BOUNDS") {
      return NextResponse.json(
        { error: "המיקום מחוץ לגבולות השכונה." },
        { status: 400 },
      );
    }
    throw error;
  }
}

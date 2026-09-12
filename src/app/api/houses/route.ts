import { NextResponse } from "next/server";
import { houseInputSchema } from "@/lib/schema";
import { submitHouse } from "@/lib/store";
import { toPublicHouse } from "@/lib/ids";
import { geocodeHttpError } from "@/lib/geocode";
import { grantOwnerHouse } from "@/lib/owner-session";
import { readIncludeEndpoint } from "@/lib/push";

export const runtime = "nodejs";

export async function POST(request: Request) {
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
    const house = await submitHouse(parsed.data, {
      includeEndpoint: readIncludeEndpoint(json),
    });
    try {
      await grantOwnerHouse(house.house.id);
    } catch {
      /* owner cookie is optional — house is already saved */
    }
    return NextResponse.json({
      house: toPublicHouse(house.house),
      editCode: house.house.editCode,
      push: house.push,
    });
  } catch (error) {
    const geo = geocodeHttpError(error);
    if (geo) return NextResponse.json({ error: geo.error }, { status: geo.status });
    return NextResponse.json(
      { error: "לא הצלחנו לשמור את הבית. נסו שוב." },
      { status: 500 },
    );
  }
}

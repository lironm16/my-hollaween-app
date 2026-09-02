import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getHouse, updateByEditCode } from "@/lib/store";
import { toPublicHouse } from "@/lib/ids";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MAX_BYTES = 140_000;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!rateLimit(`photo:${clientKey(request.headers)}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "יותר מדי תמונות. נסו שוב אחר כך." }, { status: 429 });
  }
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as
    | { editCode?: string; image?: string }
    | null;
  const house = await getHouse(id);
  if (!house || !body?.editCode || house.editCode !== body.editCode) {
    return NextResponse.json({ error: "קוד העריכה שגוי." }, { status: 403 });
  }
  const image = body.image ?? "";
  const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(image);
  if (!match) {
    return NextResponse.json({ error: "צריך תמונת JPEG דחוסה." }, { status: 400 });
  }
  const buf = Buffer.from(match[1], "base64");
  if (buf.length < 32 || buf.length > MAX_BYTES) {
    return NextResponse.json({ error: "התמונה גדולה מדי. עד 120KB אחרי דחיסה." }, { status: 400 });
  }
  if (buf[0] !== 0xff || buf[1] !== 0xd8) {
    return NextResponse.json({ error: "הקובץ אינו JPEG." }, { status: 400 });
  }

  const dir = path.join(process.cwd(), "public", "house-photos");
  try {
    await fs.mkdir(dir, { recursive: true });
    const file = `${id.replace(/[^0-9\u0590-\u05FFa-zA-Z-]/g, "") || "house"}.jpg`;
    await fs.writeFile(path.join(dir, file), buf);
    const photoUrl = `/house-photos/${file}?v=${Date.now()}`;
    const updated = await updateByEditCode(id, body.editCode, { photoUrl });
    if (!updated) {
      return NextResponse.json({ error: "השמירה נכשלה." }, { status: 500 });
    }
    return NextResponse.json({ house: toPublicHouse(updated) });
  } catch {
    return NextResponse.json(
      {
        error:
          "אי אפשר לשמור תמונות על שרת ה-Hobby. הריצו מקומית, או צרפו את הקובץ ל-public/house-photos לפני הפרסום.",
      },
      { status: 503 },
    );
  }
}

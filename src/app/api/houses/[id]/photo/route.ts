import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getHouse, updateByEditCode } from "@/lib/store";
import { canonicalHouseId, toPublicHouse } from "@/lib/ids";
import { uploadPublicPhoto } from "@/lib/photo-host";
import { grantOwnerHouse, ownerMayEdit } from "@/lib/owner-session";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

const MAX_BYTES = 140_000;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await context.params;
  const id = canonicalHouseId(rawId);
  const body = (await request.json().catch(() => null)) as
    | { editCode?: string; image?: string }
    | null;
  const house = await getHouse(id);
  if (!house) {
    return NextResponse.json({ error: "הבית לא נמצא." }, { status: 404 });
  }
  const admin = await isAdmin();
  const ownerOk = await ownerMayEdit(id);
  const code = admin || ownerOk ? house.editCode : (body?.editCode?.trim() || "");
  if (!code || house.editCode !== code) {
    return NextResponse.json({ error: "קוד העריכה שגוי." }, { status: 403 });
  }
  const image = body?.image ?? "";
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

  let photoUrl: string | null = null;
  let photoHost: string | null = null;
  try {
    const uploaded = await uploadPublicPhoto(buf, { houseId: id });
    photoUrl = uploaded.url;
    photoHost = uploaded.host;
  } catch (error) {
    console.error("[photo-upload]", {
      step: "all-hosts-failed",
      houseId: id,
      bytes: buf.length,
      error: error instanceof Error ? error.message : String(error),
    });
    photoUrl = null;
  }

  if (!photoUrl) {
    const dir = path.join(process.cwd(), "public", "house-photos");
    try {
      await fs.mkdir(dir, { recursive: true });
      const file = `${id.replace(/[^0-9\u0590-\u05FFa-zA-Z-]/g, "") || "house"}.jpg`;
      await fs.writeFile(path.join(dir, file), buf);
      photoUrl = `/house-photos/${file}?v=${Date.now()}`;
      photoHost = "local-fallback";
      console.warn("[photo-upload]", {
        step: "local-fallback-ok",
        houseId: id,
        bytes: buf.length,
        url: photoUrl,
        note: "ephemeral on Vercel — not durable across deploys",
      });
    } catch (error) {
      console.error("[photo-upload]", {
        step: "local-fallback-failed",
        houseId: id,
        bytes: buf.length,
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        { error: "העלאה לאירוח החינמי נכשלה. נסו שוב, או הדביקו קישור לתמונה." },
        { status: 503 },
      );
    }
  }

  console.info("[photo-upload]", {
    step: "saved",
    houseId: id,
    host: photoHost,
    url: photoUrl,
  });

  const updated = await updateByEditCode(id, house.editCode, { photoUrl });
  if ("error" in updated) {
    return NextResponse.json(
      { error: updated.error === "missing" ? "הבית לא נמצא." : "קוד העריכה שגוי." },
      { status: updated.error === "missing" ? 404 : 403 },
    );
  }
  await grantOwnerHouse(id);
  return NextResponse.json({ house: toPublicHouse(updated.house) });
}

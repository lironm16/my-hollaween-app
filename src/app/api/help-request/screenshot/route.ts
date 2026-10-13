import { NextResponse } from "next/server";
import { uploadTemporaryLitterboxImage } from "@/lib/photo-host";

export const runtime = "nodejs";

const MAX_BYTES = 600_000;

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "לא הצלחנו לקרוא את הקובץ." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "בחרו תמונה לצירוף." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "התמונה גדולה מדי. נסו צילום מסך קטן יותר." }, { status: 400 });
  }
  const type = file.type || "application/octet-stream";
  if (!type.startsWith("image/")) {
    return NextResponse.json({ error: "רק קובץ תמונה." }, { status: 400 });
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const url = await uploadTemporaryLitterboxImage(buf);
    return NextResponse.json({ url, expiresNote: "72h" });
  } catch (error) {
    console.error("[help-request] screenshot upload failed", error);
    return NextResponse.json(
      { error: "העלאת התמונה נכשלה. אפשר לשלוח בלי תמונה." },
      { status: 502 },
    );
  }
}

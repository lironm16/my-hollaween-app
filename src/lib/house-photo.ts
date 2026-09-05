import { hostJpegFromBrowser } from "@/lib/photos";
import { readApiJson } from "@/lib/api-json";
import type { PublicHouse } from "@/lib/types";

/** Attach a compressed JPEG to an existing house (add or edit). */
export async function publishHousePhoto(
  id: string,
  editCode: string,
  image: string,
): Promise<PublicHouse> {
  try {
    const photoUrl = await hostJpegFromBrowser(image);
    const res = await fetch(`/api/houses/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ editCode, photoUrl }),
    });
    const data = await readApiJson<{ error?: string; house?: PublicHouse }>(res);
    if (res.ok && data.house) return data.house;
  } catch {
    /* fall through to the app photo endpoint */
  }

  const res = await fetch(`/api/houses/${encodeURIComponent(id)}/photo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ editCode, image }),
  });
  const data = await readApiJson<{ error?: string; house?: PublicHouse }>(res);
  if (!res.ok || !data.house) {
    throw new Error(data.error ?? "העלאת התמונה נכשלה");
  }
  return data.house;
}

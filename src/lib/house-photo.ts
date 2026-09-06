import { readApiJson } from "@/lib/api-json";
import type { PublicHouse } from "@/lib/types";

/** Attach a compressed JPEG through the app server (Blob token / durable host). */
export async function publishHousePhoto(
  id: string,
  editCode: string,
  image: string,
): Promise<PublicHouse> {
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

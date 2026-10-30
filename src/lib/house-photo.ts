import { readApiJson } from "@/lib/api-json";
import type { PublicHouse } from "@/lib/types";

/** Attach a compressed JPEG through the app server (Blob token / durable host). */
export async function publishHousePhoto(
  id: string,
  editCode: string | undefined,
  image: string,
  options?: { previousPhotoUrl?: string },
): Promise<PublicHouse> {
  const res = await fetch(`/api/houses/${encodeURIComponent(id)}/photo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...(editCode?.trim() ? { editCode: editCode.trim() } : {}), image }),
  });
  const data = await readApiJson<{ error?: string; house?: PublicHouse; photoSkipped?: boolean }>(
    res,
  );
  if (!res.ok || !data.house) {
    throw new Error(data.error ?? "העלאת התמונה נכשלה");
  }
  if (data.photoSkipped) {
    throw new Error("photo upload skipped");
  }
  const prev = options?.previousPhotoUrl?.trim();
  const next = data.house.photoUrl?.trim();
  if (prev && next && prev === next) {
    throw new Error("photo url unchanged");
  }
  return data.house;
}

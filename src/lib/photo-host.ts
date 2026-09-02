const LITTERBOX = "https://litterbox.catbox.moe/resources/internals/api.php";
const CATBOX = "https://catbox.moe/user/api.php";
const UA = "HalloweenNeighborhood/1.0 (neighborhood candy map)";

function asBlob(buf: Buffer) {
  const bytes = new Uint8Array(buf);
  return new Blob([bytes], { type: "image/jpeg" });
}

async function postFile(url: string, fields: Record<string, string>, file: Blob) {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.append(key, value);
  body.append("fileToUpload", file, "house.jpg");
  const res = await fetch(url, {
    method: "POST",
    headers: { "User-Agent": UA },
    body,
    signal: AbortSignal.timeout(20_000),
  });
  const text = (await res.text()).trim();
  if (!res.ok || !/^https?:\/\//i.test(text)) {
    throw new Error(text || `upload ${res.status}`);
  }
  return text.split(/\s+/)[0];
}

export async function uploadPublicPhoto(buf: Buffer): Promise<{ url: string; host: string }> {
  const file = asBlob(buf);
  const cloud = process.env.CLOUDINARY_CLOUD_NAME ?? process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.CLOUDINARY_UPLOAD_PRESET ?? process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (cloud && preset) {
    const body = new FormData();
    body.append("file", file, "house.jpg");
    body.append("upload_preset", preset);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(20_000),
    });
    const json = (await res.json()) as { secure_url?: string };
    if (json.secure_url) return { url: json.secure_url, host: "cloudinary" };
  }

  try {
    const url = await postFile(CATBOX, { reqtype: "fileupload" }, file);
    return { url, host: "catbox" };
  } catch {
    const url = await postFile(LITTERBOX, { reqtype: "fileupload", time: "72h" }, file);
    return { url, host: "litterbox" };
  }
}

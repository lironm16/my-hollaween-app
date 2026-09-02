export async function readApiJson<T extends { error?: string }>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return { error: "השרת החזיר תשובה לא תקינה." } as T;
  }
}

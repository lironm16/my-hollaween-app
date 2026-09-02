const windows = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const recent = (windows.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    return false;
  }
  recent.push(now);
  windows.set(key, recent);
  return true;
}

export function clientKey(headers: Headers) {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "local"
  );
}

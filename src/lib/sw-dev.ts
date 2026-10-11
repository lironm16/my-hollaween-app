/** Local `next dev` must not use the PWA service worker — it caches `/_next/static` and Safari keeps old UI for days. */
export function shouldSkipServiceWorker(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

export async function teardownServiceWorkerForDev(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration("/");
    if (registration) await registration.unregister();
  } catch {
    /* ignore */
  }
  if (!("caches" in window)) return;
  try {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((key) => key.startsWith("hw-")).map((key) => caches.delete(key)),
    );
  } catch {
    /* ignore */
  }
}

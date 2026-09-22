/** True when a newly installed worker should replace the running app (not first SW install). */
export function isServiceWorkerUpdateReady(
  workerState: ServiceWorkerState,
  hasActiveController: boolean,
): boolean {
  return workerState === "installed" && hasActiveController;
}

export function versionsDiffer(running: string, published: string): boolean {
  return running.trim() !== published.trim();
}

/** Semver published at deploy time (`public/app-version.txt`). */
export async function fetchPublishedAppVersion(): Promise<string | null> {
  try {
    const res = await fetch("/app-version.txt", { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.text()).trim();
  } catch {
    return null;
  }
}

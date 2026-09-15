import { getDeviceId } from "@/lib/device-id";
import { loadLikedIds, loadVisitedIds } from "@/lib/offline-db";

export type ActivityTotals = {
  totalLiked: number;
  totalVisited: number;
  devicesReporting: number;
};

let lastSent = "";
let inflight: Promise<ActivityTotals | null> | null = null;

/** One POST per catalog poll at most; skips when counts unchanged since last send. */
export function syncActivityCounts(): Promise<ActivityTotals | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (inflight) return inflight;
  const deviceId = getDeviceId();
  if (!deviceId) return Promise.resolve(null);
  const likedCount = loadLikedIds().length;
  const visitedCount = loadVisitedIds().length;
  const key = `${likedCount}:${visitedCount}`;
  if (key === lastSent) return Promise.resolve(null);

  inflight = fetch("/api/activity", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-HW-Device-Id": deviceId,
    },
    body: JSON.stringify({ deviceId, likedCount, visitedCount }),
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  })
    .then((res) => (res.ok ? (res.json() as Promise<ActivityTotals>) : null))
    .then((totals) => {
      if (totals) {
        lastSent = key;
        window.dispatchEvent(new Event("hw-activity-synced"));
      }
      return totals;
    })
    .catch(() => null)
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function resetActivitySyncForTests() {
  lastSent = "";
  inflight = null;
}

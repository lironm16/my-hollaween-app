import webpush from "web-push";
import { formatDisplayAddress } from "@/lib/config";
import { candyLevel, effectiveVisit, isPubliclyListed } from "@/lib/house-state";
import type { DbFile, House, PushSubscriptionRecord, VapidKeys } from "@/lib/types";

export type PushPayload = {
  title: string;
  body: string;
  url: string;
};

const MAX_TITLE = 80;
const MAX_BODY = 280;

export function clipPushText(value: string, max: number) {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trim()}…`;
}

export function sanitizePushPayload(input: { title: string; body: string; url?: string }): PushPayload {
  return {
    title: clipPushText(input.title, MAX_TITLE) || "בשכונה",
    body: clipPushText(input.body, MAX_BODY),
    url: input.url?.startsWith("/") ? input.url : "/",
  };
}

function houseAlertLabel(house: House) {
  const name = house.name.trim() || "בית בשכונה";
  const address = formatDisplayAddress(house);
  return address ? `«${name}» (${address})` : `«${name}»`;
}

function houseUrl(house: House) {
  return `/?focus=${encodeURIComponent(house.id)}`;
}

/** Night-of alerts only — never include a house id in the copy. */
export function importantHouseAlert(prev: House, next: House): PushPayload | null {
  if (!isPubliclyListed(next)) return null;

  const label = houseAlertLabel(next);
  const prevVisit = effectiveVisit(prev);
  const nextVisit = effectiveVisit(next);

  if (prevVisit !== "closed" && nextVisit === "closed") {
    return {
      title: "נגמר המלאי",
      body: `נגמר המלאי ב${label}.`,
      url: houseUrl(next),
    };
  }
  if (prevVisit !== "decorOnly" && nextVisit === "decorOnly") {
    return {
      title: "מקושט בלי ממתקים",
      body: `${label} מקושט בלי ממתקים כרגע.`,
      url: houseUrl(next),
    };
  }
  if ((prevVisit === "closed" || prevVisit === "decorOnly") && nextVisit === "come") {
    return {
      title: "יש שוב ממתקים",
      body: `${label} חזר עם ממתקים.`,
      url: houseUrl(next),
    };
  }

  if (nextVisit === "come") {
    const prevCandy = candyLevel(prev);
    const nextCandy = candyLevel(next);
    if (prevCandy !== "out" && nextCandy === "out") {
      return {
        title: "נגמרו הממתקים",
        body: `נגמרו הממתקים ב${label}.`,
        url: houseUrl(next),
      };
    }
    if (prevCandy === "plenty" && nextCandy === "low") {
      return {
        title: "מעט ממתקים",
        body: `נשארו מעט ממתקים ב${label}.`,
        url: houseUrl(next),
      };
    }
    if (prevCandy === "out" && nextCandy !== "out") {
      return {
        title: "יש שוב ממתקים",
        body: `${label} חזר עם ממתקים.`,
        url: houseUrl(next),
      };
    }
  }

  return null;
}

function vapidFromEnv(): VapidKeys | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) return null;
  return {
    publicKey,
    privateKey,
    subject: process.env.VAPID_SUBJECT?.trim() || "mailto:halloween@localhost",
  };
}

export function ensureVapid(db: DbFile): VapidKeys {
  const env = vapidFromEnv();
  if (env) {
    db.vapid = env;
    return env;
  }
  if (db.vapid?.publicKey && db.vapid?.privateKey) {
    return {
      publicKey: db.vapid.publicKey,
      privateKey: db.vapid.privateKey,
      subject: db.vapid.subject || "mailto:halloween@localhost",
    };
  }
  const generated = webpush.generateVAPIDKeys();
  db.vapid = {
    publicKey: generated.publicKey,
    privateKey: generated.privateKey,
    subject: "mailto:halloween@localhost",
  };
  return db.vapid;
}

function isGoneStatus(statusCode: number) {
  return statusCode === 404 || statusCode === 410;
}

async function mapPool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  if (items.length === 0) return;
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = items[index++];
      await fn(current);
    }
  }
  const n = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: n }, () => worker()));
}

export async function sendPushToSubscriptions(options: {
  vapid: VapidKeys;
  subscriptions: PushSubscriptionRecord[];
  payload: PushPayload;
}): Promise<string[]> {
  const payload = sanitizePushPayload(options.payload);
  webpush.setVapidDetails(options.vapid.subject, options.vapid.publicKey, options.vapid.privateKey);
  const body = JSON.stringify(payload);
  const dead: string[] = [];
  await mapPool(options.subscriptions, 20, async (sub) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys,
        },
        body,
        { TTL: 60 * 60, urgency: "high" },
      );
    } catch (error) {
      const statusCode =
        error && typeof error === "object" && "statusCode" in error
          ? Number((error as { statusCode?: number }).statusCode)
          : 0;
      if (isGoneStatus(statusCode)) dead.push(sub.endpoint);
    }
  });
  return dead;
}

export function parseSubscription(input: unknown): Omit<PushSubscriptionRecord, "createdAt"> | null {
  if (!input || typeof input !== "object") return null;
  const rec = input as {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
  };
  if (typeof rec.endpoint !== "string" || rec.endpoint.length < 20 || rec.endpoint.length > 2000) {
    return null;
  }
  const https =
    rec.endpoint.startsWith("https://") ||
    rec.endpoint.startsWith("http://127.0.0.1") ||
    rec.endpoint.startsWith("http://localhost");
  if (!https) return null;
  const p256dh = rec.keys?.p256dh;
  const auth = rec.keys?.auth;
  if (typeof p256dh !== "string" || typeof auth !== "string") return null;
  if (p256dh.length < 20 || auth.length < 8) return null;
  return {
    endpoint: rec.endpoint,
    keys: { p256dh, auth },
  };
}

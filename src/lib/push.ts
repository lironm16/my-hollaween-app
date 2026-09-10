import webpush from "web-push";
import type { DbFile, House, PushSubscriptionRecord, VapidKeys } from "@/lib/types";
import {
  classifyHouseAlert,
  fillPushTemplate,
  housePushUrl,
  mergePushTemplates,
  type PushKind,
  type StoredPushSettings,
} from "@/lib/push-templates";
import { normalizePushTopics, topicForKind, type PushTopic } from "@/lib/push-topics";

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  topic?: PushTopic;
};

const MAX_TITLE = 80;
const MAX_BODY = 280;

export function clipPushText(value: string, max: number) {
  const text = value
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n+/g, "\n")
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trim()}…`;
}

export function sanitizePushPayload(input: {
  title: string;
  body: string;
  url?: string;
  topic?: PushTopic;
}): PushPayload {
  return {
    title: clipPushText(input.title, MAX_TITLE) || "HallowHood",
    body: clipPushText(input.body, MAX_BODY),
    url: input.url?.startsWith("/") ? input.url : "/",
    ...(input.topic ? { topic: input.topic } : {}),
  };
}

/** Night-of alerts from the current (or default) templates. */
export function importantHouseAlert(
  prev: House,
  next: House,
  stored?: StoredPushSettings | null,
): PushPayload | null {
  const kind = classifyHouseAlert(prev, next);
  if (!kind) return null;
  return payloadForKind(kind, next, stored);
}

export function payloadForKind(
  kind: PushKind,
  house: House,
  stored?: StoredPushSettings | null,
): PushPayload | null {
  const templates = mergePushTemplates(stored);
  const template = templates[kind];
  if (!template.enabled) return null;
  const filled = fillPushTemplate(template, house);
  return sanitizePushPayload({
    ...filled,
    url: housePushUrl(house),
    topic: topicForKind(kind),
  });
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

/** Only drop subscriptions FCM/APNs report as gone — not 401/403 (often VAPID mismatch). */
function isDeadSubscription(statusCode: number) {
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
}): Promise<{ dead: string[]; delivered: number; errors: number }> {
  const payload = sanitizePushPayload(options.payload);
  webpush.setVapidDetails(options.vapid.subject, options.vapid.publicKey, options.vapid.privateKey);
  const body = JSON.stringify(payload);
  const dead: string[] = [];
  let delivered = 0;
  let errors = 0;
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
      delivered += 1;
    } catch (error) {
      const statusCode =
        error && typeof error === "object" && "statusCode" in error
          ? Number((error as { statusCode?: number }).statusCode)
          : 0;
      if (isDeadSubscription(statusCode)) dead.push(sub.endpoint);
      else errors += 1;
    }
  });
  return { dead, delivered, errors };
}

export function readIncludeEndpoint(input: unknown): string | undefined {
  if (!input || typeof input !== "object") return undefined;
  const rec = input as { includeEndpoint?: unknown; endpoint?: unknown };
  const value = rec.includeEndpoint ?? rec.endpoint;
  return typeof value === "string" && value.length > 20 ? value : undefined;
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
  const topics = normalizePushTopics((input as { topics?: unknown }).topics);
  return {
    endpoint: rec.endpoint,
    keys: { p256dh, auth },
    ...(topics !== undefined ? { topics } : {}),
  };
}

import {
  anyPushTopicOn,
  DEFAULT_PUSH_TOPIC_PREFS,
  topicsFromPrefs,
  type PushTopic,
  type PushTopicPrefs,
} from "@/lib/push-topics";

export const PUSH_PREF_KEY = "hw-push-pref";
export const PUSH_PROMPT_SKIP_KEY = "hw-push-prompt-skip";
export const PUSH_TOPICS_KEY = "hw-push-topics";

export type PushPref = "on" | "off";
export type PushEnableResult = "on" | "off" | "denied" | "unsupported" | "ios-install";
export type { PushTopic, PushTopicPrefs };

export { DEFAULT_PUSH_TOPIC_PREFS };

export function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isAndroidDevice() {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

function serviceWorkerTimeoutMs() {
  return isAndroidDevice() ? 12_000 : 4_000;
}

async function waitForServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
    void registration.update();
    const timeout = new Promise<null>((resolve) => {
      window.setTimeout(() => resolve(null), serviceWorkerTimeoutMs());
    });
    return await Promise.race([navigator.serviceWorker.ready, timeout]);
  } catch {
    return null;
  }
}

export function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || Boolean(nav.standalone);
}

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export function readPushTopicPrefs(): PushTopicPrefs {
  try {
    const raw = localStorage.getItem(PUSH_TOPICS_KEY);
    if (!raw) return { ...DEFAULT_PUSH_TOPIC_PREFS };
    const parsed = JSON.parse(raw) as Partial<PushTopicPrefs>;
    return {
      newHouse: parsed.newHouse !== false,
      houseStatus: parsed.houseStatus === true,
      admin: parsed.admin !== false,
    };
  } catch {
    return { ...DEFAULT_PUSH_TOPIC_PREFS };
  }
}

export function writePushTopicPrefs(prefs: PushTopicPrefs) {
  try {
    localStorage.setItem(PUSH_TOPICS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

/** `on` = this phone subscribed. `off` = they turned alerts off. `null` = not decided yet. */
export function readPushPref(): PushPref | null {
  try {
    const raw = localStorage.getItem(PUSH_PREF_KEY);
    if (raw === "off") return "off";
    if (raw === "on") return "on";
  } catch {
    /* ignore */
  }
  return null;
}

export function writePushPref(value: PushPref) {
  try {
    localStorage.setItem(PUSH_PREF_KEY, value);
    if (value === "off") {
      writePushTopicPrefs({ newHouse: false, houseStatus: false, admin: false });
      return;
    }
    if (!anyPushTopicOn(readPushTopicPrefs())) {
      writePushTopicPrefs({ ...DEFAULT_PUSH_TOPIC_PREFS });
    }
  } catch {
    /* ignore */
  }
}

export function notifyPushStatusChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("hw-push-changed"));
}

export async function readPushStatus(): Promise<PushEnableResult> {
  if (!pushSupported()) return "unsupported";
  if (isIosDevice() && !isStandaloneDisplay()) return "ios-install";
  if (Notification.permission === "denied") return "denied";
  try {
    const reg = await waitForServiceWorkerRegistration();
    if (!reg) return "off";
    const sub = await reg.pushManager.getSubscription();
    return sub ? "on" : "off";
  } catch {
    return "off";
  }
}

export function applicationServerKeyMatches(sub: PushSubscription, publicKey: string) {
  const expected = urlBase64ToUint8Array(publicKey);
  const raw = sub.options?.applicationServerKey;
  // Some Android builds omit the key on existing subscriptions — don't force resubscribe.
  if (!raw) return true;
  const actual = raw instanceof Uint8Array ? raw : new Uint8Array(raw as ArrayBuffer);
  if (actual.length !== expected.length) return false;
  return actual.every((byte, index) => byte === expected[index]);
}

async function postSubscription(sub: PushSubscription, prefs: PushTopicPrefs) {
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...sub.toJSON(), topics: topicsFromPrefs(prefs) }),
  });
  const data = (await res.json().catch(() => null)) as {
    error?: string;
    registered?: boolean;
    count?: number;
  } | null;
  if (!res.ok) {
    throw new Error(data?.error ?? "לא הצלחנו לשמור את ההתראות.");
  }
  if (!data?.registered) {
    throw new Error("השרת לא אישר את ההרשמה. נסו שוב בעוד רגע.");
  }
  return data.count ?? 0;
}

async function callPushTest(endpoint: string) {
  const res = await fetch("/api/push/test", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  });
  const data = (await res.json().catch(() => null)) as {
    ok?: boolean;
    registered?: boolean;
    delivered?: boolean;
    total?: number;
    error?: string;
  } | null;
  return { res, data };
}

/** Drop local push subscription and register fresh with the server's current VAPID key. */
export async function forceRefreshPushSubscription(): Promise<PushEnableResult> {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission !== "granted") return "denied";
  try {
    const reg = await waitForServiceWorkerRegistration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (sub) {
      try {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
      } catch {
        /* ignore */
      }
      await sub.unsubscribe();
    }
  } catch {
    /* ignore */
  }
  return enablePushAlerts();
}

export async function sendSelfPushTest(): Promise<{
  ok: boolean;
  registered: boolean;
  delivered?: boolean;
  total?: number;
  local?: boolean;
  error?: string;
}> {
  let endpoint = await senderPushEndpoint();
  if (!endpoint) {
    await forceRefreshPushSubscription();
    endpoint = await senderPushEndpoint();
  }
  if (!endpoint) {
    return { ok: false, registered: false, error: "אין הרשמה מקומית במכשיר." };
  }

  let { res, data } = await callPushTest(endpoint);
  const delivered = Boolean(res.ok && data?.ok && data?.delivered);

  if (!delivered) {
    await forceRefreshPushSubscription();
    endpoint = await senderPushEndpoint();
    if (endpoint) {
      ({ res, data } = await callPushTest(endpoint));
    }
  }

  const serverDelivered = Boolean(res.ok && data?.ok && data?.delivered);
  if (!serverDelivered) {
    await showLocalPush(
      "בדיקת התראות",
      data?.registered
        ? "המכשיר רשום בשרת — זו התראה מקומית. השליחה מהשרת עדיין לא עובדת."
        : "התראות במכשיר עובדות. עדיין מסנכרנים רישום לשרת.",
    );
  }

  if (!res.ok) {
    return {
      ok: false,
      registered: Boolean(data?.registered),
      total: data?.total,
      local: !serverDelivered,
      error: data?.error ?? "הבדיקה נכשלה.",
    };
  }
  return {
    ok: serverDelivered,
    registered: Boolean(data?.registered),
    delivered: data?.delivered,
    total: data?.total,
    local: !serverDelivered,
    error: serverDelivered ? undefined : data?.error,
  };
}

async function obtainPushSubscription(
  reg: ServiceWorkerRegistration,
  publicKey: string,
): Promise<PushSubscription> {
  let sub = await reg.pushManager.getSubscription();
  if (sub && !applicationServerKeyMatches(sub, publicKey)) {
    await sub.unsubscribe();
    sub = null;
  }
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }
  return sub;
}

export async function enablePushAlerts(prefs?: PushTopicPrefs): Promise<PushEnableResult> {
  const nextPrefs = prefs ?? readPushTopicPrefs();
  writePushTopicPrefs(nextPrefs);
  if (!anyPushTopicOn(nextPrefs)) {
    return disablePushAlerts();
  }
  if (!pushSupported()) return "unsupported";
  if (isIosDevice() && !isStandaloneDisplay()) return "ios-install";
  if (Notification.permission === "denied") return "denied";

  const keyRes = await fetch("/api/push/public-key", { cache: "no-store" });
  const keyData = (await keyRes.json()) as { publicKey?: string; error?: string; code?: string };
  if (!keyRes.ok || !keyData.publicKey) {
    throw new Error(
      keyData.error ??
        (keyData.code === "SERVER_KEY"
          ? "בעיה בשרת — לא קשור להרשאת הדפדפן. נסו שוב בעוד רגע."
          : "לא הצלחנו להפעיל התראות."),
    );
  }

  if (Notification.permission !== "granted") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return permission === "denied" ? "denied" : "off";
    }
  }

  const reg = await waitForServiceWorkerRegistration();
  if (!reg) throw new Error("Service worker לא מוכן. נסו שוב בעוד רגע.");
  const sub = await obtainPushSubscription(reg, keyData.publicKey);
  const count = await postSubscription(sub, nextPrefs);
  writePushPref("on");
  notifyPushStatusChanged();
  return count > 0 ? "on" : "off";
}

export async function syncPushTopicPrefs(prefs: PushTopicPrefs): Promise<PushEnableResult> {
  writePushTopicPrefs(prefs);
  if (!anyPushTopicOn(prefs)) {
    return disablePushAlerts();
  }
  const status = await readPushStatus();
  if (status === "on") {
    try {
      const keyRes = await fetch("/api/push/public-key", { cache: "no-store" });
      const keyData = (await keyRes.json()) as { publicKey?: string };
      const reg = await waitForServiceWorkerRegistration();
      if (keyRes.ok && keyData.publicKey && reg) {
        const sub = await obtainPushSubscription(reg, keyData.publicKey);
        await postSubscription(sub, prefs);
        notifyPushStatusChanged();
        return "on";
      }
    } catch {
      /* fall through to a full enable */
    }
  }
  return enablePushAlerts(prefs);
}

export async function disablePushAlerts(): Promise<"off"> {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
    }
  } finally {
    writePushPref("off");
    notifyPushStatusChanged();
  }
  return "off";
}

/** Re-post (and re-key if needed) so the server always has this device. */
export async function refreshPushSubscriptionIfEnabled() {
  if (!pushSupported()) return;
  if (Notification.permission !== "granted") return;
  const prefs = readPushTopicPrefs();
  if (!anyPushTopicOn(prefs)) return;
  const pref = readPushPref();
  const status = await readPushStatus();
  if (pref !== "on" && status !== "on") return;
  try {
    const keyRes = await fetch("/api/push/public-key", { cache: "no-store" });
    const keyData = (await keyRes.json()) as { publicKey?: string };
    if (!keyRes.ok || !keyData.publicKey) return;
    const reg = await waitForServiceWorkerRegistration();
    if (!reg) return;
    const sub = await obtainPushSubscription(reg, keyData.publicKey);
    await postSubscription(sub, prefs);
    writePushPref("on");
    notifyPushStatusChanged();
  } catch {
    /* ignore — user can re-enable from the bell */
  }
}

export async function senderPushEndpoint() {
  try {
    if (typeof navigator === "undefined" || !navigator.serviceWorker) return undefined;
    const ready = waitForServiceWorkerRegistration().then((reg) =>
      reg ? reg.pushManager.getSubscription() : null,
    );
    return (await ready)?.endpoint;
  } catch {
    return undefined;
  }
}

export async function showLocalPush(title: string, body: string, url = "/") {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      lang: "he",
      dir: "rtl",
      data: { url },
    });
  } catch {
    /* ignore */
  }
}


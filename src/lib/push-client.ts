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
      houseStatus: parsed.houseStatus !== false,
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
    const ready = navigator.serviceWorker.ready;
    const timeout = new Promise<"timeout">((resolve) => {
      window.setTimeout(() => resolve("timeout"), 2500);
    });
    const raced = await Promise.race([ready, timeout]);
    if (raced === "timeout") return "off";
    const sub = await raced.pushManager.getSubscription();
    return sub ? "on" : "off";
  } catch {
    return "off";
  }
}

async function postSubscription(sub: PushSubscription, prefs: PushTopicPrefs) {
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...sub.toJSON(), topics: topicsFromPrefs(prefs) }),
  });
  if (!res.ok) {
    throw new Error("לא הצלחנו לשמור את ההתראות.");
  }
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
  const keyData = (await keyRes.json()) as { publicKey?: string; error?: string };
  if (!keyRes.ok || !keyData.publicKey) {
    throw new Error(keyData.error ?? "לא הצלחנו להפעיל התראות.");
  }

  if (Notification.permission !== "granted") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return permission === "denied" ? "denied" : "off";
    }
  }

  await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
    }));
  await postSubscription(sub, nextPrefs);
  writePushPref("on");
  notifyPushStatusChanged();
  return "on";
}

export async function syncPushTopicPrefs(prefs: PushTopicPrefs): Promise<PushEnableResult> {
  writePushTopicPrefs(prefs);
  if (!anyPushTopicOn(prefs)) {
    return disablePushAlerts();
  }
  const status = await readPushStatus();
  if (status === "on") {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
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

export async function senderPushEndpoint() {
  try {
    if (typeof navigator === "undefined" || !navigator.serviceWorker) return undefined;
    const ready = Promise.race([
      navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription()),
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 600)),
    ]);
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


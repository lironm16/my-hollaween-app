export const PUSH_PREF_KEY = "hw-push-pref";
export const PUSH_PROMPT_SKIP_KEY = "hw-push-prompt-skip";

export type PushPref = "on" | "off";
export type PushEnableResult = "on" | "off" | "denied" | "unsupported" | "ios-install";

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

/** Notifications default to on unless the user turned them off on this device. */
export function readPushPref(): PushPref {
  try {
    return localStorage.getItem(PUSH_PREF_KEY) === "off" ? "off" : "on";
  } catch {
    return "on";
  }
}

export function writePushPref(value: PushPref) {
  try {
    localStorage.setItem(PUSH_PREF_KEY, value);
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

export async function enablePushAlerts(): Promise<PushEnableResult> {
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
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub.toJSON()),
  });
  if (!res.ok) {
    throw new Error("לא הצלחנו לשמור את ההתראות.");
  }
  writePushPref("on");
  notifyPushStatusChanged();
  return "on";
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

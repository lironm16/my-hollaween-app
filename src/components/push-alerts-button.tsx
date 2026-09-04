"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { toast } from "sonner";
import { isIosDevice, isStandaloneDisplay, urlBase64ToUint8Array } from "@/lib/push-client";
import { cn } from "@/lib/utils";

type Status = "loading" | "unsupported" | "ios-install" | "off" | "on" | "denied";

const PREF_KEY = "hw-push-pref";

export function PushAlertsButton() {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void refreshStatus();
  }, []);

  async function refreshStatus() {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
      setStatus("unsupported");
      return;
    }
    if (isIosDevice() && !isStandaloneDisplay()) {
      setStatus("ios-install");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setStatus(sub ? "on" : "off");
    } catch {
      setStatus("off");
    }
  }

  async function enable() {
    setBusy(true);
    try {
      const keyRes = await fetch("/api/push/public-key", { cache: "no-store" });
      const keyData = (await keyRes.json()) as { publicKey?: string; error?: string };
      if (!keyRes.ok || !keyData.publicKey) {
        toast.error(keyData.error ?? "לא הצלחנו להפעיל התראות.");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        toast.message("בלי הרשאה לא נשלח התראות לטלפון.");
        return;
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
        toast.error("לא הצלחנו לשמור את ההתראות.");
        return;
      }
      try {
        localStorage.setItem(PREF_KEY, "on");
      } catch {
        /* ignore */
      }
      setStatus("on");
      toast.success("התראות פועלות. תקבלו עדכון כשנגמרים ממתקים.");
    } catch {
      toast.error("הדפדפן חסם התראות.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
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
      try {
        localStorage.setItem(PREF_KEY, "off");
      } catch {
        /* ignore */
      }
      setStatus("off");
      toast.message("התראות כבויות במכשיר הזה.");
    } catch {
      toast.error("לא הצלחנו לכבות התראות.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") return null;

  const title =
    status === "on"
      ? "התראות פועלות — לחצו לכיבוי"
      : status === "denied"
        ? "התראות חסומות בהגדרות הדפדפן"
        : status === "ios-install"
          ? "באייפון: הוסיפו למסך הבית ואז הפעילו התראות"
          : status === "unsupported"
            ? "הדפדפן לא תומך בהתראות"
            : "הפעילו התראות על מלאי ומסרים מהשכונה";

  return (
    <button
      type="button"
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-lg",
        status === "on"
          ? "bg-orange-500 text-black"
          : "bg-[#1d1028] text-orange-100 ring-1 ring-orange-500/25",
      )}
      aria-label={title}
      title={title}
      disabled={busy || status === "denied" || status === "unsupported"}
      onClick={() => {
        if (status === "on") void disable();
        else if (status === "ios-install") {
          toast.message("באייפון ההתראות עובדות אחרי «הוספה למסך הבית».");
        } else {
          void enable();
        }
      }}
    >
      {status === "on" ? (
        <BellRing className="size-4" />
      ) : status === "denied" || status === "unsupported" ? (
        <BellOff className="size-4" />
      ) : (
        <Bell className="size-4" />
      )}
    </button>
  );
}

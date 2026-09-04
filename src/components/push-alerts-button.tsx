"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { toast } from "sonner";
import {
  PUSH_PROMPT_SKIP_KEY,
  disablePushAlerts,
  enablePushAlerts,
  readPushPref,
  readPushStatus,
  type PushEnableResult,
} from "@/lib/push-client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Status = "loading" | PushEnableResult;

function skipPromptThisSession() {
  try {
    sessionStorage.setItem(PUSH_PROMPT_SKIP_KEY, "1");
  } catch {
    /* ignore */
  }
}

function promptSkippedThisSession() {
  try {
    return sessionStorage.getItem(PUSH_PROMPT_SKIP_KEY) === "1";
  } catch {
    return false;
  }
}

export function PushAlertsButton() {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [askOpen, setAskOpen] = useState(false);

  useEffect(() => {
    const onChange = () => {
      void readPushStatus().then(setStatus);
    };
    window.addEventListener("hw-push-changed", onChange);
    return () => window.removeEventListener("hw-push-changed", onChange);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const current = await readPushStatus();
      if (cancelled) return;
      setStatus(current);

      // Default is on. If the browser already allowed us, subscribe without waiting
      // for the bell. Otherwise pop a prompt as soon as they are in the app.
      if (readPushPref() === "off") return;
      if (current === "denied" || current === "unsupported") return;
      if (current === "on") return;

      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        try {
          const result = await enablePushAlerts();
          if (cancelled) return;
          setStatus(result);
          if (result === "on") return;
        } catch {
          if (cancelled) return;
        }
      }

      if (promptSkippedThisSession()) return;
      if (!cancelled) setAskOpen(true);
    }

    const timer = window.setTimeout(() => {
      void boot();
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  async function enable(fromPrompt = false) {
    setBusy(true);
    try {
      const result = await enablePushAlerts();
      setStatus(result);
      if (result === "on") {
        setAskOpen(false);
        toast.success("התראות פועלות. תקבלו עדכון כשנגמרים ממתקים.");
        return;
      }
      if (result === "denied") {
        setAskOpen(false);
        toast.message("בלי הרשאה לא נשלח התראות לטלפון.");
        return;
      }
      if (result === "ios-install") {
        setAskOpen(true);
        toast.message("באייפון ההתראות עובדות אחרי «הוספה למסך הבית».");
        return;
      }
      if (!fromPrompt) setAskOpen(true);
      toast.message("בלי הרשאה לא נשלח התראות לטלפון.");
    } catch {
      toast.error("הדפדפן חסם התראות.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      setStatus(await disablePushAlerts());
      setAskOpen(false);
      skipPromptThisSession();
      toast.message("התראות כבויות במכשיר הזה.");
    } catch {
      toast.error("לא הצלחנו לכבות התראות.");
    } finally {
      setBusy(false);
    }
  }

  function dismissPrompt() {
    skipPromptThisSession();
    setAskOpen(false);
  }

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

  const ios = status === "ios-install";

  return (
    <>
      {status !== "loading" ? (
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
              setAskOpen(true);
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
      ) : null}

      <Dialog open={askOpen} onOpenChange={(open) => (open ? setAskOpen(true) : dismissPrompt())}>
        <DialogContent
          showCloseButton={false}
          className="border border-orange-500/30 bg-[#1a0d24] text-orange-50"
        >
          <DialogHeader>
            <DialogTitle className="text-lg text-orange-100">
              {ios ? "התראות באייפון" : "קבלו התראות מהשכונה"}
            </DialogTitle>
            <DialogDescription className="text-violet-200/90">
              {ios
                ? "באייפון צריך קודם «הוספה למסך הבית», ואז נפתח חלון ההרשאה אוטומטית."
                : "נדליק התראות כברירת מחדל — עדכון כשנגמרים ממתקים או כשיש מסר מהמנהלים. אפשר לכבות מהפעמון."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-orange-500/15 bg-[#14091c]/80">
            {ios ? (
              <Button className="bg-orange-500 text-black hover:bg-orange-400" onClick={dismissPrompt}>
                הבנתי
              </Button>
            ) : (
              <>
                <Button
                  className="bg-orange-500 text-black hover:bg-orange-400"
                  disabled={busy}
                  onClick={() => void enable(true)}
                >
                  הפעילו התראות
                </Button>
                <Button variant="ghost" className="text-violet-200" disabled={busy} onClick={dismissPrompt}>
                  לא עכשיו
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

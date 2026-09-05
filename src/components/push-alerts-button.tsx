"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_PUSH_TOPIC_PREFS,
  PUSH_PROMPT_SKIP_KEY,
  disablePushAlerts,
  enablePushAlerts,
  readPushPref,
  readPushStatus,
  readPushTopicPrefs,
  syncPushTopicPrefs,
  writePushTopicPrefs,
  type PushEnableResult,
  type PushTopic,
  type PushTopicPrefs,
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

const TOPIC_ROWS: { id: PushTopic; title: string; hint: string }[] = [
  { id: "newHouse", title: "בית חדש נוסף", hint: "כשבית חדש נכנס למפה" },
  {
    id: "houseStatus",
    title: "נגמר מלאי או בית שנסגר",
    hint: "עדכונים שוטפים בלילה",
  },
  { id: "admin", title: "הודעות מהמנהלים", hint: "מסרים לכל השכונה" },
];

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

function TopicSwitch({
  on,
  disabled,
  title,
  hint,
  onChange,
}: {
  on: boolean;
  disabled?: boolean;
  title: string;
  hint: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-xl bg-[#12081a] px-3 py-3 text-start ring-1 ring-orange-500/20",
        disabled && "opacity-50",
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-orange-50">{title}</span>
        <span className="mt-0.5 block text-sm text-violet-300">{hint}</span>
      </span>
      <span
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition",
          on ? "bg-orange-500" : "bg-[#2a1638] ring-1 ring-orange-500/25",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-6 rounded-full bg-white shadow transition-[inset-inline-start]",
            on ? "start-5" : "start-0.5",
          )}
        />
      </span>
    </button>
  );
}

export function PushAlertsButton() {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [topics, setTopics] = useState<PushTopicPrefs>(DEFAULT_PUSH_TOPIC_PREFS);

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
      setTopics(readPushTopicPrefs());
      const current = await readPushStatus();
      if (cancelled) return;
      setStatus(current);

      if (readPushPref() === "off") return;
      if (current === "denied" || current === "unsupported") return;
      if (current === "on") return;

      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        try {
          const result = await enablePushAlerts(readPushTopicPrefs());
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

  const subscribed = status === "on";
  const locked = status === "denied" || status === "unsupported";

  async function enable(fromPrompt = false) {
    setBusy(true);
    try {
      const result = await enablePushAlerts(topics);
      setStatus(result);
      if (result === "on") {
        setAskOpen(false);
        toast.success("התראות פועלות. אפשר לשנות מהפעמון.");
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
      setTopics({ newHouse: false, houseStatus: false, admin: false });
      setAskOpen(false);
      skipPromptThisSession();
      toast.message("התראות כבויות במכשיר הזה.");
    } catch {
      toast.error("לא הצלחנו לכבות התראות.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleTopic(id: PushTopic, on: boolean) {
    const next = { ...topics, [id]: on };
    setTopics(next);
    writePushTopicPrefs(next);
    if (!subscribed) return;
    setBusy(true);
    try {
      const result = await syncPushTopicPrefs(next);
      setStatus(result);
    } catch {
      toast.error("לא הצלחנו לשמור את ההעדפה.");
      setTopics(readPushTopicPrefs());
    } finally {
      setBusy(false);
    }
  }

  function openSettings() {
    setTopics(readPushTopicPrefs());
    setAskOpen(true);
  }

  function dismissPrompt() {
    skipPromptThisSession();
    setAskOpen(false);
  }

  const title =
    status === "on"
      ? "הגדרות התראות"
      : status === "denied"
        ? "התראות חסומות בהגדרות הדפדפן"
        : status === "ios-install"
          ? "באייפון: הוסיפו למסך הבית ואז הפעילו התראות"
          : status === "unsupported"
            ? "הדפדפן לא תומך בהתראות"
            : "הפעילו התראות מהשכונה";

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
            if (status === "ios-install") {
              setAskOpen(true);
              toast.message("באייפון ההתראות עובדות אחרי «הוספה למסך הבית».");
              return;
            }
            openSettings();
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
          className="border border-orange-500/30 bg-[#1a0d24] text-orange-50 sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle className="text-lg text-orange-100">
              {ios ? "התראות באייפון" : "קבלו התראות מהשכונה"}
            </DialogTitle>
            <DialogDescription className="text-violet-200/90">
              {ios
                ? "באייפון צריך קודם «הוספה למסך הבית», ואז נפתח חלון ההרשאה אוטומטית."
                : "נדליק התראות כברירת מחדל"}
            </DialogDescription>
          </DialogHeader>
          {ios ? null : (
            <div className="grid gap-2">
              {TOPIC_ROWS.map((row) => (
                <TopicSwitch
                  key={row.id}
                  title={row.title}
                  hint={row.hint}
                  on={topics[row.id]}
                  disabled={busy || locked}
                  onChange={(on) => void toggleTopic(row.id, on)}
                />
              ))}
            </div>
          )}
          <DialogFooter className="border-orange-500/15 bg-[#14091c]/80">
            {ios ? (
              <Button className="bg-orange-500 text-black hover:bg-orange-400" onClick={dismissPrompt}>
                הבנתי
              </Button>
            ) : subscribed ? (
              <>
                <Button
                  className="bg-orange-500 text-black hover:bg-orange-400"
                  disabled={busy}
                  onClick={() => setAskOpen(false)}
                >
                  סגירה
                </Button>
                <Button variant="ghost" className="text-violet-200" disabled={busy} onClick={() => void disable()}>
                  כבו התראות
                </Button>
              </>
            ) : (
              <>
                <Button
                  className="bg-orange-500 text-black hover:bg-orange-400"
                  disabled={busy || locked}
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

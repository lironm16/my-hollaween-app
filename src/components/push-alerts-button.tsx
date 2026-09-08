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
import { anyPushTopicOn, PUSH_TOPIC_ROWS } from "@/lib/push-topics";
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
    <div
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-xl bg-[#12081a] px-3 py-3 text-start ring-1 ring-orange-500/20",
        disabled ? "opacity-50" : "cursor-pointer",
      )}
      onClick={() => {
        if (disabled) return;
        onChange(!on);
      }}
    >
      <span className="min-w-0">
        <span className="block text-base font-medium text-orange-50">{title}</span>
        <span className="mt-0.5 block text-base text-violet-300">{hint}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={title}
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={(event) => {
          event.stopPropagation();
          onChange(!on);
        }}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full outline-none transition focus:outline-none focus-visible:ring-0",
          on ? "bg-orange-500" : "bg-[#2a1638] ring-1 ring-orange-500/25",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-6 rounded-full bg-white shadow transition-[inset-inline-start]",
            on ? "start-5" : "start-0.5",
          )}
        />
      </button>
    </div>
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
      const stored = readPushTopicPrefs();
      setTopics(anyPushTopicOn(stored) ? stored : { ...DEFAULT_PUSH_TOPIC_PREFS });
      const current = await readPushStatus();
      if (cancelled) return;
      setStatus(current);

      if (current === "denied" || current === "unsupported") return;
      if (current === "on") return;

      const pref = readPushPref();
      if (pref === "off") return;

      if (pref === "on" && typeof Notification !== "undefined" && Notification.permission === "granted") {
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
  const ios = status === "ios-install";
  const canEnable = anyPushTopicOn(topics);

  async function enable() {
    if (!canEnable) return;
    setBusy(true);
    try {
      const result = await enablePushAlerts(topics);
      setStatus(result);
      if (result === "on") {
        toast.success("נרשמתם. אפשר לכבות סוג, או לכבות הכל.");
        return;
      }
      if (result === "denied") {
        setAskOpen(false);
        toast.message("בלי הרשאה לא נשלח התראות לטלפון.");
        return;
      }
      if (result === "ios-install") {
        toast.message("באייפון ההתראות עובדות אחרי «הוספה למסך הבית».");
        return;
      }
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

  async function toggleTopic(id: PushTopic, on: boolean) {
    const next = { ...topics, [id]: on };
    setTopics(next);
    writePushTopicPrefs(next);
    if (!subscribed) return;
    setBusy(true);
    try {
      const result = await syncPushTopicPrefs(next);
      setStatus(result);
      if (result !== "on") {
        skipPromptThisSession();
        toast.message("התראות כבויות במכשיר הזה.");
      }
    } catch {
      toast.error("לא הצלחנו לשמור את ההעדפה.");
      setTopics(readPushTopicPrefs());
    } finally {
      setBusy(false);
    }
  }

  function openSettings() {
    const stored = readPushTopicPrefs();
    setTopics(
      subscribed || anyPushTopicOn(stored) ? stored : { ...DEFAULT_PUSH_TOPIC_PREFS },
    );
    setAskOpen(true);
  }

  function closeDialog() {
    setAskOpen(false);
    if (!subscribed) skipPromptThisSession();
  }

  const title =
    status === "on"
      ? "התראות פועלות"
      : status === "denied"
        ? "התראות חסומות בהגדרות הדפדפן"
        : status === "ios-install"
          ? "באייפון: הוסיפו למסך הבית ואז הפעילו"
          : status === "unsupported"
            ? "הדפדפן לא תומך בהתראות"
            : "הפעילו התראות מהשכונה";

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

      <Dialog open={askOpen} onOpenChange={(open) => (open ? setAskOpen(true) : closeDialog())}>
        <DialogContent
          showCloseButton={false}
          initialFocus={false}
          className="border border-orange-500/30 bg-[#1a0d24] text-orange-50 sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle className="text-lg text-orange-100">
              {ios ? "התראות באייפון" : subscribed ? "התראות פועלות" : "קבלו התראות מהשכונה"}
            </DialogTitle>
            <DialogDescription className="text-violet-200/90">
              {ios
                ? "באייפון צריך קודם «הוספה למסך הבית», ואז נפתח חלון ההרשאה."
                : subscribed
                  ? "שינוי מתג נשמר מיד. «כבו הכל» מבטל את ההרשמה."
                  : "המתגים רק בוחרים מה לקבל. נרשמים רק ב«הפעילו»."}
            </DialogDescription>
          </DialogHeader>
          {ios ? null : (
            <>
              <div className="grid gap-2">
                {PUSH_TOPIC_ROWS.map((row) => (
                  <TopicSwitch
                    key={row.id}
                    title={row.title}
                    hint={row.hint}
                    on={topics[row.id]}
                    disabled={busy || locked}
                    onChange={(next) => void toggleTopic(row.id, next)}
                  />
                ))}
              </div>
              {subscribed || canEnable ? null : (
                <p className="text-base text-amber-200">סמנו לפחות סוג אחד, ואז «הפעילו».</p>
              )}
            </>
          )}
          <DialogFooter className="border-orange-500/15 bg-[#14091c]/80">
            {ios ? (
              <Button className="bg-orange-500 text-black hover:bg-orange-400" onClick={closeDialog}>
                הבנתי
              </Button>
            ) : locked ? (
              <Button className="bg-orange-500 text-black hover:bg-orange-400" onClick={closeDialog}>
                סגירה
              </Button>
            ) : subscribed ? (
              <>
                <Button
                  className="bg-orange-500 text-black hover:bg-orange-400"
                  disabled={busy}
                  onClick={() => setAskOpen(false)}
                >
                  סיום
                </Button>
                <Button variant="ghost" className="text-violet-200" disabled={busy} onClick={() => void disable()}>
                  כבו הכל
                </Button>
              </>
            ) : (
              <>
                <Button
                  className="bg-orange-500 text-black hover:bg-orange-400"
                  disabled={busy || !canEnable}
                  onClick={() => void enable()}
                >
                  הפעילו
                </Button>
                <Button variant="ghost" className="text-violet-200" disabled={busy} onClick={closeDialog}>
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

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
  isAndroidDevice,
  readPushTopicPrefs,
  refreshPushSubscriptionIfEnabled,
  sendSelfPushTest,
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
      if (current === "on") {
        void refreshPushSubscriptionIfEnabled();
        return;
      }

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
  const denied = status === "denied";
  const unsupported = status === "unsupported";
  const locked = denied || unsupported;
  const ios = status === "ios-install";
  const android = isAndroidDevice();
  const canEnable = anyPushTopicOn(topics);

  function closeDialog() {
    setAskOpen(false);
    if (!subscribed) skipPromptThisSession();
  }

  async function save() {
    if (subscribed) {
      closeDialog();
      return;
    }
    if (!canEnable) return;
    setBusy(true);
    try {
      const result = await enablePushAlerts(topics);
      setStatus(result);
      if (result === "on") {
        setAskOpen(false);
        toast.success("נרשמתם! אפשר לערוך בכל עת דרך סמל הפעמון.", { closeButton: true });
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "הדפדפן חסם התראות.");
    } finally {
      setBusy(false);
    }
  }

  async function runSelfTest() {
    setBusy(true);
    try {
      const result = await sendSelfPushTest();
      if (result.ok) {
        toast.success(`התראה מהשרת הגיעה! (${result.total ?? 1} מכשירים רשומים)`);
        return;
      }
      if (result.local) {
        toast.message(
          result.registered
            ? "הראינו התראה מקומית. הרישום בשרת קיים — נסו שוב בעוד כמה שניות."
            : "הראינו התראה מקומית. מסנכרנים רישום לשרת — נסו שוב.",
        );
        return;
      }
      if (!result.registered) {
        toast.error(result.error ?? "המכשיר לא רשום בשרת. כבו והפעילו התראות שוב.");
        return;
      }
      toast.error(result.error ?? "השליחה נכשלה. כבו והפעילו התראות שוב.");
    } catch {
      toast.error("לא הצלחנו לשלוח בדיקה.");
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

  async function disableAll() {
    const off = { newHouse: false, houseStatus: false, admin: false };
    setTopics(off);
    setBusy(true);
    try {
      await disablePushAlerts();
      setStatus("off");
      closeDialog();
      toast.message("התראות כבויות במכשיר הזה.", { closeButton: true });
    } catch {
      toast.error("לא הצלחנו לכבות את ההתראות.");
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

  const helpDescription = ios
    ? "באייפון צריך קודם «הוספה למסך הבית», ואז נפתח חלון ההרשאה."
    : denied
      ? android
        ? "באנדרואיד: הגדרות → אפליקציות → Chrome → התראות → אפשר. ואז ב-Chrome: סמל המנעול ליד הכתובת → התראות → אפשר."
        : "כדי לקבל התראות: לחצו על סמל המנעול או «i» ליד הכתובת, בחרו «התראות» → «אפשר», ואז חזרו לכאן ולחצו «הפעילו»."
      : unsupported
        ? "דפדפן זה לא תומך בהתראות דחיפה. נסו Chrome, Firefox, או Safari אחרי «הוספה למסך הבית»."
        : android && !subscribed
          ? "באנדרואיד (כולל Pixel): השתמשו ב-Chrome, אפשרו התראות לאתר, וודאו ש-Chrome לא מוגבל בסוללה (הגדרות → אפליקציות → Chrome → סוללה → ללא הגבלה)."
          : null;

  const primaryLabel = subscribed ? "שמירה" : "הפעילו";

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
          disabled={busy}
          onClick={() => {
            if (ios) {
              setAskOpen(true);
              toast.message("באייפון ההתראות עובדות אחרי «הוספה למסך הבית».");
              return;
            }
            if (denied || unsupported) {
              setAskOpen(true);
              return;
            }
            openSettings();
          }}
        >
          {status === "on" ? (
            <BellRing className="size-4" />
          ) : denied || unsupported ? (
            <BellOff className="size-4" />
          ) : (
            <Bell className="size-4" />
          )}
        </button>
      ) : null}

      <Dialog open={askOpen} onOpenChange={(open) => (open ? setAskOpen(true) : closeDialog())}>
        <DialogContent
          showCloseButton
          initialFocus={false}
          className="border border-orange-500/30 bg-[#1a0d24] text-orange-50 sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle className="text-lg text-orange-100">
              {ios
                ? "התראות באייפון"
                : denied
                  ? "התראות חסומות בדפדפן"
                  : unsupported
                    ? "הדפדפן לא תומך בהתראות"
                    : subscribed
                      ? "התראות פועלות"
                      : "קבלו התראות מהשכונה"}
            </DialogTitle>
            {helpDescription ? (
              <DialogDescription className="text-violet-200/90">{helpDescription}</DialogDescription>
            ) : null}
          </DialogHeader>
          {ios || locked ? null : (
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
              {subscribed ? (
                <>
                  <p className="px-1 text-base text-violet-300/90">
                    כדי לכבות לגמרי במכשיר, כבו את כל הסוגים או לחצו «כבו התראות».
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-orange-400/40 text-orange-100"
                    disabled={busy}
                    onClick={() => void runSelfTest()}
                  >
                    שלחו לי התראת בדיקה
                  </Button>
                </>
              ) : !canEnable ? (
                <p className="px-1 text-base text-amber-200/90">סמנו לפחות סוג אחד, ואז «הפעילו».</p>
              ) : null}
            </div>
          )}
          <DialogFooter className="border-orange-500/15 bg-[#14091c]/80">
            {ios || unsupported ? (
              <Button className="bg-orange-500 text-black hover:bg-orange-400" onClick={closeDialog}>
                הבנתי
              </Button>
            ) : (
              <>
                <Button
                  className="bg-orange-500 text-black hover:bg-orange-400"
                  disabled={busy || (!subscribed && !canEnable)}
                  onClick={() => void save()}
                >
                  {primaryLabel}
                </Button>
                {subscribed ? (
                  <Button
                    variant="ghost"
                    className="text-amber-200"
                    disabled={busy}
                    onClick={() => void disableAll()}
                  >
                    כבו התראות
                  </Button>
                ) : null}
                <Button variant="ghost" className="text-violet-200" disabled={busy} onClick={closeDialog}>
                  ביטול
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { useEffect, useId, useState } from "react";
import { Bell, BellOff, BellRing, Info } from "lucide-react";
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
import { pushAlertsEnabled } from "@/lib/push-enabled";
import { anyPushTopicOn, PUSH_TOPIC_ROWS, PUSH_TOPICS } from "@/lib/push-topics";
import { Button } from "@/components/ui/button";
import { OverlayCloseBar, OverlayCloseButton } from "@/components/overlay-close-button";
import { Dialog, DialogContent, DialogDescription } from "@/components/ui/dialog";
import { HelpText } from "@/components/help-text";
import { useLocale } from "@/hooks/use-locale";
import { formatMessage } from "@/lib/i18n/format";
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

function topicsEqual(a: PushTopicPrefs, b: PushTopicPrefs) {
  return PUSH_TOPICS.every((topic) => a[topic] === b[topic]);
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

function PushAlertsButtonInner() {
  const { dir, t } = useLocale();
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [androidHelpOpen, setAndroidHelpOpen] = useState(false);
  const [topics, setTopics] = useState<PushTopicPrefs>(DEFAULT_PUSH_TOPIC_PREFS);
  const [savedTopics, setSavedTopics] = useState<PushTopicPrefs>(DEFAULT_PUSH_TOPIC_PREFS);

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
      const initial = anyPushTopicOn(stored) ? stored : { ...DEFAULT_PUSH_TOPIC_PREFS };
      setTopics(initial);
      setSavedTopics(initial);
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
  const hasTopicChanges = !topicsEqual(topics, savedTopics);

  function closeDialog() {
    if (subscribed && hasTopicChanges) {
      setTopics(savedTopics);
    }
    setAndroidHelpOpen(false);
    setAskOpen(false);
    if (!subscribed) skipPromptThisSession();
  }

  async function save() {
    if (subscribed) {
      if (!hasTopicChanges) return;
      setBusy(true);
      try {
        const result = await syncPushTopicPrefs(topics);
        setStatus(result);
        if (result !== "on") {
          skipPromptThisSession();
          toast.message(t("pushAlerts.disabledOnDevice"));
          setAskOpen(false);
          return;
        }
        writePushTopicPrefs(topics);
        setSavedTopics(topics);
        setAskOpen(false);
        toast.success(t("pushAlerts.prefsSaved"), { closeButton: true });
      } catch {
        toast.error(t("pushAlerts.prefsSaveFailed"));
        setTopics(savedTopics);
      } finally {
        setBusy(false);
      }
      return;
    }
    if (!canEnable) return;
    setBusy(true);
    try {
      const result = await enablePushAlerts(topics);
      setStatus(result);
      if (result === "on") {
        setAskOpen(false);
        toast.success(t("pushAlerts.subscribed"), { closeButton: true });
        return;
      }
      if (result === "denied") {
        setAskOpen(false);
        toast.message(t("pushAlerts.noPermission"));
        return;
      }
      if (result === "ios-install") {
        toast.message(t("pushAlerts.iosToast"));
        return;
      }
      toast.message(t("pushAlerts.noPermission"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("pushAlerts.blocked"));
    } finally {
      setBusy(false);
    }
  }

  async function runSelfTest() {
    setBusy(true);
    try {
      const result = await sendSelfPushTest();
      if (result.ok) {
        toast.success(
          formatMessage(t("pushAlerts.testOk"), { count: String(result.total ?? 1) }),
        );
        return;
      }
      if (result.local) {
        toast.message(
          result.registered ? t("pushAlerts.testLocalRegistered") : t("pushAlerts.testLocalSync"),
        );
        return;
      }
      if (!result.registered) {
        toast.error(result.error ?? t("pushAlerts.testNotRegistered"));
        return;
      }
      toast.error(result.error ?? t("pushAlerts.testFailed"));
    } catch {
      toast.error(t("pushAlerts.testError"));
    } finally {
      setBusy(false);
    }
  }

  function toggleTopic(id: PushTopic, on: boolean) {
    const next = { ...topics, [id]: on };
    setTopics(next);
    if (!subscribed) writePushTopicPrefs(next);
  }

  async function disableAll() {
    const off = { newHouse: false, houseStatus: false, admin: false };
    setTopics(off);
    setSavedTopics(off);
    setBusy(true);
    try {
      await disablePushAlerts();
      setStatus("off");
      writePushTopicPrefs(off);
      setAskOpen(false);
      toast.message(t("pushAlerts.disabledOnDevice"), { closeButton: true });
    } catch {
      toast.error(t("pushAlerts.disableFailed"));
      const stored = readPushTopicPrefs();
      setTopics(stored);
      setSavedTopics(stored);
    } finally {
      setBusy(false);
    }
  }

  function openSettings() {
    const stored = readPushTopicPrefs();
    const initial =
      subscribed || anyPushTopicOn(stored) ? stored : { ...DEFAULT_PUSH_TOPIC_PREFS };
    setTopics(initial);
    setSavedTopics(initial);
    setAskOpen(true);
  }

  const title =
    status === "on"
      ? t("pushAlerts.bellOn")
      : status === "denied"
        ? t("pushAlerts.bellDenied")
        : status === "ios-install"
          ? t("pushAlerts.bellIos")
          : status === "unsupported"
            ? t("pushAlerts.bellUnsupported")
            : t("pushAlerts.bellOff");

  const helpDescriptionKey = ios
    ? "pushAlerts.helpIos"
    : denied
      ? android
        ? "pushAlerts.helpDeniedAndroid"
        : "pushAlerts.helpDeniedGeneric"
      : unsupported
        ? "pushAlerts.helpUnsupported"
        : null;

  const showAndroidHelp = android && !ios && !unsupported && !subscribed && !denied;

  const primaryLabel = subscribed ? t("pushAlerts.save") : t("pushAlerts.enable");
  const primaryDisabled = busy || (subscribed ? !hasTopicChanges : !canEnable);
  const titleId = useId();
  const dialogTitle = ios
    ? t("pushAlerts.dialogIos")
    : denied
      ? t("pushAlerts.dialogDenied")
      : unsupported
        ? t("pushAlerts.dialogUnsupported")
        : subscribed
          ? t("pushAlerts.dialogOn")
          : t("pushAlerts.dialogOff");

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
              toast.message(t("pushAlerts.iosToast"));
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
          showCloseButton={false}
          initialFocus={false}
          dir={dir}
          aria-labelledby={titleId}
          className="gap-0 border border-orange-500/30 bg-[#1a0d24] p-0 text-orange-50 sm:max-w-md"
        >
          <div
            className={cn(
              "hw-overlay-close-bar hw-overlay-close-bar--compact hw-overlay-close-bar--titled",
              "border-b border-orange-500/15 pb-2",
            )}
          >
            <OverlayCloseButton onClick={closeDialog} />
            <div className="hw-overlay-close-bar-title">
              <div id={titleId} className="font-display text-xl leading-tight text-orange-200">
                {dialogTitle}
              </div>
            </div>
            {showAndroidHelp ? (
              <button
                type="button"
                className="hw-overlay-close text-violet-200 hover:text-orange-200"
                aria-label={t("pushAlerts.androidHelpAria")}
                onClick={() => setAndroidHelpOpen(true)}
              >
                <Info className="size-5" />
              </button>
            ) : (
              <div className="hw-overlay-close-bar-spacer" aria-hidden />
            )}
          </div>
          {helpDescriptionKey ? (
            <DialogDescription className="px-4 pt-3 text-violet-200/90">
              <HelpText>{t(helpDescriptionKey)}</HelpText>
            </DialogDescription>
          ) : null}
          {ios || locked ? null : (
            <div className="grid gap-2 px-4 pt-3">
              {PUSH_TOPIC_ROWS.map((row) => (
                <TopicSwitch
                  key={row.id}
                  title={
                    row.id === "newHouse"
                      ? t("settings.pushTopicNewHouse")
                      : t("settings.pushTopicAdmin")
                  }
                  hint={
                    row.id === "newHouse"
                      ? t("settings.pushTopicNewHouseHint")
                      : t("settings.pushTopicAdminHint")
                  }
                  on={topics[row.id]}
                  disabled={busy || locked}
                  onChange={(next) => void toggleTopic(row.id, next)}
                />
              ))}
              {subscribed ? (
                <Button
                  type="button"
                  variant="outline"
                  className="border-orange-400/40 text-orange-100"
                  disabled={busy}
                  onClick={() => void runSelfTest()}
                >
                  {t("pushAlerts.selfTest")}
                </Button>
              ) : !canEnable ? (
                <p className="px-1 text-base text-amber-200/90">
                  <HelpText>{t("pushAlerts.pickOne")}</HelpText>
                </p>
              ) : null}
            </div>
          )}
          <div className="space-y-2 border-t border-orange-500/15 bg-[#14091c]/80 px-4 py-3">
            {ios || unsupported ? (
              <Button
                size="sm"
                className="h-10 w-full bg-orange-500 text-black hover:bg-orange-400"
                onClick={closeDialog}
              >
                {t("pushAlerts.understood")}
              </Button>
            ) : (
              <>
                {subscribed ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-full text-amber-200"
                    disabled={busy}
                    onClick={() => void disableAll()}
                  >
                    {t("pushAlerts.disableAll")}
                  </Button>
                ) : null}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="h-10 bg-orange-500 text-black hover:bg-orange-400"
                    disabled={primaryDisabled}
                    onClick={() => void save()}
                  >
                    {primaryLabel}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 border-orange-400/40 text-violet-200"
                    disabled={busy}
                    onClick={closeDialog}
                  >
                    {t("pushAlerts.close")}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={androidHelpOpen} onOpenChange={setAndroidHelpOpen}>
        <DialogContent
          showCloseButton={false}
          dir={dir}
          className="gap-0 border border-orange-500/30 bg-[#1a0d24] p-0 text-orange-50 sm:max-w-sm"
        >
          <OverlayCloseBar
            compact
            onClose={() => setAndroidHelpOpen(false)}
            title={t("pushAlerts.androidHelpTitle")}
            className="border-b border-orange-500/15 pb-2"
          />
          <p className="px-4 py-4 text-base leading-relaxed text-violet-200">
            {t("pushAlerts.androidHelp")}
          </p>
          <div className="border-t border-orange-500/15 px-4 py-3">
            <Button
              type="button"
              className="h-10 w-full bg-orange-500 text-black hover:bg-orange-400"
              onClick={() => setAndroidHelpOpen(false)}
            >
              {t("pushAlerts.understood")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function PushAlertsButton() {
  if (!pushAlertsEnabled()) return null;
  return <PushAlertsButtonInner />;
}

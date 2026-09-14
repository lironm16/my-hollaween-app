"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { toast } from "sonner";
import {
  DEFAULT_PUSH_TOPIC_PREFS,
  readPushPref,
  readPushStatus,
  readPushTopicPrefs,
  syncPushTopicPrefs,
  writePushTopicPrefs,
  type PushTopic,
  type PushTopicPrefs,
} from "@/lib/push-client";
import { anyPushTopicOn, PUSH_TOPIC_ROWS, PUSH_TOPICS } from "@/lib/push-topics";
import {
  ROUTE_PROMPT_EVENT,
  ROUTE_PROMPT_KINDS,
  ROUTE_PROMPT_LABELS,
  setSkipRoutePrompt,
  shouldSkipRoutePrompt,
  type RoutePromptKind,
} from "@/lib/route-prompts";
import { cn } from "@/lib/utils";

function subscribeRoutePrompts(onStoreChange: () => void) {
  window.addEventListener(ROUTE_PROMPT_EVENT, onStoreChange);
  return () => window.removeEventListener(ROUTE_PROMPT_EVENT, onStoreChange);
}

function readRoutePromptSnapshot() {
  return ROUTE_PROMPT_KINDS.map((kind) => !shouldSkipRoutePrompt(kind)).join("\0");
}

function SettingSwitch({
  on,
  disabled,
  title,
  hint,
  onChange,
}: {
  on: boolean;
  disabled?: boolean;
  title: string;
  hint?: string;
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
        {hint ? <span className="mt-0.5 block text-base text-violet-300">{hint}</span> : null}
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

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-[#241332] p-2.5 ring-1 ring-white/10">
      <h2 className="mb-2 text-base font-semibold text-orange-400">{title}</h2>
      <div className="grid gap-2">{children}</div>
    </section>
  );
}

export function DeviceSettings() {
  const routePromptSnapshot = useSyncExternalStore(
    subscribeRoutePrompts,
    readRoutePromptSnapshot,
    () => "",
  );
  const [topics, setTopics] = useState<PushTopicPrefs>(DEFAULT_PUSH_TOPIC_PREFS);
  const [savedTopics, setSavedTopics] = useState<PushTopicPrefs>(DEFAULT_PUSH_TOPIC_PREFS);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);

  useEffect(() => {
    const stored = readPushTopicPrefs();
    const initial = anyPushTopicOn(stored) ? stored : { ...DEFAULT_PUSH_TOPIC_PREFS };
    setTopics(initial);
    setSavedTopics(initial);
    void readPushStatus().then((status) => setPushSubscribed(status === "on"));
    const onPushChange = () => {
      void readPushStatus().then((status) => setPushSubscribed(status === "on"));
    };
    window.addEventListener("hw-push-changed", onPushChange);
    return () => window.removeEventListener("hw-push-changed", onPushChange);
  }, []);

  const routePrompts = ROUTE_PROMPT_KINDS.map((kind) => ({
    kind,
    show: !shouldSkipRoutePrompt(kind),
  }));
  void routePromptSnapshot;

  function setRoutePromptVisible(kind: RoutePromptKind, show: boolean) {
    setSkipRoutePrompt(kind, !show);
  }

  async function savePushTopics(next: PushTopicPrefs) {
    setTopics(next);
    if (!pushSubscribed && readPushPref() !== "on") {
      writePushTopicPrefs(next);
      setSavedTopics(next);
      return;
    }
    setPushBusy(true);
    try {
      const result = await syncPushTopicPrefs(next);
      if (result !== "on" && anyPushTopicOn(next)) {
        writePushTopicPrefs(next);
        setSavedTopics(next);
        toast.message("ההעדפות נשמרו במכשיר. הפעילו התראות דרך סמל הפעמון.");
        return;
      }
      writePushTopicPrefs(next);
      setSavedTopics(next);
      setPushSubscribed(result === "on");
      toast.success("ההעדפות נשמרו.", { closeButton: true });
    } catch {
      toast.error("לא הצלחנו לשמור את ההעדפות.");
      setTopics(savedTopics);
    } finally {
      setPushBusy(false);
    }
  }

  function toggleTopic(id: PushTopic, on: boolean) {
    const next = { ...topics, [id]: on };
    void savePushTopics(next);
  }

  return (
    <div className="space-y-3" dir="rtl">
      <SettingsSection title="אישורי מסלול וסינון">
        <p className="px-1 text-sm text-violet-300">
          ההגדרות נשמרות רק במכשיר הזה. כיבוי «לא להציג שוב» בחלון האישור אפשר לבטל כאן.
        </p>
        {routePrompts.map(({ kind, show }) => {
          const labels = ROUTE_PROMPT_LABELS[kind];
          return (
            <SettingSwitch
              key={kind}
              title={labels.title}
              hint={labels.hint}
              on={show}
              onChange={(next) => setRoutePromptVisible(kind, next)}
            />
          );
        })}
      </SettingsSection>

      <SettingsSection title="התראות">
        <p className="px-1 text-sm text-violet-300">
          סוגי ההתראות שיישלחו למכשיר. הפעלה/כיבוי מלא דרך סמל הפעמון בראש המסך.
        </p>
        {PUSH_TOPIC_ROWS.map((row) => (
          <SettingSwitch
            key={row.id}
            title={row.title}
            hint={row.hint}
            on={topics[row.id]}
            disabled={pushBusy}
            onChange={(next) => toggleTopic(row.id, next)}
          />
        ))}
        {!anyPushTopicOn(topics) ? (
          <p className="px-1 text-sm text-amber-200/90">סמנו לפחות סוג אחד כדי לקבל התראות.</p>
        ) : null}
        {PUSH_TOPICS.some((topic) => topics[topic] !== savedTopics[topic]) ? (
          <p className="px-1 text-sm text-violet-400">שומרים אוטומטית…</p>
        ) : null}
      </SettingsSection>
    </div>
  );
}

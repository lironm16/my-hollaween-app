"use client";

import { useEffect, useRef, useState } from "react";
import { Info, Pencil } from "lucide-react";
import { toast } from "sonner";
import { PushNotice } from "@/components/push-notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { readApiJson } from "@/lib/api-json";
import { cn } from "@/lib/utils";
import { senderPushEndpoint, showLocalPush } from "@/lib/push-client";
import { PUSH_TEMPLATE_DISPLAY_ORDER, PushTemplateSign } from "@/components/push-template-signs";
import { fillPushTemplate } from "@/lib/push-templates";
import type { PushKind, PushTemplateMeta } from "@/lib/push-templates";
import { useLocale } from "@/hooks/use-locale";
import { formatMessage } from "@/lib/i18n/format";
import { messagesForLocale } from "@/lib/i18n/translate";

const PREVIEW_HOUSE = {
  name: "בית הדלעת",
  address: "חרוזים 8, חרוזים",
  lat: 32.0916,
  lng: 34.8029,
  ownerFrozenUntil: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
};

function Toggle({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) {
  const { t } = useLocale();
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <span className={cn("text-base", on ? "text-orange-200" : "text-violet-400")}>
        {on ? t("adminDryRun.toggleOn") : t("adminDryRun.toggleOff")}
      </span>
      <button
        type="button"
        dir="ltr"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        onClick={onClick}
        className={cn(
          "flex h-6 w-11 items-center rounded-full p-0.5 transition disabled:opacity-60",
          on ? "justify-end bg-orange-500" : "justify-start bg-violet-900 ring-1 ring-orange-500/20",
        )}
      >
        <span className="size-5 rounded-full bg-white shadow" />
      </button>
    </span>
  );
}

export function AdminPushPanel() {
  const { locale, t } = useLocale();
  const [templates, setTemplates] = useState<PushTemplateMeta[]>([]);
  const [busy, setBusy] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [expanded, setExpanded] = useState<PushKind | null>(null);
  const [infoOpen, setInfoOpen] = useState<PushKind | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const loadGen = useRef(0);
  const savingRef = useRef(false);
  const savedAtRef = useRef(0);
  const expandedRef = useRef<PushKind | null>(null);
  expandedRef.current = expanded;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (savingRef.current || expandedRef.current || Date.now() - savedAtRef.current < 2500) return;
      const gen = ++loadGen.current;
      try {
        const res = await fetch("/api/admin/push/templates", { cache: "no-store", credentials: "include" });
        const data = (await res.json()) as { templates?: PushTemplateMeta[]; error?: string };
        if (cancelled || gen !== loadGen.current || savingRef.current) return;
        if (!res.ok) {
          toast.error(data.error ?? t("adminSettings.push.loadTemplatesFailed"));
          return;
        }
        if (Array.isArray(data.templates)) setTemplates(data.templates);
      } catch {
        if (!cancelled && gen === loadGen.current) toast.error(t("adminSettings.common.noServer"));
      }
    }
    void load();
    const onVis = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [t]);

  async function persist(next: PushTemplateMeta[], rollback?: PushTemplateMeta[]) {
    const prev = rollback ?? templates;
    savingRef.current = true;
    loadGen.current += 1;
    setTemplates(next);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/push/templates", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templates: next.map((item) => ({
            id: item.id,
            enabled: item.enabled,
            title: item.title,
            body: item.body,
          })),
        }),
      });
      const data = await readApiJson<{ error?: string; templates?: PushTemplateMeta[] }>(res);
      if (!res.ok) {
        setTemplates(prev);
        toast.error(data.error ?? t("adminSettings.common.saveFailed"));
        return false;
      }
      if (Array.isArray(data.templates) && data.templates.length > 0) {
        setTemplates(
          [...data.templates].sort(
            (a, b) => PUSH_TEMPLATE_DISPLAY_ORDER.indexOf(a.id) - PUSH_TEMPLATE_DISPLAY_ORDER.indexOf(b.id),
          ),
        );
        savedAtRef.current = Date.now();
      }
      return true;
    } catch {
      setTemplates(prev);
      toast.error(t("adminSettings.common.noServer"));
      return false;
    } finally {
      savingRef.current = false;
      setBusy(false);
    }
  }

  function patch(id: PushKind, fields: Partial<Pick<PushTemplateMeta, "enabled" | "title" | "body">>) {
    const next = templates.map((item) => (item.id === id ? { ...item, ...fields } : item));
    void persist(next, templates);
  }

  function openEdit(item: PushTemplateMeta) {
    setExpanded(item.id);
    setInfoOpen(null);
    setDraftTitle(item.title);
    setDraftBody(item.body);
  }

  function cancelEdit() {
    setExpanded(null);
    setDraftTitle("");
    setDraftBody("");
  }

  function toggleInfo(kind: PushKind) {
    setInfoOpen((prev) => (prev === kind ? null : kind));
  }

  async function saveEdit() {
    if (!expanded) return;
    setSavingEdit(true);
    try {
      const ok = await persist(
        templates.map((item) =>
          item.id === expanded ? { ...item, title: draftTitle, body: draftBody } : item,
        ),
      );
      if (ok) {
        toast.success(t("adminSettings.push.templateSaved"));
        cancelEdit();
      }
    } finally {
      setSavingEdit(false);
    }
  }

  async function sendBroadcast() {
    setSending(true);
    try {
      const includeEndpoint = await senderPushEndpoint();
      const res = await fetch("/api/admin/push", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          includeEndpoint,
        }),
      });
      const data = await readApiJson<{
        error?: string;
        sent?: number;
        attempted?: number;
        failed?: number;
        title?: string;
        body?: string;
      }>(res);
      if (!res.ok) {
        toast.error(data.error ?? t("adminSettings.common.sendFailed"));
        return;
      }
      const sent = data.sent ?? 0;
      const attempted = data.attempted ?? sent;
      if (attempted === 0) {
        toast.warning(t("adminSettings.push.noSubscribers"));
      } else if (sent === 0) {
        toast.error(t("adminSettings.push.allSubscribersFailed"));
      } else if (sent < attempted) {
        toast.warning(
          formatMessage(t("adminSettings.push.partialSent"), {
            sent: String(sent),
            attempted: String(attempted),
            failed: String(data.failed ?? attempted - sent),
          }),
        );
      } else {
        toast.success(
          formatMessage(t("adminSettings.common.sentCount"), { count: String(sent) }),
        );
      }
      await showLocalPush(data.title ?? title.trim(), data.body ?? body.trim());
      setTitle("");
      setBody("");
    } catch {
      toast.error(t("adminSettings.common.noServer"));
    } finally {
      setSending(false);
    }
  }

  const sortedTemplates = [...templates].sort(
    (a, b) => PUSH_TEMPLATE_DISPLAY_ORDER.indexOf(a.id) - PUSH_TEMPLATE_DISPLAY_ORDER.indexOf(b.id),
  );

  function renderTemplate(item: PushTemplateMeta) {
    const kindLabel = messagesForLocale(locale).pushKinds[item.id] ?? item.label;
    const open = expanded === item.id;
    const draftChanged =
      open &&
      (draftTitle.trim() !== item.title.trim() || draftBody.trim() !== item.body.trim());

    const isInfoOpen = infoOpen === item.id;
    const previewPayload = {
      ...fillPushTemplate({ title: open ? draftTitle : item.title, body: open ? draftBody : item.body }, PREVIEW_HOUSE),
      url: "/",
    };

    return (
      <article
        key={item.id}
        className="space-y-2 rounded-lg bg-[#12081a]/80 p-2 ring-1 ring-orange-500/15"
      >
        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-base font-medium text-orange-100">
            <span>{kindLabel}</span>
            {item.auto ? (
              <span className="shrink-0 rounded-full bg-orange-500/20 px-1.5 py-0.5 text-sm font-medium text-orange-200">
                {t("adminSettings.push.auto")}
              </span>
            ) : null}
          </p>
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label={
                  open
                    ? t("adminSettings.push.closeEdit")
                    : formatMessage(t("adminSettings.push.editTemplate"), { label: kindLabel })
                }
                aria-pressed={open}
                className={cn(
                  "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-orange-200 ring-1 ring-orange-500/20 hover:bg-orange-500/15",
                  open && "bg-orange-500 text-black ring-orange-400",
                )}
                onClick={() => (open ? cancelEdit() : openEdit(item))}
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => toggleInfo(item.id)}
                className={cn(
                  "inline-flex size-7 shrink-0 items-center justify-center rounded-md ring-1 transition",
                  isInfoOpen
                    ? "bg-orange-500/20 text-orange-100 ring-orange-400/50"
                    : "text-violet-300 ring-orange-500/20 hover:bg-orange-500/10 hover:text-orange-100",
                )}
                aria-label={t("adminSettings.push.explainAria")}
                title={t("adminSettings.push.explainTitle")}
              >
                <Info className="size-3.5" />
              </button>
            </div>
            <Toggle
              on={item.enabled}
              disabled={busy}
              onClick={() => void patch(item.id, { enabled: !item.enabled })}
            />
          </div>
        </div>

        {isInfoOpen ? (
          <p className="rounded-md bg-[#0c0612]/80 px-2 py-1.5 text-base leading-snug text-violet-300 ring-1 ring-orange-500/10">
            {item.hint}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-center gap-2" dir="ltr">
          <PushTemplateSign kind={item.id} />
        </div>

        {open ? (
          <form
            className="space-y-1.5"
            onSubmit={(event) => {
              event.preventDefault();
              void saveEdit();
            }}
          >
            <Input
              value={draftTitle}
              maxLength={80}
              disabled={savingEdit}
              className="h-8 bg-[#0c0612] text-base"
              onChange={(event) => setDraftTitle(event.target.value)}
            />
            <Textarea
              value={draftBody}
              maxLength={280}
              rows={2}
              disabled={savingEdit}
              className="min-h-[3.5rem] bg-[#0c0612] text-base"
              onChange={(event) => setDraftBody(event.target.value)}
            />
            <PushNotice payload={previewPayload} />
            <div className="flex gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={savingEdit || !draftTitle.trim() || !draftBody.trim() || !draftChanged}
                className="min-h-10 flex-1 bg-orange-500 text-black hover:bg-orange-400"
              >
                {savingEdit ? t("adminSettings.push.saving") : t("adminSettings.common.save")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={savingEdit}
                className="min-h-10 flex-1 text-violet-200"
                onClick={cancelEdit}
              >
                {t("adminSettings.push.close")}
              </Button>
            </div>
          </form>
        ) : (
          <PushNotice payload={previewPayload} />
        )}
      </article>
    );
  }

  return (
    <div className="space-y-4">
      <form
        className="space-y-2 rounded-xl bg-black/25 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void sendBroadcast();
        }}
      >
        <p className="text-base font-medium text-amber-100">{t("adminSettings.push.oneShotTitle")}</p>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t("adminSettings.common.titlePlaceholder")}
          maxLength={80}
          className="h-9 bg-[#12081a] text-base"
        />
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={t("adminSettings.common.bodyPlaceholder")}
          maxLength={280}
          rows={2}
          className="min-h-[4rem] bg-[#12081a] text-base"
        />
        <Button
          type="submit"
          size="sm"
          disabled={sending || !title.trim() || !body.trim()}
          className="bg-orange-500 text-black hover:bg-orange-400"
        >
          {sending ? t("adminSettings.common.sending") : t("adminSettings.common.sendToAll")}
        </Button>
      </form>

      <div className="space-y-2 rounded-xl bg-black/25 p-3">
        <p className="text-base font-medium text-amber-100">{t("adminSettings.push.templatesTitle")}</p>
        {templates.length === 0 ? (
          <p className="text-base text-violet-400">{t("adminSettings.push.loadingTemplates")}</p>
        ) : (
          <div className="space-y-1.5">{sortedTemplates.map(renderTemplate)}</div>
        )}
      </div>
    </div>
  );
}

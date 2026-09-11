"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { HousePicker } from "@/components/house-picker";
import { PushNotice } from "@/components/push-notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { readApiJson } from "@/lib/api-json";
import { cn } from "@/lib/utils";
import { senderPushEndpoint, showLocalPush } from "@/lib/push-client";
import {
  PUSH_TEMPLATE_DISPLAY_ORDER,
  PushOwnerChoiceLegend,
  PushTemplateSign,
} from "@/components/push-template-signs";
import { fillPushTemplate } from "@/lib/push-templates";
import type { PushKind, PushTemplateMeta } from "@/lib/push-templates";
import type { PublicHouse } from "@/lib/types";

function Toggle({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <span className={cn("text-base", on ? "text-orange-200" : "text-violet-400")}>
        {on ? "פועל" : "כבוי"}
      </span>
      <button
        type="button"
        dir="ltr"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        onClick={onClick}
        className={cn(
          "flex h-6 w-11 items-center rounded-full p-0.5 transition",
          on ? "justify-end bg-orange-500" : "justify-start bg-violet-900 ring-1 ring-orange-500/20",
        )}
      >
        <span className="size-5 rounded-full bg-white shadow" />
      </button>
    </span>
  );
}

async function showSenderNotice(title: string, body: string) {
  await showLocalPush(title, body);
}

export function AdminPushPanel() {
  const [templates, setTemplates] = useState<PushTemplateMeta[]>([]);
  const [houses, setHouses] = useState<PublicHouse[]>([]);
  const [sendHouse, setSendHouse] = useState<PublicHouse | null>(null);
  const sendHouseId = sendHouse?.id ?? "";
  const [busy, setBusy] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [expanded, setExpanded] = useState<PushKind | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendingKind, setSendingKind] = useState<PushKind | null>(null);
  const loadGen = useRef(0);
  const savingRef = useRef(false);
  const expandedRef = useRef<PushKind | null>(null);
  expandedRef.current = expanded;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (savingRef.current || expandedRef.current) return;
      const gen = ++loadGen.current;
      try {
        const res = await fetch("/api/admin/push/templates", { cache: "no-store", credentials: "include" });
        const data = (await res.json()) as { templates?: PushTemplateMeta[]; error?: string };
        if (cancelled || gen !== loadGen.current || savingRef.current) return;
        if (!res.ok) {
          toast.error(data.error ?? "לא הצלחנו לטעון תבניות");
          return;
        }
        if (Array.isArray(data.templates)) setTemplates(data.templates);
      } catch {
        if (!cancelled && gen === loadGen.current) toast.error("אין קשר לשרת");
      }
    }
    void load();
    void fetch("/api/catalog", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { houses?: PublicHouse[] }) => {
        if (cancelled) return;
        if (Array.isArray(data.houses)) setHouses(data.houses);
      })
      .catch(() => undefined);
    const onVis = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  async function persist(next: PushTemplateMeta[]) {
    const prev = templates;
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
        toast.error(data.error ?? "השמירה נכשלה");
        return false;
      }
      if (Array.isArray(data.templates) && data.templates.length > 0) {
        const byId = new Map(data.templates.map((item) => [item.id, item]));
        setTemplates(next.map((item) => byId.get(item.id) ?? item));
      }
      return true;
    } catch {
      setTemplates(prev);
      toast.error("אין קשר לשרת");
      return false;
    } finally {
      savingRef.current = false;
      setBusy(false);
    }
  }

  function patch(id: PushKind, fields: Partial<Pick<PushTemplateMeta, "enabled" | "title" | "body">>) {
    return persist(templates.map((item) => (item.id === id ? { ...item, ...fields } : item)));
  }

  function openEdit(item: PushTemplateMeta) {
    setExpanded(item.id);
    setDraftTitle(item.title);
    setDraftBody(item.body);
  }

  function cancelEdit() {
    setExpanded(null);
    setDraftTitle("");
    setDraftBody("");
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
        toast.success("התבנית נשמרה");
        cancelEdit();
      }
    } finally {
      setSavingEdit(false);
    }
  }

  async function sendKind(kind: PushKind) {
    if (!sendHouseId) {
      toast.error("בחרו בית לשליחה");
      return;
    }
    setSendingKind(kind);
    try {
      const includeEndpoint = await senderPushEndpoint();
      const res = await fetch(`/api/houses/${encodeURIComponent(sendHouseId)}/notify`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, includeEndpoint }),
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
        toast.error(data.error ?? "השליחה נכשלה");
        return;
      }
      const sent = data.sent ?? 0;
      const attempted = data.attempted ?? sent;
      if (sent < attempted) {
        toast.warning(`נשלח ל־${sent} מתוך ${attempted} מכשירים (${data.failed ?? attempted - sent} נכשלו)`);
      } else {
        toast.success(`נשלח ל־${sent} מכשירים`);
      }
      await showSenderNotice(data.title ?? "", data.body ?? "");
      window.dispatchEvent(new Event("hw-admin-stats-refresh"));
    } catch {
      toast.error("אין קשר לשרת");
    } finally {
      setSendingKind(null);
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
        toast.error(data.error ?? "השליחה נכשלה");
        return;
      }
      const sent = data.sent ?? 0;
      const attempted = data.attempted ?? sent;
      if (sent < attempted) {
        toast.warning(`נשלח ל־${sent} מתוך ${attempted} מכשירים (${data.failed ?? attempted - sent} נכשלו)`);
      } else {
        toast.success(`נשלח ל־${sent} מכשירים`);
      }
      await showSenderNotice(data.title ?? title.trim(), data.body ?? body.trim());
      window.dispatchEvent(new Event("hw-admin-stats-refresh"));
      setTitle("");
      setBody("");
    } catch {
      toast.error("אין קשר לשרת");
    } finally {
      setSending(false);
    }
  }

  const sortedTemplates = [...templates].sort(
    (a, b) => PUSH_TEMPLATE_DISPLAY_ORDER.indexOf(a.id) - PUSH_TEMPLATE_DISPLAY_ORDER.indexOf(b.id),
  );
  const templatesByKind = new Map(sortedTemplates.map((item) => [item.id, item]));

  function renderTemplate(item: PushTemplateMeta) {
    const open = expanded === item.id;
    const draftChanged =
      open &&
      (draftTitle.trim() !== item.title.trim() || draftBody.trim() !== item.body.trim());

    return (
      <article
        key={item.id}
        className="space-y-1.5 rounded-lg bg-[#12081a]/80 p-2 ring-1 ring-orange-500/15"
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-label={open ? "סגירת עריכה" : `עריכת ${item.label}`}
                aria-pressed={open}
                className={cn(
                  "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-orange-200 ring-1 ring-orange-500/20 hover:bg-orange-500/15",
                  open && "bg-orange-500 text-black ring-orange-400",
                )}
                onClick={() => (open ? cancelEdit() : openEdit(item))}
              >
                <Pencil className="size-3.5" />
              </button>
              <PushTemplateSign kind={item.id} />
              {item.auto ? (
                <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-base font-medium text-orange-200">
                  אוטומטי
                </span>
              ) : null}
            </div>
            {open ? <p className="mt-1 text-base text-violet-300">{item.hint}</p> : null}
          </div>
          <Toggle
            on={item.enabled}
            disabled={busy}
            onClick={() => void patch(item.id, { enabled: !item.enabled })}
          />
        </div>
        {item.auto ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!item.enabled || !sendHouseId || sendingKind !== null}
            className="border-orange-400/40 text-orange-100"
            onClick={() => void sendKind(item.id)}
          >
            {sendingKind === item.id ? "שולחים…" : "שליחה לבית שנבחר"}
          </Button>
        ) : null}
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
            <PushNotice
              payload={{
                ...fillPushTemplate(
                  { title: draftTitle, body: draftBody },
                  {
                    name: "בית הדלעת",
                    address: "חרוזים 8, חרוזים",
                    lat: 32.0916,
                    lng: 34.8029,
                    ownerFrozenUntil: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
                  },
                ),
                url: "/",
              }}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={savingEdit}
                className="text-violet-200"
                onClick={cancelEdit}
              >
                סגור
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingEdit || !draftTitle.trim() || !draftBody.trim() || !draftChanged}
                className="bg-orange-500 text-black hover:bg-orange-400"
              >
                {savingEdit ? "שומרים…" : "שמירה"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="rounded-md bg-[#0c0612]/80 px-2 py-1.5 ring-1 ring-orange-500/10">
            <p className="text-base font-medium text-orange-50">{item.title}</p>
            <p className="mt-0.5 whitespace-pre-line text-base leading-snug text-violet-200">
              {item.body}
            </p>
          </div>
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
        <p className="text-base font-medium text-amber-100">הודעה חד־פעמית לכולם</p>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="כותרת"
          maxLength={80}
          className="h-9 bg-[#12081a] text-base"
        />
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="למשל: הגשם מתחיל, הממתקים בחוץ עד 21:00"
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
          {sending ? "שולחים…" : "שליחה לכולם"}
        </Button>
      </form>

      <div className="space-y-2 rounded-xl bg-black/25 p-3">
        <p className="text-base font-medium text-amber-100">מקרא ותבניות</p>
        <div className="space-y-2 rounded-lg bg-[#12081a]/60 p-2.5 ring-1 ring-orange-500/10">
          <p className="text-base font-medium text-orange-100">שדות בתבנית</p>
          <ul className="space-y-1 text-base text-violet-300">
            <li>
              <span className="font-mono text-orange-200">{`{nickname}`}</span> — שם הבית
            </li>
            <li>
              <span className="font-mono text-orange-200">{`{place}`}</span> — כתובת מקוצרת
            </li>
            <li>
              <span className="font-mono text-orange-200">{`{backLine}`}</span> — שורה על חזרה מההפסקה
              («נחזור ב־20:00») רק אם נקבעה שעה. בלי שעה — השורה לא מופיעה.
            </li>
          </ul>
        </div>
        <PushOwnerChoiceLegend templatesByKind={templatesByKind} />
        <p className="text-base text-violet-300">
          כבוי = התבנית לא נשלחת. אחרי שמירת סטטוס, בעל הבית יכול לאשר שליחה — חוץ מבית חדש (אוטומטי).
        </p>
        <div className="space-y-1">
          <span className="text-base text-violet-200">בית לשליחה ידנית (בדיקה)</span>
          <HousePicker
            houses={houses}
            selected={sendHouse}
            onSelect={setSendHouse}
            placeholder="הקלידו שם או כתובת"
          />
        </div>

        {templates.length === 0 ? (
          <p className="text-base text-violet-400">טוענים תבניות…</p>
        ) : (
          <div className="space-y-1.5">{sortedTemplates.map(renderTemplate)}</div>
        )}
      </div>
    </div>
  );
}

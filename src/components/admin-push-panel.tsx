"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { readApiJson } from "@/lib/api-json";
import { cn } from "@/lib/utils";
import type { PushKind, PushTemplateMeta } from "@/lib/push-templates";

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

async function senderPushEndpoint() {
  try {
    const reg = await navigator.serviceWorker.ready;
    return (await reg.pushManager.getSubscription())?.endpoint;
  } catch {
    return undefined;
  }
}

async function showSenderNotice(title: string, body: string) {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      lang: "he",
      dir: "rtl",
      tag: "admin-broadcast",
      data: { url: "/" },
    });
  } catch {
    /* ignore */
  }
}

export function AdminPushPanel() {
  const [templates, setTemplates] = useState<PushTemplateMeta[]>([]);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<PushKind | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    void fetch("/api/admin/push/templates", { cache: "no-store", credentials: "include" })
      .then((res) => res.json())
      .then((data: { templates?: PushTemplateMeta[] }) => {
        if (Array.isArray(data.templates)) setTemplates(data.templates);
      })
      .catch(() => undefined);
  }, []);

  async function persist(next: PushTemplateMeta[]) {
    const prev = templates;
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
      if (data.templates) setTemplates(data.templates);
      return true;
    } catch {
      setTemplates(prev);
      toast.error("אין קשר לשרת");
      return false;
    } finally {
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
    const ok = await patch(expanded, { title: draftTitle, body: draftBody });
    if (ok) {
      toast.success("התבנית נשמרה");
      cancelEdit();
    }
  }

  async function sendBroadcast() {
    setSending(true);
    try {
      const includeEndpoint = await senderPushEndpoint();
      const res = await fetch("/api/admin/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          includeEndpoint,
        }),
      });
      const data = await readApiJson<{ error?: string; sent?: number; title?: string; body?: string }>(res);
      if (!res.ok) {
        toast.error(data.error ?? "השליחה נכשלה");
        return;
      }
      toast.success(`נשלח ל־${data.sent ?? 0} מכשירים`);
      await showSenderNotice(data.title ?? title.trim(), data.body ?? body.trim());
      setTitle("");
      setBody("");
    } catch {
      toast.error("אין קשר לשרת");
    } finally {
      setSending(false);
    }
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
        <p className="text-base text-violet-300">גם אתם תקבלו את ההתראה במכשיר הזה.</p>
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
        <p className="text-base font-medium text-amber-100">תבניות</p>
        <p className="text-base text-violet-300">
          {`מציינים {nickname} {place} {backLine}. כבוי = לא נשלח בכלל. הפסקה, חזרה מההפסקה ובית חדש נשלחים אוטומטית.`}
        </p>

        <div className="space-y-1.5">
          {templates.length === 0 ? (
            <p className="text-base text-violet-400">טוענים תבניות…</p>
          ) : (
            templates.map((item) => {
              const open = expanded === item.id;
              return (
                <article
                  key={item.id}
                  className="space-y-1.5 rounded-lg bg-[#12081a]/80 p-2 ring-1 ring-orange-500/15"
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
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
                        <p className="min-w-0 flex-1 text-base font-medium text-orange-100">{item.label}</p>
                      </div>
                      <p className="text-base text-violet-300">
                        {item.auto ? "אוטומטי" : "בעל הבית שולח אחרי שמירה"}
                      </p>
                    </div>
                    <Toggle
                      on={item.enabled}
                      disabled={busy}
                      onClick={() => void patch(item.id, { enabled: !item.enabled })}
                    />
                  </div>
                  {open ? (
                    <>
                      <p className="text-base text-violet-400">{item.hint}</p>
                      <Input
                        value={draftTitle}
                        maxLength={80}
                        disabled={busy}
                        className="h-8 bg-[#0c0612] text-base"
                        onChange={(event) => setDraftTitle(event.target.value)}
                      />
                      <Textarea
                        value={draftBody}
                        maxLength={280}
                        rows={2}
                        disabled={busy}
                        className="min-h-[3.5rem] bg-[#0c0612] text-base"
                        onChange={(event) => setDraftBody(event.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          className="text-violet-200"
                          onClick={cancelEdit}
                        >
                          ביטול
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={busy || !draftTitle.trim() || !draftBody.trim()}
                          className="bg-orange-500 text-black hover:bg-orange-400"
                          onClick={() => void saveEdit()}
                        >
                          {busy ? "שומרים…" : "שמירה"}
                        </Button>
                      </div>
                    </>
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
            })
          )}
        </div>
      </div>
    </div>
  );
}

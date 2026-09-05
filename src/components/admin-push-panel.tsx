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
      <span className={cn("text-[11px]", on ? "text-orange-200" : "text-violet-400")}>
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

export function AdminPushPanel() {
  const [templates, setTemplates] = useState<PushTemplateMeta[]>([]);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<PushKind | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    void fetch("/api/admin/push/templates", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { templates?: PushTemplateMeta[] }) => {
        if (Array.isArray(data.templates)) setTemplates(data.templates);
      })
      .catch(() => undefined);
  }, []);

  async function persist(next: PushTemplateMeta[]) {
    setTemplates(next);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/push/templates", {
        method: "PUT",
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
        toast.error(data.error ?? "השמירה נכשלה");
        return;
      }
      if (data.templates) setTemplates(data.templates);
    } catch {
      toast.error("אין קשר לשרת");
    } finally {
      setBusy(false);
    }
  }

  function patch(id: PushKind, fields: Partial<Pick<PushTemplateMeta, "enabled" | "title" | "body">>) {
    void persist(templates.map((item) => (item.id === id ? { ...item, ...fields } : item)));
  }

  async function sendBroadcast() {
    setSending(true);
    try {
      const res = await fetch("/api/admin/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
      const data = await readApiJson<{ error?: string; sent?: number }>(res);
      if (!res.ok) {
        toast.error(data.error ?? "השליחה נכשלה");
        return;
      }
      toast.success(`נשלח ל־${data.sent ?? 0} מכשירים`);
      setTitle("");
      setBody("");
    } catch {
      toast.error("אין קשר לשרת");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-3 space-y-2 rounded-xl bg-black/25 p-2.5">
      <p className="text-sm font-medium text-amber-100">התראות לשכונה</p>
      <p className="text-[11px] text-violet-300">
        {`מציינים {nickname} {place} {backLine}. כבוי = לא נשלח בכלל. הפסקה, חזרה מההפסקה ובית חדש נשלחים אוטומטית.`}
      </p>

      <div className="max-h-80 space-y-1.5 overflow-y-auto pe-1">
        {templates.length === 0 ? (
          <p className="text-[11px] text-violet-400">טוענים תבניות…</p>
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
                        onClick={() => setExpanded(open ? null : item.id)}
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <p className="min-w-0 flex-1 text-sm font-medium text-orange-100">{item.label}</p>
                    </div>
                    <p className="text-[11px] text-violet-300">
                      {item.auto ? "אוטומטי" : "בעל הבית שולח אחרי שמירה"}
                    </p>
                  </div>
                  <Toggle
                    on={item.enabled}
                    disabled={busy}
                    onClick={() => patch(item.id, { enabled: !item.enabled })}
                  />
                </div>
                {open ? (
                  <>
                    <p className="text-[11px] text-violet-400">{item.hint}</p>
                    <Input
                      value={item.title}
                      maxLength={80}
                      disabled={busy}
                      className="h-8 bg-[#0c0612] text-sm"
                      onChange={(event) => {
                        setTemplates((list) =>
                          list.map((row) => (row.id === item.id ? { ...row, title: event.target.value } : row)),
                        );
                      }}
                      onBlur={(event) => patch(item.id, { title: event.target.value })}
                    />
                    <Textarea
                      value={item.body}
                      maxLength={280}
                      rows={2}
                      disabled={busy}
                      className="min-h-[3.5rem] bg-[#0c0612] text-sm"
                      onChange={(event) => {
                        setTemplates((list) =>
                          list.map((row) => (row.id === item.id ? { ...row, body: event.target.value } : row)),
                        );
                      }}
                      onBlur={(event) => patch(item.id, { body: event.target.value })}
                    />
                  </>
                ) : (
                  <div className="rounded-md bg-[#0c0612]/80 px-2 py-1.5 ring-1 ring-orange-500/10">
                    <p className="text-sm font-medium text-orange-50">{item.title}</p>
                    <p className="mt-0.5 whitespace-pre-line text-[12px] leading-snug text-violet-200">
                      {item.body}
                    </p>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

      <form
        className="space-y-2 border-t border-orange-500/15 pt-2"
        onSubmit={(event) => {
          event.preventDefault();
          void sendBroadcast();
        }}
      >
        <p className="text-sm font-medium text-amber-100">הודעה חד־פעמית לכולם</p>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="כותרת"
          maxLength={80}
          className="h-9 bg-[#12081a] text-sm"
        />
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="למשל: הגשם מתחיל, הממתקים בחוץ עד 21:00"
          maxLength={280}
          rows={2}
          className="min-h-[4rem] bg-[#12081a] text-sm"
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
    </div>
  );
}

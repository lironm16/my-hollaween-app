"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { readApiJson } from "@/lib/api-json";

export function AdminBroadcast() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
      const data = await readApiJson<{ error?: string; sent?: number; failed?: number }>(res);
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
      setBusy(false);
    }
  }

  return (
    <form
      className="mt-3 space-y-2 rounded-xl bg-black/25 p-2.5"
      onSubmit={(event) => {
        event.preventDefault();
        void send();
      }}
    >
      <p className="text-base font-medium text-amber-100">הודעה למי שבחר הודעות מהמנהלים</p>
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
        disabled={busy || !title.trim() || !body.trim()}
        className="bg-orange-500 text-black hover:bg-orange-400"
      >
        {busy ? "שולחים…" : "שליחה לכולם"}
      </Button>
    </form>
  );
}

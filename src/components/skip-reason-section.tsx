"use client";

import { useEffect, useId, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SkipReasonSection({
  note,
  compact = false,
  onSave,
  onDelete,
}: {
  note?: string;
  compact?: boolean;
  onSave: (note: string) => void;
  onDelete: () => void;
}) {
  const fieldId = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note ?? "");

  useEffect(() => {
    if (!editing) setDraft(note ?? "");
  }, [note, editing]);

  const trimmed = note?.trim();
  const hasNote = Boolean(trimmed);

  function save() {
    const next = draft.trim();
    onSave(next);
    setEditing(false);
  }

  function cancel() {
    setDraft(note ?? "");
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="skip-reason-section space-y-2 rounded-xl border border-orange-500/20 bg-[#1a1028]/90 px-3 py-2.5">
        <label htmlFor={fieldId} className="block text-right text-sm font-medium text-violet-200">
          סיבת דילוג
        </label>
        <textarea
          id={fieldId}
          dir="rtl"
          rows={compact ? 2 : 3}
          maxLength={240}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="w-full resize-none rounded-lg border border-orange-500/25 bg-[#160b20] px-3 py-2 text-right text-base text-violet-50 outline-none ring-orange-500/40 focus:ring-2"
          placeholder="למשל: לא פתוח, אין ממתקים, לא מתאים לילדים…"
        />
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" size="sm" variant="outline" className="h-9" onClick={cancel}>
            ביטול
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-9 bg-orange-500 text-black hover:bg-orange-400"
            onClick={save}
          >
            שמירה
          </Button>
        </div>
      </div>
    );
  }

  if (!hasNote) {
    return (
      <div className="skip-reason-section">
        <button
          type="button"
          className="skip-reason-add w-full rounded-xl border border-dashed border-violet-500/35 bg-[#1a1028]/60 px-3 py-2 text-right text-base text-violet-200 hover:border-orange-500/40 hover:bg-orange-500/5"
          onClick={() => setEditing(true)}
        >
          + הוספת סיבת דילוג
        </button>
      </div>
    );
  }

  return (
    <div className="skip-reason-section rounded-xl border border-orange-500/15 bg-[#1a1028]/80 px-3 py-2">
      <div className="flex items-start gap-2">
        <button
          type="button"
          className={cn(
            "min-w-0 flex-1 text-right text-violet-100 hover:text-orange-100",
            compact && "truncate text-base leading-snug",
            !compact && "whitespace-pre-wrap text-base leading-relaxed",
          )}
          onClick={() => setEditing(true)}
          aria-label="עריכת סיבת דילוג"
        >
          {trimmed}
        </button>
        <div className="flex shrink-0 gap-0.5">
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-lg text-violet-300 hover:bg-violet-500/10 hover:text-orange-100"
            aria-label="עריכה"
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-lg text-violet-300 hover:bg-red-950/50 hover:text-red-200"
            aria-label="מחיקת הסיבה"
            onClick={onDelete}
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useId, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SKIP_REASON_CATEGORIES,
  skipReasonCategoryLabel,
  type SkipReasonCategory,
} from "@/lib/skip-reason-categories";
import { cn } from "@/lib/utils";

function SkipReasonOptionIcon({ category }: { category: SkipReasonCategory }) {
  if (category === "not-open") {
    return <span className="skip-reason-option-icon is-closed" aria-hidden />;
  }
  if (category === "candy-out") {
    return <span className="skip-reason-option-icon is-candy-out" aria-hidden />;
  }
  return <span className="skip-reason-option-icon is-other" aria-hidden />;
}

export function SkipReasonSection({
  category,
  note,
  compact = false,
  onSave,
  onDelete,
}: {
  category?: SkipReasonCategory;
  note?: string;
  compact?: boolean;
  onSave: (payload: { category: SkipReasonCategory; note: string }) => void;
  onDelete: () => void;
}) {
  const fieldId = useId();
  const selectId = useId();
  const [editing, setEditing] = useState(false);
  const [draftCategory, setDraftCategory] = useState<SkipReasonCategory | "">(category ?? "");
  const [draftNote, setDraftNote] = useState(note ?? "");

  const hasSaved = Boolean(category);

  useEffect(() => {
    if (!editing) {
      setDraftCategory(category ?? "");
      setDraftNote(note ?? "");
    }
  }, [category, note, editing]);

  function save() {
    if (!draftCategory) return;
    onSave({ category: draftCategory, note: draftNote.trim() });
    setEditing(false);
  }

  function cancel() {
    setDraftCategory(category ?? "");
    setDraftNote(note ?? "");
    setEditing(false);
  }

  function handleDelete() {
    onDelete();
    setDraftCategory("");
    setDraftNote("");
    setEditing(false);
  }

  if (!editing && !hasSaved) {
    return (
      <div className="skip-reason-section">
        <button
          type="button"
          className="skip-reason-add flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-500/45 bg-[#1a1028]/60 px-3 py-2.5 text-base text-violet-200 hover:border-orange-500/40 hover:bg-orange-500/5"
          onClick={() => setEditing(true)}
        >
          <Plus className="size-4 shrink-0" aria-hidden />
          הוספת סיבת דילוג
        </button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="skip-reason-section space-y-2.5 rounded-xl border border-slate-500/45 bg-[#1a1028]/90 px-3 py-2.5">
        <label htmlFor={selectId} className="block text-right text-sm font-medium text-violet-200">
          סיבת דילוג
        </label>
        <div className="relative">
          <select
            id={selectId}
            dir="rtl"
            value={draftCategory}
            onChange={(event) =>
              setDraftCategory(event.target.value as SkipReasonCategory | "")
            }
            className={cn(
              "skip-reason-select w-full appearance-none rounded-lg border border-slate-500/50 bg-[#160b20] py-2.5 pl-3 pr-11 text-right text-base outline-none focus:ring-2 focus:ring-orange-500/35",
              draftCategory ? "text-violet-50" : "text-violet-400",
            )}
          >
            <option value="" disabled>
              בחרו סיבה
            </option>
            {SKIP_REASON_CATEGORIES.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          {draftCategory ? (
            <span className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
              <SkipReasonOptionIcon category={draftCategory} />
            </span>
          ) : null}
        </div>
        <label htmlFor={fieldId} className="block text-right text-sm text-violet-300">
          הערה (אופציונלי)
        </label>
        <textarea
          id={fieldId}
          dir="rtl"
          rows={compact ? 2 : 3}
          maxLength={240}
          value={draftNote}
          onChange={(event) => setDraftNote(event.target.value)}
          className="skip-reason-comment w-full resize-none rounded-lg border border-slate-500/55 bg-[#160b20] px-3 py-2 text-right text-base text-violet-50 outline-none focus:ring-2 focus:ring-orange-500/35"
          placeholder="פרטים נוספים…"
        />
        <div className="flex flex-wrap justify-start gap-2">
          <Button
            type="button"
            size="sm"
            className="h-9 bg-orange-500 text-black hover:bg-orange-400 disabled:opacity-40"
            disabled={!draftCategory}
            onClick={save}
          >
            שמירה
          </Button>
          {hasSaved ? (
            <Button type="button" size="sm" variant="outline" className="h-9" onClick={cancel}>
              ביטול
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9"
              onClick={() => {
                setDraftCategory("");
                setDraftNote("");
                setEditing(false);
              }}
            >
              ביטול
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="skip-reason-section rounded-xl border border-slate-500/45 bg-[#1a1028]/80 px-3 py-3">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex items-center justify-center gap-2">
          {category ? <SkipReasonOptionIcon category={category} /> : null}
          <span className="text-base font-medium text-violet-100">
            {category ? skipReasonCategoryLabel(category) : null}
          </span>
        </div>
        {note?.trim() ? (
          <p
            className={cn(
              "w-full text-violet-200",
              compact ? "truncate text-sm" : "whitespace-pre-wrap text-base leading-relaxed",
            )}
          >
            {note.trim()}
          </p>
        ) : null}
        <div className="flex items-center justify-center gap-1 pt-0.5">
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
            onClick={handleDelete}
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

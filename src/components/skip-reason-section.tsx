"use client";

import { useEffect, useId, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SKIP_REASON_CATEGORIES,
  skipReasonCategoryLabel,
  skipReasonPreview,
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
  const [draftCategory, setDraftCategory] = useState<SkipReasonCategory>(category ?? "other");
  const [draftNote, setDraftNote] = useState(note ?? "");

  useEffect(() => {
    if (!editing) {
      setDraftCategory(category ?? "other");
      setDraftNote(note ?? "");
    }
  }, [category, note, editing]);

  const hasSaved = Boolean(category || note?.trim());

  function save() {
    onSave({ category: draftCategory, note: draftNote.trim() });
    setEditing(false);
  }

  function cancel() {
    setDraftCategory(category ?? "other");
    setDraftNote(note ?? "");
    setEditing(false);
  }

  if (editing || !hasSaved) {
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
            onChange={(event) => setDraftCategory(event.target.value as SkipReasonCategory)}
            className="skip-reason-select w-full appearance-none rounded-lg border border-slate-500/50 bg-[#160b20] py-2.5 pl-10 pr-11 text-right text-base text-violet-50 outline-none focus:ring-2 focus:ring-orange-500/35"
          >
            {SKIP_REASON_CATEGORIES.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
            <SkipReasonOptionIcon category={draftCategory} />
          </span>
        </div>
        <ul className="skip-reason-option-grid grid grid-cols-3 gap-1.5" aria-hidden>
          {SKIP_REASON_CATEGORIES.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                className={cn(
                  "skip-reason-option-chip flex w-full flex-col items-center gap-1 rounded-lg border px-1 py-2 text-center text-xs leading-tight",
                  draftCategory === option.id
                    ? "border-orange-400/60 bg-orange-500/10 text-orange-100"
                    : "border-slate-500/35 text-violet-200",
                )}
                onClick={() => setDraftCategory(option.id)}
              >
                <SkipReasonOptionIcon category={option.id} />
                <span>{option.label}</span>
              </button>
            </li>
          ))}
        </ul>
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
            className="h-9 bg-orange-500 text-black hover:bg-orange-400"
            onClick={save}
          >
            שמירה
          </Button>
          {hasSaved ? (
            <Button type="button" size="sm" variant="outline" className="h-9" onClick={cancel}>
              ביטול
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  const preview = skipReasonPreview(category, note);

  return (
    <div className="skip-reason-section rounded-xl border border-slate-500/45 bg-[#1a1028]/80 px-3 py-2">
      <div className="flex items-start gap-2">
        <SkipReasonOptionIcon category={category ?? "other"} />
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
          {category ? (
            <span className="block text-sm font-medium text-violet-200">
              {skipReasonCategoryLabel(category)}
            </span>
          ) : null}
          {note?.trim() ? <span className="block">{note.trim()}</span> : null}
          {!preview ? "הוספת סיבת דילוג" : null}
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

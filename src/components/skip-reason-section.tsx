"use client";

import { useEffect, useId, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SkipIcon } from "@/components/skip-icon";
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
  const selectId = useId();
  const [editing, setEditing] = useState(false);
  const [draftCategory, setDraftCategory] = useState<SkipReasonCategory | "">(category ?? "");

  const hasSaved = Boolean(category);
  const preview = skipReasonPreview(category, note);

  useEffect(() => {
    if (!editing) setDraftCategory(category ?? "");
  }, [category, editing]);

  function save() {
    if (!draftCategory) return;
    onSave({ category: draftCategory, note: note?.trim() ?? "" });
    setEditing(false);
  }

  function cancel() {
    setDraftCategory(category ?? "");
    setEditing(false);
  }

  function handleDelete() {
    onDelete();
    setDraftCategory("");
    setEditing(false);
  }

  if (!editing && !hasSaved) {
    return (
      <div className="skip-reason-section">
        <button
          type="button"
          className="skip-reason-add flex w-full items-center justify-start gap-2 rounded-lg px-1 py-1.5 text-base text-violet-200 hover:text-orange-100"
          onClick={() => setEditing(true)}
        >
          <SkipIcon className="size-5 shrink-0 text-orange-400" aria-hidden />
          <span>הוסף תנאי להחזרה</span>
        </button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="skip-reason-section space-y-2 rounded-xl border border-slate-500/40 bg-[#1a1028]/90 px-3 py-2.5">
        <div className="flex items-center gap-2 text-violet-200">
          <SkipIcon className="size-5 shrink-0 text-orange-400" aria-hidden />
          <span className="text-base font-medium">הוסף תנאי להחזרה</span>
        </div>
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
          <Button type="button" size="sm" variant="outline" className="h-9" onClick={cancel}>
            ביטול
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="skip-reason-section py-0.5">
      <div className="flex min-w-0 items-center gap-2 text-right">
        <SkipIcon className="size-4 shrink-0 text-orange-400/90" aria-hidden />
        {category ? <SkipReasonOptionIcon category={category} /> : null}
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-base text-violet-100",
            compact && "text-sm",
          )}
          title={preview}
        >
          {category ? skipReasonCategoryLabel(category) : preview}
          {note?.trim() ? (
            <span className="text-violet-300/90">{` · ${note.trim()}`}</span>
          ) : null}
        </span>
        <button
          type="button"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-violet-300 hover:bg-violet-500/10 hover:text-orange-100"
          aria-label="עריכה"
          onClick={() => setEditing(true)}
        >
          <Pencil className="size-3.5" aria-hidden />
        </button>
        <button
          type="button"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-violet-300 hover:bg-red-950/50 hover:text-red-200"
          aria-label="מחיקת תנאי להחזרה"
          onClick={handleDelete}
        >
          <Trash2 className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

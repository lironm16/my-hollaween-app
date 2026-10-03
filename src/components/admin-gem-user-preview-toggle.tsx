"use client";

import { useGemPreviewAsUser } from "@/hooks/use-gem-preview-as-user";
import { GEM_ALBUM_TITLE_HE } from "@/lib/gem-album-copy";
import { cn } from "@/lib/utils";

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      dir="ltr"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition",
        on ? "justify-end bg-orange-500" : "justify-start bg-violet-900 ring-1 ring-orange-500/20",
      )}
    >
      <span className="size-5 rounded-full bg-white shadow" />
    </button>
  );
}

/** Admin: experience the app like a visitor (gem hunt UX without QA tools). */
export function AdminGemUserPreviewToggle({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const { previewAsUser, setPreviewAsUser } = useGemPreviewAsUser();

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl bg-[#12081a] px-3 py-2.5 ring-1 ring-orange-500/20",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-base font-medium text-orange-100">תצוגת משתמש</p>
        {!compact ? (
          <p className="text-base text-violet-300">
            כמו משתמש בלילה — יהלומים ו{GEM_ALBUM_TITLE_HE}, בלי כלי בדיקה במפה.
          </p>
        ) : (
          <p className="text-sm text-violet-400">{previewAsUser ? "פועל" : "כבוי"}</p>
        )}
      </div>
      <Toggle
        on={previewAsUser}
        onClick={() => setPreviewAsUser(!previewAsUser)}
        label="תצוגת משתמש"
      />
    </div>
  );
}

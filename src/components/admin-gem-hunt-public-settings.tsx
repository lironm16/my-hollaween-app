"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminHelpDetails } from "@/components/admin-section";
import { GEM_GAME_TITLE_HE } from "@/lib/gem-hunt-copy";
import { notifyCatalogChanged } from "@/lib/offline-db";
import { cn } from "@/lib/utils";

/** Feature switch — gem hunt for all users (still gated by address reveal per house). */
export function AdminGemHuntPublicSettings({ embedded = false }: { embedded?: boolean }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/event/gem-hunt", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as { enabled?: boolean } | null;
        if (res.ok) setEnabled(Boolean(json?.enabled));
      } catch {
        /* stays unknown */
      }
    })();
  }, []);

  async function toggle() {
    if (enabled === null) return;
    const next = !enabled;
    const question = next
      ? `להפעיל את ${GEM_GAME_TITLE_HE} באפליקציה? כל המשתמשים יראו את המשחק, ויוכלו לחפש שדון בכל מקום שהכתובת שלו גלויה להם.`
      : `לכבות את ${GEM_GAME_TITLE_HE}? המשחק ייעלם לכל המשתמשים (מנהלים עדיין יראו אותו).`;
    if (!window.confirm(question)) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/event/gem-hunt", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      const json = (await res.json().catch(() => null)) as { enabled?: boolean; error?: string } | null;
      if (!res.ok) {
        toast.error(json?.error ?? "השמירה נכשלה.");
        return;
      }
      setEnabled(Boolean(json?.enabled));
      notifyCatalogChanged();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={cn(
        "space-y-1",
        embedded ? "rounded-lg bg-[#14081c]/80 px-2.5 py-2 ring-1 ring-orange-500/10" : "rounded-xl bg-[#12081a] px-3 py-2 ring-1 ring-orange-500/20",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-orange-100">{GEM_GAME_TITLE_HE}</p>
        <span className="flex shrink-0 items-center gap-1.5">
          <span className={cn("text-base", enabled ? "text-orange-200" : "text-violet-400")}>
            {enabled === null ? "…" : enabled ? "פועל" : "כבוי"}
          </span>
          <button
            type="button"
            dir="ltr"
            role="switch"
            aria-checked={Boolean(enabled)}
            aria-label={GEM_GAME_TITLE_HE}
            disabled={enabled === null || saving}
            onClick={() => void toggle()}
            className={cn(
              "flex h-6 w-11 items-center rounded-full p-0.5 transition disabled:opacity-50",
              enabled ? "justify-end bg-orange-500" : "justify-start bg-violet-900 ring-1 ring-orange-500/20",
            )}
          >
            <span className="size-5 rounded-full bg-white shadow" />
          </button>
        </span>
      </div>
      {embedded ? (
        <AdminHelpDetails label="מה זה?">
          מפעיל או מכבה את המשחק באפליקציה לכל המשתמשים. כבוי — רק מנהלים רואים אותו. דלוק — כולם
          רואים אותו, וכל אחד יכול לחפש שדון בבית שהכתובת שלו גלויה לו: הבית שלו, עסקים ובתי ספר,
          ואחרי שעת חשיפת הכתובות — כל הבתים.
        </AdminHelpDetails>
      ) : (
        <p className="text-sm text-violet-300">
          כבוי כברירת מחדל. ההגדרה נשמרת בשרת ומגיעה לכל המכשירים בעדכון הבתים הבא.
        </p>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function AdminCommunityEngagementSettings() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/event/community-engagement", { cache: "no-store" });
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as { enabled?: boolean };
      setEnabled(Boolean(data.enabled));
    } catch {
      setError("לא הצלחנו לטעון את ההגדרה.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(next: boolean) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/event/community-engagement", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) throw new Error("save failed");
      const data = (await res.json()) as { enabled?: boolean };
      setEnabled(Boolean(data.enabled));
    } catch {
      setError("שמירה נכשלה.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2 rounded-xl bg-[#12081a]/80 p-2 ring-1 ring-orange-500/15" dir="rtl">
      <p className="text-base font-medium text-amber-100">שמרו / ביקרו (קהילה)</p>
      <p className="text-base text-violet-300">
        כשהמתג פועל, בעלי בתים (בטלפון שרשמו את הבית) ומנהלים רואים מונים מצטברים לפי בית. הכתיבה
        נאספת במושבים ומתעדכנת בשרת כל כמה דקות — בלי לגעת בקטלוג המפה.
      </p>
      <div className="flex items-center justify-between gap-3 rounded-xl bg-[#12081a] px-3 py-2.5 ring-1 ring-orange-500/20">
        <div className="min-w-0">
          <p className="text-base font-medium text-orange-100">הצגת מונים</p>
          <p className="text-base text-violet-300">
            {loading ? "טוען…" : enabled ? "פועל לבעלים ולמנהלים" : "כבוי לכולם"}
          </p>
        </div>
        <button
          type="button"
          dir="ltr"
          role="switch"
          aria-checked={enabled}
          disabled={loading || saving}
          onClick={() => void save(!enabled)}
          className={cn(
            "flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition disabled:opacity-50",
            enabled ? "justify-end bg-orange-500" : "justify-start bg-violet-900 ring-1 ring-orange-500/20",
          )}
        >
          <span className="size-5 rounded-full bg-white shadow" />
        </button>
      </div>
      {error ? (
        <p className="text-base text-rose-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

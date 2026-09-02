"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { HouseForm } from "@/components/house-form";
import { CodesCopy } from "@/components/codes-copy";
import { buttonVariants } from "@/components/ui/button";
import { saveOwnedHouse, notifyCatalogChanged } from "@/lib/offline-db";
import { PersistNote } from "@/components/persist-note";
import type { HouseInput } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function AddPage() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ id: string; editCode: string; name: string } | null>(
    null,
  );

  async function onSubmit(input: HouseInput) {
    setBusy(true);
    try {
      const res = await fetch("/api/houses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "השליחה נכשלה");
        return;
      }
      saveOwnedHouse({
        id: data.house.id,
        name: data.house.name,
        editCode: data.editCode,
        preview: data.house,
      });
      notifyCatalogChanged();
      setDone({ id: data.house.id, editCode: data.editCode, name: data.house.name });
      toast.success("הבית עלה למפה של כולם");
    } catch {
      toast.error("אין קשר לשרת. נסו שוב.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col">
      <AppHeader />
      <main className="relative z-10 mx-auto w-full max-w-lg flex-1 px-4 py-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/banner.jpg"
          alt=""
          className="mb-4 h-28 w-full rounded-2xl object-cover ring-1 ring-orange-500/30"
        />
        {done ? (
          <div className="space-y-4 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-400/30">
            <h1 className="font-display text-2xl text-orange-300">הבית עלה למפה</h1>
            <p className="text-sm text-violet-100">
              {done.name} כבר באתר של השכונה. אחרי רענון קצר (עד כ־15 שניות) כולם רואים אותו במפה — לא רק בטלפון הזה.
            </p>
            <PersistNote />
            <CodesCopy id={done.id} editCode={done.editCode} />
            <p className="text-xs text-amber-200">
              עם הקוד אפשר לעדכן פרטים או לסמן שנגמרו הממתקים, גם בלי מנהל.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/?focus=${encodeURIComponent(done.id)}`}
                className={cn(buttonVariants(), "bg-orange-500 text-black hover:bg-orange-400")}
              >
                צפו בבית במפה
              </Link>
              <Link href="/edit" className={cn(buttonVariants({ variant: "outline" }))}>
                לעריכה
              </Link>
            </div>
          </div>
        ) : (
          <>
            <h1 className="font-display mb-1 text-2xl text-orange-300">הוספת בית מפחיד</h1>
            <p className="mb-4 text-sm text-violet-200">
              בחרו שם, כתובת אמיתית מהרשימה, ושלחו. הבית עולה מיד למפה שכל השכונה רואה.
            </p>
            <PersistNote className="mb-4" />
            <HouseForm submitLabel="פרסמו בשכונה" onSubmit={onSubmit} busy={busy} />
          </>
        )}
      </main>
    </div>
  );
}

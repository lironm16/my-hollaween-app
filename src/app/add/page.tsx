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
import { publishHouse } from "@/lib/publish-house";
import type { HouseInput } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function AddPage() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{
    id: string;
    editCode: string;
    name: string;
    shared: boolean;
  } | null>(null);

  async function onSubmit(input: HouseInput) {
    setBusy(true);
    try {
      const { house, editCode, shared } = await publishHouse(input);
      saveOwnedHouse({
        id: house.id,
        name: house.name,
        editCode,
        preview: house,
      });
      notifyCatalogChanged();
      setDone({ id: house.id, editCode, name: house.name, shared });
      toast.success(shared ? "הבית נשלח לאישור מנהל" : "הבית נשמר וממתין לאישור");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "השליחה נכשלה");
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
            <h1 className="font-display text-2xl text-orange-300">נשלח לאישור</h1>
            <p className="text-sm text-violet-100">
              {done.shared
                ? `${done.name} מחכה למנהל. אחרי אישור הוא יופיע במפה הציבורית של השכונה.`
                : `${done.name} שמור בטלפון הזה וממתין לאישור.`}
            </p>
            <PersistNote />
            <CodesCopy id={done.id} editCode={done.editCode} />
            <p className="text-xs text-amber-200">
              עם הקוד אפשר לעדכן פרטים גם לפני האישור. רק אתם רואים את הבית עד שמנהל מאשר.
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
              בחרו שם, כתובת אמיתית מהרשימה, ושלחו. מנהל יאשר לפני שהבית יופיע לכולם במפה.
            </p>
            <PersistNote className="mb-4" />
            <HouseForm submitLabel="שלחו לאישור" onSubmit={onSubmit} busy={busy} />
          </>
        )}
      </main>
    </div>
  );
}

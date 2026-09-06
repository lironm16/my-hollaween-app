"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { HouseForm } from "@/components/house-form";
import { CodesCopy } from "@/components/codes-copy";
import { buttonVariants } from "@/components/ui/button";
import { saveOwnedHouse, notifyCatalogChanged } from "@/lib/offline-db";
import { PersistNote } from "@/components/persist-note";
import { publishHouse } from "@/lib/publish-house";
import { publishHousePhoto } from "@/lib/house-photo";
import type { HouseInput } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { HouseFormExtras } from "@/components/house-form";

export default function AddPage() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{
    id: string;
    editCode: string;
    name: string;
    autoPush?: boolean;
  } | null>(null);

  async function onSubmit(input: HouseInput, extras?: HouseFormExtras) {
    setBusy(true);
    try {
      const { house, editCode, autoPush } = await publishHouse(input);
      let preview = house;
      if (extras?.photoDataUrl) {
        try {
          preview = await publishHousePhoto(house.id, editCode, extras.photoDataUrl);
        } catch {
          toast.error("הבית נוסף, אבל העלאת התמונה נכשלה. אפשר להוסיף אותה בעריכה.");
        }
      }
      saveOwnedHouse({
        id: preview.id,
        name: preview.name,
        editCode,
        preview,
      });
      notifyCatalogChanged();
      // Success UI only after the server confirmed the house.
      setDone({ id: preview.id, editCode, name: preview.name, autoPush });
      toast.success(autoPush ? "הבית נוסף למפה · נשלחה התראה לשכונה" : "הבית נוסף למפה");
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
          <div className="house-added-success space-y-4 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-400/30">
            <div className="house-added-burst" aria-hidden="true">
              <span>🎃</span>
              <span>✨</span>
              <span>🍬</span>
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <CheckCircle2 className="house-added-check size-14 text-emerald-400" />
              <h1 className="font-display text-2xl text-orange-300">הבית במפה!</h1>
              <p className="text-base text-violet-100">
                {done.name} נשמר ומופיע במפה הציבורית של השכונה.
              </p>
              {done.autoPush ? (
                <p className="rounded-xl bg-emerald-950/70 px-3 py-2 text-base text-emerald-100 ring-1 ring-emerald-500/25">
                  שלחנו התראה אוטומטית לשכונה על הבית החדש.
                </p>
              ) : null}
            </div>
            <PersistNote />
            <CodesCopy editCode={done.editCode} />
            <p className="text-base text-amber-200">
              אפשר לעדכן את הבית בכל עת — מהמסך הראשי או מעריכה בתפריט הצדדי. גם עד האירוע וגם בלילה
              עצמו, למשל מלאי ממתקים או סגירת הבית לביקור.
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
            <p className="mb-4 text-base text-violet-200">
              בחרו שם וכתובת אמיתית מהרשימה. אחרי אישור השרת הבית מופיע במפה.
            </p>
            <PersistNote className="mb-4" />
            <HouseForm submitLabel="שמירה" onSubmit={onSubmit} busy={busy} />
          </>
        )}
      </main>
    </div>
  );
}

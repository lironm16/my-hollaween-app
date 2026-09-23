"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { HouseForm } from "@/components/house-form";
import { CodesCopy } from "@/components/codes-copy";
import { HouseEditFlowPanels, useHouseEditFlow } from "@/components/house-edit-flow";
import { Button, buttonVariants } from "@/components/ui/button";
import { saveOwnedHouse, notifyCatalogChanged, rememberPublishedHouse } from "@/lib/offline-db";
import { PersistNote } from "@/components/persist-note";
import { publishHouse } from "@/lib/publish-house";
import { publishHousePhoto } from "@/lib/house-photo";
import { senderPushEndpoint } from "@/lib/push-client";
import type { HouseInput, PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { HouseFormExtras } from "@/components/house-form";
import { useAdminSession } from "@/hooks/use-admin-session";

export default function AddPage() {
  const router = useRouter();
  const editFlow = useHouseEditFlow();
  const { admin } = useAdminSession();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{
    id: string;
    editCode: string;
    name: string;
    house: PublicHouse;
  } | null>(null);

  async function onSubmit(input: HouseInput, extras?: HouseFormExtras) {
    setBusy(true);
    try {
      const includeEndpoint = await Promise.race([
        senderPushEndpoint(),
        new Promise<undefined>((resolve) => window.setTimeout(() => resolve(undefined), 2000)),
      ]);
      const { house, editCode } = await publishHouse(input, {
        includeEndpoint,
        addedBy: extras?.addedBy ?? undefined,
        admin,
      });
      let preview = house;
      if (extras?.photoDataUrl) {
        try {
          preview = await publishHousePhoto(house.id, editCode, extras.photoDataUrl);
        } catch {
          toast.warning("הבית נוסף בלי תמונה. אפשר להוסיף תמונה בעריכה.");
        }
      }
      saveOwnedHouse({
        id: preview.id,
        name: preview.name,
        editCode,
        preview,
      });
      rememberPublishedHouse(preview);
      notifyCatalogChanged();
      // Success UI only after the server confirmed the house.
      setDone({ id: preview.id, editCode, name: preview.name, house: preview });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "השליחה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex h-dvh min-h-dvh flex-col overflow-hidden">
      <AppHeader />
      <main className="relative z-10 mx-auto min-h-0 w-full max-w-lg flex-1 overflow-y-auto px-4 py-5 pb-10">
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
            </div>
            <PersistNote />
            <CodesCopy editCode={done.editCode} />
            <p className="text-lg text-orange-100">
              קוד העריכה נשמר במכשיר הזה — אפשר לערוך בלי להקליד שוב.
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href="/help/share-edit-code"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "w-full border-orange-400/50 bg-orange-500/10 text-lg text-orange-100 hover:bg-orange-500/20",
                )}
              >
                איך לשתף קוד עריכה?
              </Link>
              <Link
                href="/help/edit-code"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "w-full border-orange-400/50 bg-orange-500/10 text-lg text-orange-100 hover:bg-orange-500/20",
                )}
              >
                איבדתם את קוד העריכה?
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/?focus=${encodeURIComponent(done.id)}`}
                className={cn(buttonVariants(), "bg-orange-500 text-black hover:bg-orange-400")}
              >
                צפו בבית במפה
              </Link>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  editFlow.openEdit(done.house, {
                    editCode: done.editCode,
                    allowDelete: true,
                    forceFull: true,
                  })
                }
              >
                לעריכה
              </Button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="font-display mb-1 text-3xl text-orange-300">הוספת בית אימה</h1>
            <p className="mb-4 text-lg text-violet-200">
              בחרו שם וכתובת אמיתית מהרשימה. אחרי שמירה מוצלחת הבית מופיע במפה.{" "}
              <Link href="/help/add-house" className="text-orange-300 underline underline-offset-2">
                איך מוסיפים?
              </Link>
            </p>
            <PersistNote className="mb-4" />
            <HouseForm
              submitLabel="שמירה"
              onSubmit={onSubmit}
              onCancel={() => router.push("/")}
              busy={busy}
            />
          </>
        )}
      </main>
      {done ? (
        <HouseEditFlowPanels
          flow={editFlow.flow}
          setFlow={editFlow.setFlow}
          onClose={editFlow.close}
          onUpdated={(next) => {
            setDone((current) =>
              current ? { ...current, id: next.id, name: next.name, house: next } : current,
            );
            saveOwnedHouse({
              id: next.id,
              name: next.name,
              editCode: done.editCode,
              preview: next,
            });
            notifyCatalogChanged();
          }}
          onDeleted={() => {
            editFlow.close();
            router.push("/");
          }}
        />
      ) : null}
    </div>
  );
}

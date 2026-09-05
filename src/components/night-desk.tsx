"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { HouseForm, type HouseFormExtras } from "@/components/house-form";
import { PushNotice } from "@/components/push-notice";
import { Button } from "@/components/ui/button";
import { notifyCatalogChanged } from "@/lib/offline-db";
import { publishHousePhoto } from "@/lib/house-photo";
import { readApiJson } from "@/lib/api-json";
import type { HouseInput, PublicHouse } from "@/lib/types";
import { DEFAULT_PUSH_TEMPLATES, type PushKind } from "@/lib/push-templates";

type PushOffer = { kind: PushKind; title: string; body: string };
type PushNoticeState =
  | { mode: "offer"; offer: PushOffer }
  | { mode: "auto" | "sent"; title: string; body: string };

type Props = {
  house: PublicHouse;
  onUpdated: (house: PublicHouse) => void;
  editCode?: string;
  admin?: boolean;
  allowDelete?: boolean;
  onDeleted?: () => void;
};

export function NightDesk({
  house,
  onUpdated,
  editCode,
  admin,
  allowDelete = false,
  onDeleted,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<PushNoticeState | null>(null);
  const [offerBusy, setOfferBusy] = useState(false);
  const noticeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!notice) return;
    noticeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [notice]);

  async function save(patch: Partial<HouseInput> & { photoUrl?: string; ownerFrozenUntil?: string | null }) {
    setBusy(true);
    try {
      const url = admin
        ? `/api/admin/houses/${encodeURIComponent(house.id)}`
        : `/api/houses/${encodeURIComponent(house.id)}`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(admin ? patch : { ...patch, editCode }),
      });
      const data = await readApiJson<{
        error?: string;
        house?: PublicHouse;
        push?: {
          kind?: PushKind;
          autoSent?: boolean;
          title?: string;
          body?: string;
          offer?: PushOffer;
        };
      }>(res);
      if (!res.ok || !data.house) {
        toast.error(data.error ?? "העדכון נכשל");
        return null;
      }
      onUpdated(data.house);
      notifyCatalogChanged();
      if (data.push?.autoSent) {
        setNotice({
          mode: "auto",
          title: data.push.title ?? "",
          body: data.push.body ?? "",
        });
        toast.success("נשמר · התראה נשלחה לשכונה");
      } else if (data.push?.offer) {
        setNotice({ mode: "offer", offer: data.push.offer });
        toast.success("נשמר — אפשר לשלוח התראה");
      } else if (data.push?.kind && !data.push.autoSent && !data.push.offer) {
        setNotice(null);
        toast.success("נשמר · סוג ההתראה כבוי אצל המנהלים");
      } else {
        setNotice(null);
        toast.success("נשמר");
      }
      return data.house;
    } catch {
      toast.error("אין קשר לשרת");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function sendOffer() {
    if (notice?.mode !== "offer") return;
    const offer = notice.offer;
    setOfferBusy(true);
    try {
      const res = await fetch(`/api/houses/${encodeURIComponent(house.id)}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editCode, kind: offer.kind }),
      });
      const data = await readApiJson<{ error?: string; sent?: number }>(res);
      if (!res.ok) {
        toast.error(data.error ?? "השליחה נכשלה");
        return;
      }
      toast.success(`התראה נשלחה ל־${data.sent ?? 0} מכשירים`);
      setNotice({ mode: "sent", title: offer.title, body: offer.body });
    } catch {
      toast.error("אין קשר לשרת");
    } finally {
      setOfferBusy(false);
    }
  }

  async function onSave(input: HouseInput, extras?: HouseFormExtras) {
    const saved = await save({
      ...input,
      ownerFrozenUntil: extras?.ownerFrozenUntil ?? null,
      ...(extras?.clearPhoto && !extras.photoDataUrl ? { photoUrl: "" } : {}),
    });
    if (!saved) return;
    const code = editCode;
    if (extras?.photoDataUrl && code) {
      try {
        const withPhoto = await publishHousePhoto(house.id, code, extras.photoDataUrl);
        onUpdated(withPhoto);
        notifyCatalogChanged();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "העלאת התמונה נכשלה");
      }
    }
  }

  async function onDelete() {
    if (!allowDelete) return;
    if (!window.confirm("למחוק את הבית מהמפה? אי אפשר לבטל את זה.")) return;
    setBusy(true);
    try {
      const res = admin
        ? await fetch(`/api/admin/houses/${encodeURIComponent(house.id)}`, { method: "DELETE" })
        : await fetch(`/api/houses/${encodeURIComponent(house.id)}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ editCode }),
          });
      const data = await readApiJson<{ error?: string; ok?: boolean }>(res);
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "המחיקה נכשלה");
        return;
      }
      notifyCatalogChanged();
      toast.success("הבית נמחק מהמפה");
      onDeleted?.();
    } catch {
      toast.error("אין קשר לשרת");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {notice ? (
        <div
          ref={noticeRef}
          className="space-y-3 rounded-2xl bg-[#1d1028] p-3.5 ring-1 ring-orange-400/35"
        >
          {notice.mode === "offer" ? (
            <>
              <div className="flex items-start gap-2">
                <Bell className="mt-0.5 size-4 shrink-0 text-orange-300" />
                <div className="min-w-0 space-y-0.5">
                  <p className="text-base font-semibold text-orange-100">לשלוח התראה לשכונה?</p>
                  <p className="text-base text-violet-300">
                    {DEFAULT_PUSH_TEMPLATES[notice.offer.kind].label} · נשלח רק אם תלחצו על הכפתור
                  </p>
                </div>
              </div>
              <PushNotice
                payload={{ title: notice.offer.title, body: notice.offer.body, url: "/" }}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={offerBusy}
                  className="bg-orange-500 text-black hover:bg-orange-400"
                  onClick={() => void sendOffer()}
                >
                  <Bell className="size-4" />
                  {offerBusy ? "שולחים…" : "שלחו התראה לשכונה"}
                </Button>
                <Button type="button" variant="outline" disabled={offerBusy} onClick={() => setNotice(null)}>
                  לא עכשיו
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                <p className="text-base font-semibold text-emerald-200">
                  {notice.mode === "auto"
                    ? "נשלחה התראה אוטומטית לשכונה"
                    : "ההתראה נשלחה לשכונה"}
                </p>
              </div>
              {notice.title ? (
                <PushNotice payload={{ title: notice.title, body: notice.body, url: "/" }} />
              ) : null}
            </>
          )}
        </div>
      ) : null}

      <HouseForm
        key={house.id}
        initial={house}
        submitLabel="שמירת הבית"
        busy={busy}
        onSubmit={onSave}
        extraActions={
          allowDelete ? (
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              className="h-10 w-full"
              onClick={() => void onDelete()}
            >
              <Trash2 className="size-4" />
              מחיקת הבית מהמפה
            </Button>
          ) : null
        }
      />
    </div>
  );
}

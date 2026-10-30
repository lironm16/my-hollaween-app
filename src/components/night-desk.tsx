"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { HouseForm, type HouseFormExtras } from "@/components/house-form";
import { PushNotice } from "@/components/push-notice";
import { Button } from "@/components/ui/button";
import { deviceHouseEditAllowed } from "@/lib/catalog-removed";
import { useLocale } from "@/hooks/use-locale";
import { notifyCatalogChanged, applyLocalHousePatch, queueHouseWrite, rememberPublishedHouse, forgetPublishedHouse, saveOwnedHouse } from "@/lib/offline-db";
import { rememberSessionHouseDetail } from "@/lib/house-detail-session-cache";
import { publishHousePhoto } from "@/lib/house-photo";
import { readApiJson } from "@/lib/api-json";
import { pushAlertsEnabled } from "@/lib/push-enabled";
import { senderPushEndpoint, showLocalPush } from "@/lib/push-client";
import type { HouseInput, PublicHouse } from "@/lib/types";
import type { PushKind } from "@/lib/push-templates";
import { formatMessage } from "@/lib/i18n/format";
import { messagesForLocale } from "@/lib/i18n/translate";

type PushOffer = { kind: PushKind; title: string; body: string };
type PushNoticeState =
  | { mode: "offer"; offer: PushOffer }
  | { mode: "auto" | "sent"; title: string; body: string };
type SaveResult = { house: PublicHouse; pendingPushOffer: boolean };

type Props = {
  house: PublicHouse;
  onUpdated: (house: PublicHouse) => void;
  onCancel?: () => void;
  editCode?: string;
  admin?: boolean;
  allowDelete?: boolean;
  onDeleted?: () => void;
};

export function NightDesk({
  house,
  onUpdated,
  onCancel,
  editCode,
  admin,
  allowDelete = false,
  onDeleted,
}: Props) {
  const { locale, t } = useLocale();
  const editLocked = !deviceHouseEditAllowed(house.id);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<PushNoticeState | null>(null);
  const [offerBusy, setOfferBusy] = useState(false);
  const noticeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!notice) return;
    noticeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [notice]);

  function keepLocal(
    patch: Partial<HouseInput> & {
      photoUrl?: string;
      ownerFrozenUntil?: string | null;
      addedBy?: string | null;
      ownerPhone?: string | null;
    },
  ) {
    if (editLocked) {
      toast.message(t("catalogRemoved.editBlockedToast"));
      return { house, pendingPushOffer: false };
    }
    const next = applyLocalHousePatch(house, patch);
    const url = admin
      ? `/api/admin/houses/${encodeURIComponent(house.id)}`
      : `/api/houses/${encodeURIComponent(house.id)}`;
    queueHouseWrite({
      id: house.id,
      method: "PATCH",
      url,
      body: admin ? { ...patch } : { ...patch, editCode },
      house: next,
      editCode: admin ? undefined : editCode,
      createdAt: new Date().toISOString(),
    });
    onUpdated(next);
    rememberSessionHouseDetail(next);
    notifyCatalogChanged();
    setNotice(null);
    toast.success(t("nightDesk.savedOffline"));
    return { house: next, pendingPushOffer: false };
  }

  async function save(
    patch: Partial<HouseInput> & {
      photoUrl?: string;
      ownerFrozenUntil?: string | null;
      addedBy?: string | null;
      ownerPhone?: string | null;
    },
  ): Promise<SaveResult | null> {
    if (editLocked) {
      toast.message(t("catalogRemoved.editBlockedToast"));
      return null;
    }
    setBusy(true);
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        return keepLocal(patch);
      }
      const includeEndpoint = await senderPushEndpoint();
      const url = admin
        ? `/api/admin/houses/${encodeURIComponent(house.id)}`
        : `/api/houses/${encodeURIComponent(house.id)}`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(admin ? { ...patch, includeEndpoint } : { ...patch, editCode, includeEndpoint }),
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
        toast.error(data.error ?? t("nightDesk.saveFailed"));
        return null;
      }
      onUpdated(data.house);
      rememberSessionHouseDetail(data.house);
      rememberPublishedHouse(data.house);
      if (!admin && editCode) {
        saveOwnedHouse({
          id: data.house.id,
          name: data.house.name,
          editCode,
          preview: data.house,
        });
      }
      notifyCatalogChanged();
      if (pushAlertsEnabled() && data.push?.autoSent) {
        setNotice({
          mode: "auto",
          title: data.push.title ?? "",
          body: data.push.body ?? "",
        });
        void showLocalPush(data.push.title ?? "", data.push.body ?? "", `/?focus=${encodeURIComponent(house.id)}`);
        toast.success(t("nightDesk.savedNotifyAll"));
      } else if (pushAlertsEnabled() && data.push?.offer) {
        setNotice({ mode: "offer", offer: data.push.offer });
        toast.success(t("nightDesk.savedNotifyOffer"));
      } else if (pushAlertsEnabled() && data.push?.kind && !data.push.autoSent && !data.push.offer) {
        setNotice(null);
        toast.success(t("nightDesk.savedNotifyTypeOff"));
      } else {
        setNotice(null);
        toast.success(t("nightDesk.saved"));
      }
      return {
        house: data.house,
        pendingPushOffer: pushAlertsEnabled() && Boolean(data.push?.offer),
      };
    } catch {
      return keepLocal(patch);
    } finally {
      setBusy(false);
    }
  }

  async function sendOffer() {
    if (notice?.mode !== "offer") return;
    const offer = notice.offer;
    setOfferBusy(true);
    try {
      const includeEndpoint = await senderPushEndpoint();
      const res = await fetch(`/api/houses/${encodeURIComponent(house.id)}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editCode, kind: offer.kind, includeEndpoint }),
      });
      const data = await readApiJson<{ error?: string; sent?: number }>(res);
      if (!res.ok) {
        toast.error(data.error ?? t("nightDesk.sendFailed"));
        return;
      }
      toast.success(
        formatMessage(t("nightDesk.notifySentCount"), { count: String(data.sent ?? 0) }),
      );
      setNotice({ mode: "sent", title: offer.title, body: offer.body });
      void showLocalPush(offer.title, offer.body, `/?focus=${encodeURIComponent(house.id)}`);
      onCancel?.();
    } catch {
      toast.error(t("nightDesk.noServer"));
    } finally {
      setOfferBusy(false);
    }
  }

  async function onSave(input: HouseInput, extras?: HouseFormExtras) {
    const saved = await save({
      ...input,
      ownerFrozenUntil: extras?.ownerFrozenUntil ?? null,
      addedBy: extras?.addedBy ?? null,
      ownerPhone: extras?.ownerPhone ?? null,
      ...(extras?.clearPhoto && !extras.photoDataUrl ? { photoUrl: "" } : {}),
    });
    if (!saved) return;
    if (extras?.photoDataUrl) {
      try {
        const withPhoto = await publishHousePhoto(house.id, editCode, extras.photoDataUrl, {
          previousPhotoUrl: house.photoUrl,
        });
        onUpdated(withPhoto);
        rememberSessionHouseDetail(withPhoto);
        rememberPublishedHouse(withPhoto);
        if (!admin && editCode) {
          saveOwnedHouse({
            id: withPhoto.id,
            name: withPhoto.name,
            editCode,
            preview: withPhoto,
          });
        }
        notifyCatalogChanged();
      } catch {
        toast.warning(t("nightDesk.photoSavedNoImage"));
      }
    }
    if (!saved.pendingPushOffer) onCancel?.();
  }

  async function onDelete() {
    if (editLocked) return;
    if (!allowDelete) return;
    if (!window.confirm(t("nightDesk.deleteConfirm"))) return;
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
      if (res.status === 404) {
        forgetPublishedHouse(house.id);
        notifyCatalogChanged();
        toast.success(t("nightDesk.deletedSuccess"));
        onDeleted?.();
        return;
      }
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? t("nightDesk.deleteFailed"));
        return;
      }
      forgetPublishedHouse(house.id);
      notifyCatalogChanged();
      toast.success(t("nightDesk.deletedSuccess"));
      onDeleted?.();
    } catch {
      toast.error(t("nightDesk.noServer"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {editLocked ? (
        <p className="rounded-lg bg-zinc-900/90 px-3 py-2 text-base text-zinc-100" role="status">
          {t("catalogRemoved.viewOnlyNotice")}
        </p>
      ) : null}
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
                  <p className="text-base font-semibold text-orange-100">{t("nightDesk.pushOfferTitle")}</p>
                  <p className="text-base text-violet-300">
                    {formatMessage(t("nightDesk.pushOfferHint"), {
                      kind: messagesForLocale(locale).pushKinds[notice.offer.kind],
                    })}
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
                  {offerBusy ? t("nightDesk.pushSending") : t("nightDesk.pushSend")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={offerBusy}
                  onClick={() => {
                    setNotice(null);
                    onCancel?.();
                  }}
                >
                  {t("nightDesk.pushNotNow")}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                <p className="text-base font-semibold text-emerald-200">
                  {notice.mode === "auto" ? t("nightDesk.pushAutoSent") : t("nightDesk.pushSent")}
                </p>
              </div>
              {notice.title ? (
                <PushNotice payload={{ title: notice.title, body: notice.body, url: "/" }} />
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {editLocked ? null : (
        <HouseForm
          key={house.id}
          initial={house}
          submitLabel={t("common.save")}
          busy={busy}
          onSubmit={onSave}
          onCancel={onCancel}
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
                {t("nightDesk.deleteHouse")}
              </Button>
            ) : null
          }
        />
      )}
    </div>
  );
}

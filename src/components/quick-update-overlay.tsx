"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { CandySign } from "@/components/candy-glyphs";
import { HouseEditModal } from "@/components/house-edit-modal";
import { PushNotice } from "@/components/push-notice";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { readApiJson } from "@/lib/api-json";
import {
  applyLocalHousePatch,
  notifyCatalogChanged,
  queueHouseWrite,
  rememberPublishedHouse,
  saveOwnedHouse,
} from "@/lib/offline-db";
import {
  buildQuickUpdatePatch,
  currentQuickCandy,
  currentQuickHouse,
  previewQuickUpdatePush,
  QUICK_CANDY_OPTIONS,
  QUICK_HOUSE_OPTIONS,
  quickUpdateChanged,
  type QuickCandyChoice,
  type QuickHouseChoice,
} from "@/lib/quick-update";
import type { StoredPushSettings } from "@/lib/push-templates";
import { senderPushEndpoint, showLocalPush } from "@/lib/push-client";
import type { PushKind } from "@/lib/push-templates";
import { isDecorated } from "@/lib/house-state";
import type { Catalog, PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

export function QuickUpdateOverlay({
  house,
  editCode,
  admin,
  open,
  onClose,
  onUpdated,
}: {
  house: PublicHouse;
  editCode?: string;
  admin?: boolean;
  open: boolean;
  onClose: () => void;
  onUpdated: (house: PublicHouse) => void;
}) {
  const [candyPick, setCandyPick] = useState<QuickCandyChoice>(() => currentQuickCandy(house));
  const [housePick, setHousePick] = useState<QuickHouseChoice>(() => currentQuickHouse(house));
  const [sendPush, setSendPush] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pushStored, setPushStored] = useState<StoredPushSettings | null>(null);

  useEffect(() => {
    if (!open) return;
    setCandyPick(currentQuickCandy(house));
    setHousePick(currentQuickHouse(house));
    setSendPush(true);
    void fetch("/api/catalog", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Catalog | null) => {
        setPushStored(data?.pushTemplates ? { templates: data.pushTemplates } : null);
      })
      .catch(() => setPushStored(null));
  }, [open, house.id]);

  const dirty = quickUpdateChanged(house, candyPick, housePick);
  const preview = useMemo(
    () => (dirty ? previewQuickUpdatePush(house, candyPick, housePick, pushStored) : null),
    [dirty, candyPick, housePick, house, pushStored],
  );
  const previewNote =
    preview &&
    preview.kind === "candyOut" &&
    candyPick === "out" &&
    housePick === "open" &&
    isDecorated(house)
      ? "הממתקים נגמרו — הבית עדיין פתוח לביקורים."
      : null;

  async function save() {
    if (!dirty || busy) return;
    const patch = buildQuickUpdatePatch(house, candyPick, housePick);
    setBusy(true);
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
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
        notifyCatalogChanged();
        toast.success("נשמר במכשיר · יישלח כשיש רשת");
        onClose();
        return;
      }

      const includeEndpoint = sendPush && preview ? await senderPushEndpoint() : undefined;
      const url = admin
        ? `/api/admin/houses/${encodeURIComponent(house.id)}`
        : `/api/houses/${encodeURIComponent(house.id)}`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          admin ? { ...patch, includeEndpoint } : { ...patch, editCode, includeEndpoint },
        ),
      });
      const data = await readApiJson<{
        error?: string;
        house?: PublicHouse;
        push?: {
          kind?: PushKind;
          autoSent?: boolean;
          title?: string;
          body?: string;
          offer?: { kind: PushKind; title: string; body: string };
        };
      }>(res);
      if (!res.ok || !data.house) {
        toast.error(data.error ?? "העדכון נכשל");
        return;
      }

      onUpdated(data.house);
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

      if (sendPush && preview && data.push?.autoSent) {
        void showLocalPush(
          data.push.title ?? preview.payload.title,
          data.push.body ?? preview.payload.body,
          preview.payload.url,
        );
        toast.success("נשמר · התראה נשלחה לשכונה");
      } else if (sendPush && preview && data.push?.offer) {
        const notifyRes = await fetch(`/api/houses/${encodeURIComponent(house.id)}/notify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            editCode,
            kind: data.push.offer.kind,
            includeEndpoint,
          }),
        });
        const notifyData = await readApiJson<{ error?: string; sent?: number }>(notifyRes);
        if (!notifyRes.ok) {
          toast.error(notifyData.error ?? "נשמר, אבל שליחת ההתראה נכשלה");
        } else {
          void showLocalPush(data.push.offer.title, data.push.offer.body, preview.payload.url);
          toast.success(`נשמר · התראה נשלחה ל־${notifyData.sent ?? 0} מכשירים`);
        }
      } else {
        toast.success("נשמר");
      }
      onClose();
    } catch {
      toast.error("אין קשר לשרת");
    } finally {
      setBusy(false);
    }
  }

  return (
    <HouseEditModal
      open={open}
      onClose={onClose}
      title="עדכון מהיר"
      subtitle={house.name}
      className="w-[min(100%-2rem,26rem)]"
    >
      <div className="space-y-5">
        <QuickSelectField
          label="ממתקים"
          value={candyPick}
          onChange={setCandyPick}
          options={QUICK_CANDY_OPTIONS.map((option) => ({
            value: option.id,
            label: option.label,
            danger: option.tone === "danger",
            icon: <CandySign tone={option.id} className="size-7" />,
          }))}
        />
        <QuickSelectField
          label="סטטוס הבית"
          value={housePick}
          onChange={setHousePick}
          options={QUICK_HOUSE_OPTIONS.map((option) => ({
            value: option.id,
            label: option.label,
            icon: <span className={cn("night-status-dot night-status-dot--lg border-2", option.dotClass)} />,
          }))}
        />

        {preview ? (
          <div className="space-y-3">
            <label className="flex items-center gap-2.5 rounded-xl bg-[#12081a] px-3 py-3 ring-1 ring-orange-500/20">
              <input
                type="checkbox"
                className="size-5 accent-orange-500"
                checked={sendPush}
                onChange={(event) => setSendPush(event.target.checked)}
              />
              <span className="text-lg text-orange-100">שלחו התראה לשכונה</span>
            </label>
            <PushNotice
              payload={preview.payload}
              time=""
              className={cn(
                "transition-opacity",
                !sendPush && "pointer-events-none opacity-40 saturate-[0.65]",
              )}
            />
            {previewNote ? (
              <p className="text-center text-base leading-snug text-violet-300">{previewNote}</p>
            ) : null}
          </div>
        ) : null}

        <Button
          type="button"
          disabled={!dirty || busy}
          className="h-12 w-full bg-orange-500 text-lg text-black hover:bg-orange-400"
          onClick={() => void save()}
        >
          {busy ? "שומרים…" : "שמירה"}
        </Button>
      </div>
    </HouseEditModal>
  );
}

function QuickSelectField<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: {
    value: T;
    label: string;
    danger?: boolean;
    icon: ReactNode;
  }[];
}) {
  const selected = options.find((option) => option.value === value);

  return (
    <div className="space-y-2">
      <p className="text-lg font-medium text-orange-100">{label}</p>
      <Select value={value} onValueChange={(next) => onChange(next as T)}>
        <SelectTrigger
          className={cn(
            "h-14 min-h-14 w-full rounded-xl border-orange-500/30 bg-[#12081a] px-3 text-lg text-orange-50 shadow-none",
            "[&_[data-slot=select-value]]:flex [&_[data-slot=select-value]]:items-center [&_[data-slot=select-value]]:gap-3",
          )}
          size="default"
        >
          <SelectValue>
            {selected ? (
              <span className="inline-flex items-center gap-3">
                {selected.icon}
                <span className={cn(selected.danger && "text-red-300")}>{selected.label}</span>
              </span>
            ) : null}
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          positionerClassName="house-quick-select-layer"
          className="z-[2100] max-h-72 border-orange-500/30 bg-[#1d1028] text-lg text-orange-50 shadow-xl ring-orange-500/20"
          alignItemWithTrigger={true}
        >
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className={cn(
                "py-3.5 ps-2.5 text-lg focus:bg-orange-500/15 focus:text-orange-50",
                option.danger && "text-red-300",
              )}
            >
              <span className="inline-flex items-center gap-3">
                {option.icon}
                <span>{option.label}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { CandySign } from "@/components/candy-glyphs";
import { HouseEditModal } from "@/components/house-edit-modal";
import { PushNotice } from "@/components/push-notice";
import { Button } from "@/components/ui/button";
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
import { senderPushEndpoint, showLocalPush } from "@/lib/push-client";
import type { PushKind } from "@/lib/push-templates";
import type { PublicHouse } from "@/lib/types";
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
  const currentCandy = currentQuickCandy(house);
  const currentHouse = currentQuickHouse(house);
  const [candyPick, setCandyPick] = useState<QuickCandyChoice | "">("");
  const [housePick, setHousePick] = useState<QuickHouseChoice | "">("");
  const [sendPush, setSendPush] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCandyPick("");
    setHousePick("");
    setSendPush(true);
  }, [open, house.id]);

  const effectiveCandy = candyPick || currentCandy;
  const effectiveHouse = housePick || currentHouse;
  const dirty = quickUpdateChanged(house, effectiveCandy, effectiveHouse);
  const preview = useMemo(
    () => (dirty ? previewQuickUpdatePush(house, effectiveCandy, effectiveHouse) : null),
    [dirty, effectiveCandy, effectiveHouse, house],
  );

  async function save() {
    if (!dirty || busy) return;
    const patch = buildQuickUpdatePatch(house, effectiveCandy, effectiveHouse);
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
          editCode,
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
      if (editCode) {
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
    >
      <div className="space-y-4">
        <QuickSelectField
          label="ממתקים"
          value={candyPick}
          placeholder="בחרו…"
          onChange={setCandyPick}
          options={QUICK_CANDY_OPTIONS.map((option) => ({
            value: option.id,
            label: option.label,
            disabled: option.id === currentCandy,
            danger: option.tone === "danger",
            icon: <CandySign tone={option.id} className="size-5" />,
          }))}
        />
        <QuickSelectField
          label="סטטוס הבית"
          value={housePick}
          placeholder="בחרו…"
          onChange={setHousePick}
          options={QUICK_HOUSE_OPTIONS.map((option) => ({
            value: option.id,
            label: option.label,
            disabled: option.id === currentHouse,
            icon: <span className={cn("night-status-dot", option.dotClass)} />,
          }))}
        />

        {preview ? (
          <div className="space-y-3">
            <PushNotice payload={preview.payload} />
            <label className="flex items-center gap-2 rounded-xl bg-[#12081a] px-3 py-2.5 ring-1 ring-orange-500/20">
              <input
                type="checkbox"
                className="size-4 accent-orange-500"
                checked={sendPush}
                onChange={(event) => setSendPush(event.target.checked)}
              />
              <span className="text-base text-orange-100">שלחו התראה לשכונה</span>
            </label>
          </div>
        ) : null}

        <Button
          type="button"
          disabled={!dirty || busy}
          className="h-11 w-full bg-orange-500 text-base text-black hover:bg-orange-400"
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
  placeholder,
  onChange,
  options,
}: {
  label: string;
  value: T | "";
  placeholder: string;
  onChange: (value: T | "") => void;
  options: {
    value: T;
    label: string;
    disabled?: boolean;
    danger?: boolean;
    icon: ReactNode;
  }[];
}) {
  const selected = options.find((option) => option.value === value);

  return (
    <div className="space-y-1.5">
      <p className="text-base font-medium text-orange-100">{label}</p>
      <div className="relative">
        {selected ? (
          <span className="pointer-events-none absolute start-3 top-1/2 z-10 -translate-y-1/2">
            {selected.icon}
          </span>
        ) : null}
        <select
          value={value}
          onChange={(event) => onChange(event.target.value as T | "")}
          className={cn(
            "house-quick-select h-11 w-full appearance-none rounded-lg border border-orange-500/30 bg-[#12081a] py-2 text-base text-orange-50 outline-none focus-visible:border-orange-400 focus-visible:ring-2 focus-visible:ring-orange-400/30",
            selected ? "ps-11 pe-10" : "px-3 pe-10",
            selected?.danger && "text-red-300",
          )}
        >
          <option value="" disabled hidden>{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-violet-300" aria-hidden="true">
          ▾
        </span>
      </div>
    </div>
  );
}

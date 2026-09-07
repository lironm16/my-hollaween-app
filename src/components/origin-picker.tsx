"use client";

import { useState, type ReactNode } from "react";
import { MapPin, Navigation, Search } from "lucide-react";
import { AddressField } from "@/components/address-field";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { DistanceOriginChoice } from "@/lib/distance-origin";
import { originLabel } from "@/lib/distance-origin";
import { inNeighborhood } from "@/lib/config";
import { cn } from "@/lib/utils";

export function OriginTrigger({
  shifted,
  onClick,
}: {
  shifted: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={shifted ? "נקודת מדידה שונה מהמיקום הנוכחי" : "מאיפה למדוד מרחק"}
      title={shifted ? "נקודת מדידה שונה מהמיקום הנוכחי" : "מאיפה למדוד מרחק"}
      onClick={onClick}
      className={cn(
        "relative inline-flex size-9 shrink-0 items-center justify-center rounded-lg",
        shifted
          ? "bg-orange-500 text-black"
          : "bg-[#1d1028] text-orange-100 ring-1 ring-orange-500/25",
      )}
    >
      <MapPin className="size-4" />
      {shifted ? (
        <span className="absolute -top-1 -start-1 inline-flex min-w-4 items-center justify-center rounded-full bg-black px-1 text-base font-bold text-orange-300">
          &nbsp;
        </span>
      ) : null}
    </button>
  );
}

export function OriginPickerSheet({
  open,
  onOpenChange,
  choice,
  gpsAllowed = true,
  onChooseGps,
  onChooseNeighborhood,
  onChooseCustom,
  onPickOnMap,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  choice: DistanceOriginChoice;
  gpsAllowed?: boolean;
  onChooseGps: () => void;
  onChooseNeighborhood: () => void;
  onChooseCustom: (lat: number, lng: number, label: string) => void;
  onPickOnMap: () => void;
}) {
  const [address, setAddress] = useState("");
  const [addressOk, setAddressOk] = useState(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="flex flex-col gap-0 overflow-hidden rounded-t-2xl border-orange-500/25 bg-[#160b1f] p-0 sm:max-w-none"
      >
        <SheetHeader className="shrink-0 border-b border-orange-500/15 px-4 py-3">
          <SheetTitle className="text-lg font-semibold text-orange-50">מאיפה למדוד מרחק</SheetTitle>
          <p className="text-base text-violet-300">למיון ברשימה, למפה, ולמסלול</p>
        </SheetHeader>
        <div className="space-y-2 px-4 py-3">
          <OriginOption
            active={gpsAllowed && choice.kind === "gps"}
            disabled={!gpsAllowed}
            icon={<Navigation className="size-4" />}
            label="המיקום שלי"
            hint={gpsAllowed ? "GPS" : "אשרו גישה למיקום בהגדרות"}
            onClick={onChooseGps}
          />
          <OriginOption
            active={choice.kind === "neighborhood"}
            icon={<MapPin className="size-4" />}
            label="מרכז השכונה"
            onClick={onChooseNeighborhood}
          />
          <OriginOption
            active={choice.kind === "custom"}
            icon={<MapPin className="size-4" />}
            label="בחירה על המפה"
            hint={choice.kind === "custom" ? originLabel(choice) : undefined}
            onClick={onPickOnMap}
          />
          <div className="rounded-xl bg-[#1d1028] p-3 ring-1 ring-orange-500/20">
            <p className="mb-2 flex items-center gap-2 text-base font-medium text-orange-100">
              <Search className="size-4" />
              חיפוש כתובת
            </p>
            <AddressField
              value={address}
              confirmed={addressOk}
              onChange={(value) => {
                setAddress(value);
                setAddressOk(false);
              }}
              onSelect={(hit) => {
                if (!inNeighborhood(hit.lat, hit.lng)) return;
                setAddress(hit.label);
                setAddressOk(true);
                onChooseCustom(hit.lat, hit.lng, hit.label);
              }}
            />
          </div>
        </div>
        <div className="border-t border-orange-500/15 px-4 py-3">
          <Button type="button" variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            סגירה
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function OriginOption({
  active,
  disabled,
  icon,
  label,
  hint,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-start ring-1",
        disabled
          ? "cursor-not-allowed bg-[#1d1028] text-orange-100/45 ring-orange-500/15"
          : active
            ? "bg-orange-500 text-black ring-orange-400"
            : "bg-[#1d1028] text-orange-100 ring-orange-500/20",
      )}
    >
      <span className="inline-flex size-9 items-center justify-center rounded-lg bg-black/15">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-medium">{label}</span>
        {hint ? (
          <span
            className={cn(
              "block text-base",
              disabled ? "text-amber-200" : active ? "text-black/70" : "text-violet-300",
            )}
          >
            {hint}
          </span>
        ) : null}
      </span>
    </button>
  );
}

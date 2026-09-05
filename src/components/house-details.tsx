"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { CheckCircle2, Heart, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { CodesCopy } from "@/components/codes-copy";
import { HoursStatusBanner } from "@/components/hours-status-banner";
import { HouseTags } from "@/components/house-tags";
import { formatDisplayAddress } from "@/lib/config";
import { formatHoursLabel } from "@/lib/hours";
import { houseHeadline } from "@/lib/labels";
import { houseMapsUrl } from "@/lib/nav-links";
import { effectiveVisit, freezeLabel, isFrozen, candyLevel, markedCandy } from "@/lib/house-state";
import { loadOwnedHouses } from "@/lib/offline-db";
import { shouldLoadHousePhoto } from "@/lib/photos";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

export function HouseDetails({
  house,
  extra,
  catalogSource,
  liked,
  onToggleLike,
  visited,
  onToggleVisited,
  managerEditCode,
  canEdit = false,
  editing = false,
  onToggleEdit,
  chrome = "page",
  actions,
}: {
  house: PublicHouse;
  extra?: ReactNode;
  catalogSource?: string | null;
  liked?: boolean;
  onToggleLike?: () => void;
  visited?: boolean;
  onToggleVisited?: () => void;
  /** When set (manager session), always show this edit code for resend. */
  managerEditCode?: string;
  canEdit?: boolean;
  editing?: boolean;
  onToggleEdit?: () => void;
  /** Rendered under the title, e.g. per-apartment map actions in the sheet. */
  actions?: ReactNode;
  /** Sheet cards have their own action bar; still show the title and details. */
  chrome?: "page" | "sheet";
}) {
  const displayAddress = formatDisplayAddress(house);
  const [ownedEditCode, setOwnedEditCode] = useState<string | undefined>(undefined);
  const [showPhoto, setShowPhoto] = useState(false);
  const [photoBroken, setPhotoBroken] = useState(false);
  const [photoReady, setPhotoReady] = useState(false);
  const loadPhoto = photoReady && (showPhoto || shouldLoadHousePhoto(catalogSource));
  const editCode = managerEditCode ?? ownedEditCode;

  useEffect(() => {
    setPhotoReady(true);
  }, []);

  useEffect(() => {
    const owned = loadOwnedHouses().find((item) => item.id === house.id);
    setOwnedEditCode(owned?.editCode);
    setShowPhoto(false);
    setPhotoBroken(false);
  }, [house.id, house.photoUrl]);
  const sheet = chrome === "sheet";
  const hours = formatHoursLabel(house);
  const visit = effectiveVisit(house);
  const withTreats = { treats: house.treats ?? [], treatStock: house.treatStock };
  const candyOut = visit === "come" && markedCandy(withTreats) && candyLevel(withTreats) === "out";
  const addressLine = hours ? `${displayAddress} · ${hours}` : displayAddress;
  return (
    <div className="space-y-3">
      {visit === "closed" ? (
        <p className="rounded-lg bg-red-950/40 px-3 py-2 text-sm font-semibold text-red-500">
          הבית סגור
        </p>
      ) : visit === "decorOnly" ? (
        <p className="rounded-lg bg-amber-950/50 px-3 py-2 text-sm text-amber-100">
          הבית מקושט ושמחים שתבקרו להסתכל — בלי ממתקים כרגע.
        </p>
      ) : candyOut ? (
        <p className="rounded-lg bg-red-950/40 px-3 py-2 text-sm font-semibold text-red-500">
          נגמר המלאי
        </p>
      ) : null}
      <HoursStatusBanner house={house} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl text-orange-300">{houseHeadline(house)}</p>
          <p className={cn("text-violet-200", sheet ? "text-base" : "text-sm")}>{addressLine}</p>
        </div>
        {sheet ? null : (
          <div className="flex shrink-0 items-center gap-0.5">
            {onToggleVisited ? (
              <button
                type="button"
                aria-label={visited ? "סמנו כלא ביקרתי" : "סמנו שביקרתי"}
                onClick={onToggleVisited}
                className="rounded-full p-1.5 text-orange-200 hover:bg-orange-500/15"
              >
                <CheckCircle2
                  className={cn("size-6", visited && "fill-emerald-500/30 text-emerald-400")}
                />
              </button>
            ) : null}
            {onToggleLike ? (
              <button
                type="button"
                aria-label={liked ? "הסירו מהשמורים" : "שמרו את הבית"}
                onClick={onToggleLike}
                className="rounded-full p-1.5 text-orange-200 hover:bg-orange-500/15"
              >
                <Heart className={cn("size-6", liked && "fill-orange-500 text-orange-500")} />
              </button>
            ) : null}
            {canEdit && onToggleEdit ? (
              <button
                type="button"
                aria-label={editing ? "סגירת עריכה" : "עריכת הבית"}
                aria-pressed={editing}
                onClick={onToggleEdit}
                className={cn(
                  "rounded-full p-1.5 text-orange-200 hover:bg-orange-500/15",
                  editing && "bg-orange-500/20 text-orange-300",
                )}
              >
                <Pencil className="size-6" />
              </button>
            ) : null}
          </div>
        )}
      </div>
      {actions}
      {house.photoUrl && !photoBroken ? (
        loadPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={house.photoUrl}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setPhotoBroken(true)}
            className="h-40 w-full rounded-xl object-cover ring-1 ring-orange-500/25"
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowPhoto(true)}
            className="w-full rounded-xl bg-[#2a1638] px-3 py-3 text-sm text-amber-100 ring-1 ring-orange-500/20"
          >
            יש תמונת קישוט — לחצו רק אם הרשת פנויה
          </button>
        )
      ) : null}
      {isFrozen(house) ? (
        <p className="rounded-lg bg-violet-950/70 px-3 py-2 text-sm text-violet-100">
          {freezeLabel(house)} — לא מוצג לילדים במפה הציבורית.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-1.5">
        <HouseTags house={house} />
        {house.status === "pending" ? <Badge variant="secondary">ממתין לאישור</Badge> : null}
      </div>
      {house.arrival ? (
        <p className="rounded-lg bg-[#2a1638] px-3 py-2 text-sm text-amber-100">
          איך מגיעים: {house.arrival}
        </p>
      ) : null}
      {house.description ? (
        <p className="text-sm leading-relaxed text-violet-50">{house.description}</p>
      ) : null}
      {house.notes ? (
        <p className="text-sm text-amber-200/90">הערה: {house.notes}</p>
      ) : null}
      <CodesCopy editCode={editCode} />
      {sheet ? null : (
      <div className="flex flex-wrap gap-2 pt-1">
        <a
          href={houseMapsUrl(house)}
          target="_blank"
          rel="noreferrer"
          className={cn(buttonVariants({ size: "sm" }))}
        >
          ניווט ב־Google Maps
        </a>
        <Link
          href={`/house/${encodeURIComponent(house.id)}`}
          className={cn(buttonVariants({ size: "sm", variant: "ghost" }))}
        >
          קישור לבית
        </Link>
      </div>
      )}
      {extra}
    </div>
  );
}

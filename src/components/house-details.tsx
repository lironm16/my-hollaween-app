"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { CheckCircle2, Heart, Pencil, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { CodesCopy } from "@/components/codes-copy";
import { HoursStatusBanner } from "@/components/hours-status-banner";
import { HouseTags } from "@/components/house-tags";
import { formatDisplayAddress } from "@/lib/config";
import { formatHoursLabel } from "@/lib/hours";
import { houseHeadline } from "@/lib/labels";
import { houseMapsUrl } from "@/lib/nav-links";
import { effectiveVisit, freezeLabel, isFrozen } from "@/lib/house-state";
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
  /** Sheet chrome already has Maps / share / heart / visited. */
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
  return (
    <div className="space-y-3">
      {sheet ? null : (
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl text-orange-300">{houseHeadline(house)}</p>
          <p className="text-sm text-violet-200">{displayAddress}</p>
        </div>
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
        </div>
      </div>
      )}
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
      {effectiveVisit(house) === "closed" ? (
        <p className="rounded-lg bg-red-950/40 px-3 py-2 text-sm font-semibold text-red-500">
          נגמר המלאי
        </p>
      ) : effectiveVisit(house) === "decorOnly" ? (
        <p className="rounded-lg bg-amber-950/50 px-3 py-2 text-sm text-amber-100">
          הבית מקושט ושמחים שתבקרו להסתכל — בלי ממתקים כרגע.
        </p>
      ) : null}
      {formatHoursLabel(house) ? (
        <p className="text-sm text-violet-200">שעות: {formatHoursLabel(house)}</p>
      ) : null}
      <HoursStatusBanner house={house} />
      {house.arrival ? (
        <p className="rounded-lg bg-[#2a1638] px-3 py-2 text-sm text-amber-100">
          איך מגיעים: {house.arrival}
        </p>
      ) : null}
      {house.description ? (
        <p className="text-sm leading-relaxed text-violet-50">{house.description}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-1.5">
        <HouseTags house={house} />
        {house.status === "pending" ? <Badge variant="secondary">ממתין לאישור</Badge> : null}
      </div>
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
      {canEdit && onToggleEdit ? (
        <button
          type="button"
          aria-label={editing ? "סגירת עריכה" : "עריכה"}
          aria-pressed={editing}
          onClick={onToggleEdit}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition",
            editing
              ? "bg-orange-500 text-black hover:bg-orange-400"
              : "text-orange-200 hover:bg-orange-500/15",
          )}
        >
          {editing ? <X className="size-4 shrink-0" /> : <Pencil className="size-4 shrink-0" />}
          <span>{editing ? "סגירה" : "עריכה"}</span>
        </button>
      ) : null}
      {extra}
    </div>
  );
}

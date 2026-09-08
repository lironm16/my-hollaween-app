"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Heart, Pencil } from "lucide-react";
import { VisitedCheck } from "@/components/visited-check";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { HoursStatusBanner } from "@/components/hours-status-banner";
import { HouseTags } from "@/components/house-tags";
import { formatDisplayAddress } from "@/lib/config";
import { formatDistance } from "@/lib/geo";
import { formatHoursLabel } from "@/lib/hours";
import { houseHeadline } from "@/lib/labels";
import { houseMapsUrl } from "@/lib/nav-links";
import { shouldLoadHousePhoto } from "@/lib/photos";
import { HouseActionCount } from "@/components/house-action-bar";
import { useHouseTraffic } from "@/hooks/use-house-traffic";
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
  canEdit = false,
  editing = false,
  onToggleEdit,
  chrome = "page",
  actions,
  compact = false,
  distanceM,
  index,
}: {
  house: PublicHouse;
  extra?: ReactNode;
  catalogSource?: string | null;
  liked?: boolean;
  onToggleLike?: () => void;
  visited?: boolean;
  onToggleVisited?: () => void;
  canEdit?: boolean;
  editing?: boolean;
  onToggleEdit?: () => void;
  /** Rendered under the title, e.g. per-apartment map actions in the sheet. */
  actions?: ReactNode;
  /** Sheet cards have their own action bar; still show the title and details. */
  chrome?: "page" | "sheet";
  /** List collapsed state: same top block as the map card, without the long details. */
  compact?: boolean;
  distanceM?: number;
  index?: number;
}) {
  const displayAddress = formatDisplayAddress(house);
  const { trafficFor } = useHouseTraffic();
  const traffic = trafficFor(house.id);
  const [showPhoto, setShowPhoto] = useState(false);
  const [photoBroken, setPhotoBroken] = useState(false);
  const [photoReady, setPhotoReady] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const loadPhoto = photoReady && (showPhoto || shouldLoadHousePhoto(catalogSource));

  useEffect(() => {
    setPhotoReady(true);
  }, []);

  useEffect(() => {
    setShowPhoto(false);
    setPhotoBroken(false);
    setPhotoOpen(false);
  }, [house.id, house.photoUrl]);
  const sheet = chrome === "sheet";
  const hours = formatHoursLabel(house);
  const parts = [displayAddress, hours, distanceM !== undefined ? formatDistance(distanceM) : ""]
    .filter(Boolean)
    .join(" · ");
  const hasPhoto = Boolean(house.photoUrl && !photoBroken);
  const indexBadge =
    index != null ? (
      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-orange-500 font-sans text-base font-bold text-black">
        {index}
      </span>
    ) : null;
  const photo =
    hasPhoto ? (
      loadPhoto ? (
        <button
          type="button"
          aria-label="הגדלת התמונה"
          onClick={(e) => {
            e.stopPropagation();
            setPhotoOpen(true);
          }}
          className={cn("block overflow-hidden rounded-xl ring-1 ring-orange-500/25", compact ? "shrink-0" : "w-full")}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={house.photoUrl}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setPhotoBroken(true)}
            className={cn(
              "object-cover",
              compact ? "h-32 w-32" : "h-56 w-full",
            )}
          />
        </button>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowPhoto(true);
          }}
          className={cn(
            "rounded-xl bg-[#2a1638] px-3 py-3 text-base text-amber-100 ring-1 ring-orange-500/20",
            compact ? "h-32 w-32 shrink-0" : "w-full",
          )}
        >
          יש תמונת קישוט — לחצו רק אם הרשת פנויה
        </button>
      )
    ) : null;
  const indexByPhoto = Boolean(indexBadge && photo);
  return (
    <div className="space-y-3">
      {photoOpen && house.photoUrl && typeof document !== "undefined"
        ? createPortal(
            <button
              type="button"
              aria-label="סגירת התמונה"
              className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4"
              onClick={(e) => {
                e.stopPropagation();
                setPhotoOpen(false);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={house.photoUrl}
                alt=""
                className="max-h-full max-w-full rounded-xl object-contain"
              />
            </button>,
            document.body,
          )
        : null}
      <HoursStatusBanner house={house} />
      <div className={cn("flex items-start gap-3", compact && photo && "flex-row")}>
        {compact && photo ? (
          <div className="flex shrink-0 items-start gap-1.5">
            {indexBadge}
            {photo}
          </div>
        ) : null}
        <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "font-display text-orange-300 break-words",
              compact ? "text-2xl" : "text-xl",
            )}
          >
            {index != null && !indexByPhoto ? (
              <span className="me-2 font-sans font-bold text-orange-400">{index}</span>
            ) : null}
            {liked && !compact ? (
              <Heart
                className="mb-0.5 me-1.5 inline size-5 fill-current text-[#fb7185]"
                strokeWidth={2.2}
                aria-label="שמור"
              />
            ) : null}
            {houseHeadline(house)}
          </p>
          <p
            className={cn(
              "leading-snug text-violet-200 break-words",
              compact ? "text-base" : "text-sm",
            )}
          >
            {parts}
          </p>
        </div>
        {sheet ? null : (
          <div className="flex shrink-0 items-center gap-0.5">
            {onToggleVisited ? (
              <button
                type="button"
                aria-label={
                  visited
                    ? `סמנו כלא ביקרתי, ${traffic.visited} ביקרו`
                    : `סמנו שביקרתי, ${traffic.visited} ביקרו`
                }
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleVisited();
                }}
                className="inline-flex items-center gap-2 rounded-full p-1.5 text-orange-200 hover:bg-orange-500/15"
              >
                <VisitedCheck visited={visited} />
                <HouseActionCount n={Math.max(traffic.visited, visited ? 1 : 0)} />
              </button>
            ) : null}
            {onToggleLike ? (
              <button
                type="button"
                aria-label={
                  liked
                    ? `הסירו מהשמורים, ${traffic.saved} שמרו`
                    : `שמרו את הבית, ${traffic.saved} שמרו`
                }
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLike();
                }}
                className="inline-flex items-center gap-2 rounded-full p-1.5 text-orange-200 hover:bg-orange-500/15"
              >
                <Heart
                  className={cn("size-6", liked ? "fill-current text-[#fb7185]" : "text-[#fde68a]")}
                  strokeWidth={2.2}
                />
                <HouseActionCount n={Math.max(traffic.saved, liked ? 1 : 0)} />
              </button>
            ) : null}
            {canEdit && onToggleEdit ? (
              <button
                type="button"
                aria-label={editing ? "סגירת עריכה" : "עריכת הבית"}
                aria-pressed={editing}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleEdit();
                }}
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
      </div>
      {actions}
      <div className="flex flex-wrap items-center gap-1.5">
        <HouseTags house={house} large={compact} />
        {house.status === "pending" ? <Badge variant="secondary">ממתין לאישור</Badge> : null}
      </div>
      {house.arrival ? (
        <p className="rounded-lg bg-[#2a1638] px-3 py-2 text-base text-amber-100">
          איך מגיעים: {house.arrival}
        </p>
      ) : null}
      {compact ? null : (
        <>
          {house.description ? (
            <p className="text-base leading-relaxed text-violet-50">{house.description}</p>
          ) : null}
          {house.notes ? (
            <p className="text-base text-amber-200/90">הערה: {house.notes}</p>
          ) : null}
          {sheet ? null : (
            <div className="flex flex-wrap gap-2 pt-1">
              <a
                href={houseMapsUrl(house)}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={cn(buttonVariants({ size: "sm" }))}
              >
                ניווט ב־Google Maps
              </a>
              <Link
                href={`/house/${encodeURIComponent(house.id)}`}
                onClick={(e) => e.stopPropagation()}
                className={cn(buttonVariants({ size: "sm", variant: "ghost" }))}
              >
                קישור לבית
              </Link>
            </div>
          )}
          {photo ? (
            <div className="flex items-start gap-2">
              {indexBadge}
              <div className="min-w-0 flex-1">{photo}</div>
            </div>
          ) : null}
          {extra}
        </>
      )}
    </div>
  );
}

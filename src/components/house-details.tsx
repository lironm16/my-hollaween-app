"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ChevronDown, Heart, Pencil } from "lucide-react";
import { VisitedCheck } from "@/components/visited-check";
import { buttonVariants } from "@/components/ui/button";
import { HoursStatusBanner } from "@/components/hours-status-banner";
import { HouseTags } from "@/components/house-tags";
import { formatDisplayAddress } from "@/lib/config";
import { formatDistance } from "@/lib/geo";
import { HoursLabel } from "@/components/clock-time";
import { formatHoursLabel } from "@/lib/hours";
import { houseAddedMetaLine } from "@/lib/house-meta";
import { houseHeadline } from "@/lib/labels";
import { houseMapsUrl } from "@/lib/nav-links";
import { shouldLoadHousePhoto } from "@/lib/photos";
import type { PublicHouse } from "@/lib/types";
import { HOUSE_CARD_PHOTO_BOX } from "@/components/house-photo-frame";
import { cn } from "@/lib/utils";

const DESCRIPTION_PREFIX = "מה מחכה בבית:";

function useMultilineText(text: string, resetKey: string) {
  const measureRef = useRef<HTMLParagraphElement>(null);
  const [multiline, setMultiline] = useState(false);

  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!text || !el) {
      setMultiline(false);
      return;
    }
    const check = () => {
      const style = getComputedStyle(el);
      const lineHeight = Number.parseFloat(style.lineHeight);
      if (!Number.isFinite(lineHeight)) {
        setMultiline(el.scrollHeight > el.clientHeight + 1);
        return;
      }
      setMultiline(el.scrollHeight > lineHeight + 2);
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, resetKey]);

  return { measureRef, multiline };
}

function CompactTextSection({
  title,
  text,
  houseId,
  defaultOpen = false,
  titleClassName,
  bodyClassName,
}: {
  title: string;
  text: string;
  houseId: string;
  defaultOpen?: boolean;
  titleClassName?: string;
  bodyClassName?: string;
}) {
  const { measureRef, multiline } = useMultilineText(text, houseId);

  return (
    <div className="relative">
      <p
        ref={measureRef}
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 -z-10 opacity-0 text-base leading-snug [overflow-wrap:anywhere]",
          bodyClassName,
        )}
      >
        {text}
      </p>
      <ListDetailSection
        title={title}
        collapsible={multiline}
        defaultOpen={multiline ? defaultOpen : true}
        resetKey={houseId}
        titleClassName={titleClassName}
        bodyClassName={bodyClassName}
      >
        <p>{text}</p>
      </ListDetailSection>
    </div>
  );
}

function ListDetailSection({
  title,
  children,
  collapsible = false,
  defaultOpen = false,
  resetKey,
  titleClassName,
  bodyClassName,
}: {
  title: string;
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  /** When this changes the section collapses again (e.g. house id). */
  resetKey?: string;
  titleClassName?: string;
  bodyClassName?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    setOpen(defaultOpen);
  }, [resetKey, defaultOpen]);

  const panel = (
    <div className={cn("space-y-1 [overflow-wrap:anywhere]", bodyClassName)}>{children}</div>
  );

  if (!collapsible) {
    return (
      <div className="rounded-lg bg-[#2a1638] px-3 py-2 text-base leading-snug">
        <p className={cn("mb-1 text-sm font-medium", titleClassName ?? "text-violet-200/80")}>
          {title}
        </p>
        {panel}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg bg-[#2a1638] text-base leading-snug text-amber-100">
      <button
        type="button"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className="flex w-full items-center gap-2 px-3 py-2 text-right transition hover:bg-[#342040]"
      >
        <span className={cn("min-w-0 flex-1 text-sm font-medium", titleClassName ?? "text-amber-200/80")}>
          {title}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-amber-200/70 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open ? <div className="border-t border-white/5 px-3 pb-2 pt-1">{panel}</div> : null}
    </div>
  );
}

function HouseArrivalDirections({
  arrival,
  compact,
  houseId,
}: {
  arrival?: string | null;
  compact: boolean;
  houseId: string;
}) {
  const arrivalText = arrival?.trim() ?? "";
  if (!arrivalText) return null;

  if (compact) {
    return (
      <CompactTextSection
        title="הוראות הגעה"
        text={arrivalText}
        houseId={houseId}
        titleClassName="text-amber-200/80"
        bodyClassName="text-amber-100"
      />
    );
  }

  return (
    <p className="rounded-lg bg-[#2a1638] px-3 py-2 text-base text-amber-100">
      איך מגיעים: {arrivalText}
    </p>
  );
}

function HouseNotesSection({
  notes,
  compact,
  houseId,
}: {
  notes?: string | null;
  compact: boolean;
  houseId: string;
}) {
  const text = notes?.trim() ?? "";
  if (!compact || !text) return null;

  return (
    <CompactTextSection
      title="הערה"
      text={text}
      houseId={houseId}
      titleClassName="text-amber-200/80"
      bodyClassName="text-amber-200/90"
    />
  );
}

function HouseDescriptionSection({
  description,
  compact,
  houseId,
}: {
  description?: string | null;
  compact: boolean;
  houseId: string;
}) {
  const text = description?.trim() ?? "";
  const [textExpanded, setTextExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const clampRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTextExpanded(false);
  }, [houseId, text]);

  useLayoutEffect(() => {
    if (!compact || !text || textExpanded) {
      setOverflows(false);
      return;
    }
    const el = clampRef.current;
    if (!el) return;
    const check = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [compact, text, textExpanded]);

  if (!compact || !text) return null;

  const showToggle = overflows || textExpanded;

  return (
    <ListDetailSection
      title="מה מחכה בבית"
      resetKey={houseId}
      titleClassName="text-violet-200/80"
      bodyClassName="text-violet-50"
    >
      <div
        ref={clampRef}
        className={cn(
          "leading-relaxed [overflow-wrap:anywhere]",
          !textExpanded && "line-clamp-3",
        )}
      >
        {text}
      </div>
      {showToggle ? (
        <button
          type="button"
          className="text-sm font-medium text-orange-300 underline underline-offset-2 hover:text-orange-200"
          onClick={(event) => {
            event.stopPropagation();
            setTextExpanded((value) => !value);
          }}
        >
          {textExpanded ? "הצג פחות" : "הצג עוד"}
        </button>
      ) : null}
    </ListDetailSection>
  );
}

function HouseComments({
  house,
  includeNotes,
}: {
  house: PublicHouse;
  includeNotes: boolean;
}) {
  const description = house.description?.trim() ?? "";
  const notes = includeNotes ? (house.notes?.trim() ?? "") : "";

  if (!description && !notes) return null;

  return (
    <div className="space-y-2">
      {notes ? <p className="text-base text-amber-200/90">הערה: {notes}</p> : null}
      {description ? (
        <p className="text-base leading-relaxed text-violet-50">
          {DESCRIPTION_PREFIX} {description}
        </p>
      ) : null}
    </div>
  );
}

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
  headerMenu,
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
  headerMenu?: ReactNode;
  /** Sheet cards have their own action bar; still show the title and details. */
  chrome?: "page" | "sheet";
  /** List collapsed state: same top block as the map card, without the long details. */
  compact?: boolean;
  distanceM?: number;
  index?: number;
}) {
  const displayAddress = formatDisplayAddress(house);
  const addedMeta = houseAddedMetaLine(house);
  const [showPhoto, setShowPhoto] = useState(false);
  const [photoBroken, setPhotoBroken] = useState(false);
  const [photoReady, setPhotoReady] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const loadPhoto = photoReady && (showPhoto || shouldLoadHousePhoto(catalogSource, house.photoUrl));

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
          className={HOUSE_CARD_PHOTO_BOX}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={house.photoUrl}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setPhotoBroken(true)}
            className="h-full w-full object-cover"
          />
        </button>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowPhoto(true);
          }}
          className={`${HOUSE_CARD_PHOTO_BOX} flex items-center justify-center bg-[#2a1638] px-2 py-2 text-center text-base text-amber-100`}
        >
          יש תמונת קישוט — לחצו רק אם הרשת פנויה
        </button>
      )
    ) : null;
  const pageActions = sheet ? null : (
    <div className="flex shrink-0 items-center gap-0.5">
      {onToggleVisited ? (
        <button
          type="button"
          aria-label={visited ? "סמנו כלא ביקרתי" : "סמנו שביקרתי"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisited();
          }}
          className="rounded-full p-1.5 text-orange-200 hover:bg-orange-500/15"
        >
          <VisitedCheck visited={visited} />
        </button>
      ) : null}
      {onToggleLike ? (
        <button
          type="button"
          aria-label={liked ? "הסירו מהשמורים" : "שמרו את הבית"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleLike();
          }}
          className="rounded-full p-1.5 text-orange-200 hover:bg-orange-500/15"
        >
          <Heart
            className={cn("size-6", liked ? "fill-current text-[#fb7185]" : "text-[#fde68a]")}
            strokeWidth={2.2}
          />
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
  );
  const metaSep = " · ";
  const metaTextClass = cn(
    "min-w-0 leading-snug text-violet-200 break-words",
    compact ? "text-base" : "text-lg leading-relaxed",
  );
  const hoursDistance = (
    <>
      {hours ? <HoursLabel house={house} /> : null}
      {hours && distanceM !== undefined ? metaSep : null}
      {distanceM !== undefined ? formatDistance(distanceM) : null}
    </>
  );
  const meta = (
    <div className={metaTextClass}>
      {photo || compact ? (
        <>
          {displayAddress ? <p className="break-words">{displayAddress}</p> : null}
          {hours || distanceM !== undefined ? <p>{hoursDistance}</p> : null}
        </>
      ) : (
        <p className="break-words">
          {displayAddress}
          {displayAddress && (hours || distanceM !== undefined) ? metaSep : null}
          {hoursDistance}
        </p>
      )}
    </div>
  );
  return (
    <div className={cn(compact ? "space-y-2" : "space-y-3")}>
      {photoOpen && house.photoUrl && typeof document !== "undefined"
        ? createPortal(
            <button
              type="button"
              aria-label="סגירת התמונה"
              onClick={(e) => {
                e.stopPropagation();
                setPhotoOpen(false);
              }}
              className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4"
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
      <HoursStatusBanner house={house} compact={compact} />
      <div className={cn(compact ? "space-y-1.5" : "space-y-2")}>
        <div className="flex min-w-0 items-center gap-2">
          {indexBadge}
          <p
            className={cn(
              "min-w-0 flex-1 font-display text-xl text-orange-300 break-words",
            )}
          >
            {liked && !compact ? (
              <Heart
                className="mb-0.5 me-1.5 inline size-5 fill-current text-[#fb7185]"
                strokeWidth={2.2}
                aria-label="שמור"
              />
            ) : null}
            {houseHeadline(house)}
          </p>
          {headerMenu ? <div className="house-details-menu shrink-0">{headerMenu}</div> : null}
        </div>
        {pageActions}
        <div className="flex flex-wrap items-center gap-1.5">
          <HouseTags house={house} large={compact} />
        </div>
      </div>
      {photo ? (
        <div className="flex items-start gap-3">
          {photo}
          {meta}
        </div>
      ) : (
        meta
      )}
      {actions}
      <HouseArrivalDirections arrival={house.arrival} compact={compact} houseId={house.id} />
      <HouseNotesSection notes={house.notes} compact={compact} houseId={house.id} />
      <HouseDescriptionSection
        description={house.description}
        compact={compact}
        houseId={house.id}
      />
      {!compact ? <HouseComments house={house} includeNotes /> : null}
      {addedMeta ? (
        <p className="text-sm text-violet-400">{addedMeta}</p>
      ) : null}
      {!compact ? (
        <>
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
          {extra}
        </>
      ) : null}
    </div>
  );
}

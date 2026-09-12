"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Heart,
  List,
  MapPinned,
  MoreVertical,
  Navigation,
  Pencil,
  Share2,
  SkipForward,
  Undo2,
} from "lucide-react";
import { VisitedCheck } from "@/components/visited-check";
import { useHouseTraffic } from "@/hooks/use-house-traffic";
import { toast } from "sonner";
import { houseMapsUrl, shareHouse } from "@/lib/nav-links";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

export function formatActionCount(n: number) {
  const value = Math.max(0, Math.floor(n) || 0);
  return value > 999 ? "999+" : String(value);
}

/** Neighborhood count next to heart / check — no extra label. */
export function HouseActionCount({ n }: { n: number }) {
  return (
    <span className="house-action-count" aria-hidden="true">
      {formatActionCount(n)}
    </span>
  );
}

type MenuItem = {
  id: string;
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  href?: string;
  external?: boolean;
  active?: boolean;
};

export function HouseActionBar({
  house,
  liked,
  visited,
  onToggleLike,
  onToggleVisited,
  onToggleEdit,
  onShowOnMap,
  onShowInList,
  onSkip,
  onRestoreRoute,
  skipped,
  editing,
  navOnly,
  showNav = true,
  menuPlacement = "top",
  className,
}: {
  house: PublicHouse;
  liked?: boolean;
  visited?: boolean;
  onToggleLike?: () => void;
  onToggleVisited?: () => void;
  onToggleEdit?: () => void;
  onShowOnMap?: () => void;
  onShowInList?: () => void;
  onSkip?: () => void;
  onRestoreRoute?: () => void;
  skipped?: boolean;
  editing?: boolean;
  navOnly?: boolean;
  showNav?: boolean;
  /** Open menu above the trigger (for bottom sheets). */
  menuPlacement?: "top" | "bottom";
  className?: string;
}) {
  const { trafficFor } = useHouseTraffic();
  const traffic = trafficFor(house.id);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const items: MenuItem[] = [];

  if (showNav) {
    items.push({
      id: "nav",
      label: "ניווט ב-Google Maps",
      icon: <Navigation className="size-5" strokeWidth={2.2} />,
      href: houseMapsUrl(house),
      external: true,
    });
  }
  if (onShowOnMap) {
    items.push({
      id: "map",
      label: "הצגה במפה",
      icon: <MapPinned className="size-5" strokeWidth={2.2} />,
      onClick: onShowOnMap,
    });
  }
  if (onShowInList) {
    items.push({
      id: "list",
      label: "הצגה ברשימה",
      icon: <List className="size-5" strokeWidth={2.2} />,
      onClick: onShowInList,
    });
  }

  if (!navOnly) {
    items.push({
      id: "share",
      label: "שיתוף הבית",
      icon: <Share2 className="size-5" strokeWidth={2.2} />,
      onClick: () => {
        void shareHouse(house).then((result) => {
          if (result === "copied") toast.success("הקישור הועתק");
          if (result === "failed") toast.error("לא הצלחנו לשתף");
        });
      },
    });
    if (onToggleLike) {
      items.push({
        id: "like",
        label: liked ? `הסרה משמורים (${formatActionCount(traffic.saved)})` : `שמירה (${formatActionCount(traffic.saved)})`,
        icon: <Heart className={cn("size-5", liked && "fill-current")} strokeWidth={2.2} />,
        onClick: onToggleLike,
        active: liked,
      });
    }
    if (onToggleVisited) {
      items.push({
        id: "visited",
        label: visited
          ? `ביטול ביקור (${formatActionCount(traffic.visited)})`
          : `סימון ביקור (${formatActionCount(traffic.visited)})`,
        icon: <VisitedCheck visited={visited} inButton />,
        onClick: onToggleVisited,
        active: visited,
      });
    }
    if (onSkip) {
      items.push({
        id: "skip",
        label: "דילוג במסלול",
        icon: <SkipForward className="size-5" strokeWidth={2.2} />,
        onClick: onSkip,
      });
    }
    if (onRestoreRoute) {
      items.push({
        id: "restore",
        label: "החזרה למסלול",
        icon: <Undo2 className="size-5" strokeWidth={2.2} />,
        onClick: onRestoreRoute,
        active: skipped,
      });
    }
    if (onToggleEdit) {
      items.push({
        id: "edit",
        label: editing ? "סגירת עריכה" : "עריכת הבית",
        icon: <Pencil className="size-5" strokeWidth={2.2} />,
        onClick: onToggleEdit,
        active: editing,
      });
    }
  }

  if (items.length === 0) return null;

  function runItem(item: MenuItem) {
    setOpen(false);
    item.onClick?.();
  }

  return (
    <div ref={rootRef} className={cn("house-action-menu", className)} dir="rtl">
      <button
        type="button"
        className="house-action-menu-trigger"
        aria-label="פעולות"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <MoreVertical className="size-5" strokeWidth={2.2} />
      </button>
      {open ? (
        <div
          className={cn(
            "house-action-menu-panel",
            menuPlacement === "top" ? "is-above" : "is-below",
          )}
          role="menu"
        >
          {items.map((item) =>
            item.href ? (
              <a
                key={item.id}
                role="menuitem"
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noreferrer" : undefined}
                className={cn("house-action-menu-item", item.active && "is-active")}
                onClick={(event) => {
                  event.stopPropagation();
                  setOpen(false);
                }}
              >
                <span className="house-action-menu-icon">{item.icon}</span>
                <span className="house-action-menu-label">{item.label}</span>
              </a>
            ) : (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                className={cn("house-action-menu-item", item.active && "is-active")}
                onClick={(event) => {
                  event.stopPropagation();
                  runItem(item);
                }}
              >
                <span className="house-action-menu-icon">{item.icon}</span>
                <span className="house-action-menu-label">{item.label}</span>
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

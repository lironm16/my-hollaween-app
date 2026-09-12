"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Heart,
  List,
  MapPinned,
  MoreVertical,
  Navigation,
  Pencil,
  Share2,
  Undo2,
} from "lucide-react";
import { SavedTrafficIcon, VisitedTrafficIcon } from "@/components/traffic-icons";
import { SkipIcon } from "@/components/skip-icon";
import { VisitedCheck } from "@/components/visited-check";
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

const MENU_ICON_CLASS = "size-7";
const MENU_ACTIVE_ICON_CLASS = "size-8";

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
  /** Preferred menu direction; flips automatically if there is not enough room. */
  menuPlacement?: "top" | "bottom";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({ visibility: "hidden" });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
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
      label: "ניווט",
      icon: <Navigation className={MENU_ICON_CLASS} strokeWidth={2.2} />,
      href: houseMapsUrl(house),
      external: true,
    });
  }
  if (onShowOnMap) {
    items.push({
      id: "map",
      label: "הצג במפה",
      icon: <MapPinned className={MENU_ICON_CLASS} strokeWidth={2.2} />,
      onClick: onShowOnMap,
    });
  }
  if (onShowInList) {
    items.push({
      id: "list",
      label: "הצגה ברשימה",
      icon: <List className={MENU_ICON_CLASS} strokeWidth={2.2} />,
      onClick: onShowInList,
    });
  }

  if (!navOnly) {
    items.push({
      id: "share",
      label: "שתף",
      icon: <Share2 className={MENU_ICON_CLASS} strokeWidth={2.2} />,
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
        label: "אהבתי",
        icon: liked ? (
          <SavedTrafficIcon className={MENU_ACTIVE_ICON_CLASS} markClassName="size-4" />
        ) : (
          <Heart className={MENU_ICON_CLASS} strokeWidth={2.2} />
        ),
        onClick: onToggleLike,
        active: liked,
      });
    }
    if (onToggleVisited) {
      items.push({
        id: "visited",
        label: "ביקרתי",
        icon: visited ? (
          <VisitedTrafficIcon className={MENU_ACTIVE_ICON_CLASS} markClassName="size-4" />
        ) : (
          <VisitedCheck visited={false} size="lg" />
        ),
        onClick: onToggleVisited,
        active: visited,
      });
    }
    if (onSkip) {
      items.push({
        id: "skip",
        label: "דילוג במסלול",
        icon: <SkipIcon className={MENU_ICON_CLASS} />,
        onClick: onSkip,
      });
    }
    if (onRestoreRoute) {
      items.push({
        id: "restore",
        label: "החזרה",
        icon: <Undo2 className={MENU_ICON_CLASS} strokeWidth={2.2} />,
        onClick: onRestoreRoute,
      });
    }
    if (onToggleEdit) {
      items.push({
        id: "edit",
        label: editing ? "סגירת עריכה" : "ערוך בית",
        icon: <Pencil className={MENU_ICON_CLASS} strokeWidth={2.2} />,
        onClick: onToggleEdit,
        active: editing,
      });
    }
  }

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      const panel = panelRef.current;
      if (!trigger || !panel) return;

      const margin = 10;
      const gap = 8;
      const triggerRect = trigger.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const panelWidth = panelRect.width || panel.offsetWidth;
      const panelHeight = panelRect.height || panel.offsetHeight;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let placeAbove = menuPlacement === "top";
      const spaceAbove = triggerRect.top;
      const spaceBelow = viewportHeight - triggerRect.bottom;
      if (placeAbove && spaceAbove < panelHeight + gap + margin && spaceBelow > spaceAbove) {
        placeAbove = false;
      } else if (!placeAbove && spaceBelow < panelHeight + gap + margin && spaceAbove > spaceBelow) {
        placeAbove = true;
      }

      let top = placeAbove ? triggerRect.top - panelHeight - gap : triggerRect.bottom + gap;
      let left = triggerRect.right - panelWidth;
      left = Math.max(margin, Math.min(left, viewportWidth - panelWidth - margin));
      top = Math.max(margin, Math.min(top, viewportHeight - panelHeight - margin));

      setPanelStyle({
        position: "fixed",
        top,
        left,
        zIndex: 120,
        visibility: "visible",
      });
    };

    updatePosition();
    const frame = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, menuPlacement, items.length]);

  if (items.length === 0) return null;

  const KEEP_OPEN_ITEM_IDS = new Set(["like", "visited"]);

  function runItem(item: MenuItem) {
    if (!KEEP_OPEN_ITEM_IDS.has(item.id)) setOpen(false);
    item.onClick?.();
  }

  const panel = open
    ? createPortal(
        <div
          ref={panelRef}
          className="house-action-menu-panel house-action-menu-panel--floating"
          style={panelStyle}
          role="menu"
          dir="rtl"
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
        </div>,
        document.body,
      )
    : null;

  return (
    <div ref={rootRef} className={cn("house-action-menu", className)} dir="rtl">
      <button
        ref={triggerRef}
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
        <MoreVertical className="size-7" strokeWidth={2.2} />
      </button>
      {panel}
    </div>
  );
}

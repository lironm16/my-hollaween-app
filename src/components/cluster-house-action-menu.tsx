"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Heart,
  MoreVertical,
  Navigation,
} from "lucide-react";
import { SavedTrafficIcon, VisitedTrafficIcon } from "@/components/traffic-icons";
import { SkipIcon } from "@/components/skip-icon";
import { VisitedCheck } from "@/components/visited-check";
import { useAddressReveal } from "@/hooks/use-address-reveal";
import { houseServerDetailReady } from "@/lib/device-catalog-cache";
import { houseMapsUrl } from "@/lib/nav-links";
import type { PublicHouse } from "@/lib/types";
import { appHeaderBottom, safeAreaInsetBottom } from "@/lib/viewport";
import { cn } from "@/lib/utils";

type MenuItem = {
  id: string;
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  href?: string;
  external?: boolean;
};

const MENU_ICON_CLASS = "size-7";

/** ⋮ menu on multi-house / school cluster overview — bulk actions + navigate. */
export function ClusterHouseActionMenu({
  houses,
  liked,
  visited,
  skipped,
  onVisitAll,
  onSkipAll,
  onLikeAll,
  menuPlacement = "bottom",
  className,
}: {
  houses: PublicHouse[];
  liked: (id: string) => boolean;
  visited: (id: string) => boolean;
  skipped: (id: string) => boolean;
  onVisitAll?: () => void;
  onSkipAll?: () => void;
  onLikeAll?: () => void;
  menuPlacement?: "top" | "bottom";
  className?: string;
}) {
  const addressReveal = useAddressReveal();
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({ visibility: "hidden" });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const navHouse = houses.find(
    (house) => addressReveal.mapsAllowed(house.id) && houseServerDetailReady(house),
  );

  const allVisited = houses.length > 0 && houses.every((house) => visited(house.id));
  const allSkipped = houses.length > 0 && houses.every((house) => skipped(house.id));
  const allLiked = houses.length > 0 && houses.every((house) => liked(house.id));

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

  if (navHouse) {
    items.push({
      id: "nav",
      label: "ניווט",
      icon: <Navigation className={MENU_ICON_CLASS} strokeWidth={2.2} />,
      href: houseMapsUrl(navHouse),
      external: true,
    });
  }
  if (onSkipAll && !allSkipped) {
    items.push({
      id: "skip-all",
      label: "דילוג על כולם",
      icon: <SkipIcon className={MENU_ICON_CLASS} />,
      onClick: onSkipAll,
    });
  }
  if (onVisitAll && !allVisited) {
    items.push({
      id: "visit-all",
      label: "ביקרתי בכולם",
      icon: allVisited ? (
        <VisitedTrafficIcon className="size-8" markClassName="size-[1.35rem]" markStrokeWidth={4} />
      ) : (
        <VisitedCheck visited={false} size="lg" />
      ),
      onClick: onVisitAll,
    });
  }
  if (onLikeAll && !allLiked) {
    items.push({
      id: "like-all",
      label: "אהבתי הכל",
      icon: allLiked ? (
        <SavedTrafficIcon className="size-8" markClassName="size-[1.35rem]" />
      ) : (
        <Heart className={MENU_ICON_CLASS} strokeWidth={2.2} />
      ),
      onClick: onLikeAll,
    });
  }

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      const panel = panelRef.current;
      if (!trigger || !panel) return;

      const margin = 10;
      const gap = 8;
      const safeBottom = safeAreaInsetBottom();
      const minTop = appHeaderBottom() + margin;
      const maxBottom = window.innerHeight - safeBottom - margin;
      const triggerRect = trigger.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const panelWidth = panelRect.width || panel.offsetWidth;
      const panelHeight = panelRect.height || panel.offsetHeight;
      const viewportWidth = window.innerWidth;

      let placeAbove = menuPlacement === "top";
      const spaceAbove = triggerRect.top - minTop;
      const spaceBelow = maxBottom - triggerRect.bottom;
      if (spaceAbove < panelHeight + gap) placeAbove = false;
      else if (spaceBelow < panelHeight + gap && spaceAbove > spaceBelow) placeAbove = true;
      else if (placeAbove && spaceBelow > spaceAbove) placeAbove = false;

      let top = placeAbove ? triggerRect.top - panelHeight - gap : triggerRect.bottom + gap;
      let left = triggerRect.right - panelWidth;
      left = Math.max(margin, Math.min(left, viewportWidth - panelWidth - margin));
      top = Math.max(minTop, Math.min(top, maxBottom - panelHeight));

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

  if (houses.length <= 1 || items.length === 0) return null;

  function runItem(item: MenuItem) {
    setOpen(false);
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
                className="house-action-menu-item"
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
                className="house-action-menu-item"
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
    <div ref={rootRef} className={cn("house-action-menu shrink-0", className)} dir="rtl">
      <button
        ref={triggerRef}
        type="button"
        className="house-action-menu-trigger"
        aria-label="פעולות על כל הבתים בכתובת"
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

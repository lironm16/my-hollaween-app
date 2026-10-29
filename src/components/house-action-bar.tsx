"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  KeyRound,
  List,
  MapPinned,
  MoreVertical,
  Navigation,
  Pencil,
  QrCode,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { EditCodeDialog } from "@/components/edit-code-dialog";
import { ImpOutlineIcon } from "@/components/imp-outline-icon";
import { useAddressReveal } from "@/hooks/use-address-reveal";
import { useLocale } from "@/hooks/use-locale";
import { houseServerDetailReady } from "@/lib/device-catalog-cache";
import { useHouseMapsUrl } from "@/hooks/use-house-maps-url";
import { shareHouse } from "@/lib/nav-links";
import { VisitPosterDialog } from "@/components/visit-poster-panel";
import type { PublicHouse } from "@/lib/types";
import { appHeaderBottom, safeAreaInsetBottom } from "@/lib/viewport";
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
/** Floating ⋮ menu must sit above `.map-house-sheet` (z-index 700) so items stay clickable. */
const HOUSE_ACTION_MENU_Z_INDEX = 750;

export function HouseActionBar({
  house,
  liked: _liked,
  visited: _visited,
  onToggleLike: _onToggleLike,
  onToggleVisited: _onToggleVisited,
  gemCollected: _gemCollected,
  onToggleGem: _onToggleGem,
  onToggleEdit,
  admin = false,
  nightPassesEnabled = false,
  onPlaceGem,
  onShowOnMap,
  onShowInList,
  onSkip: _onSkip,
  onRestoreRoute: _onRestoreRoute,
  skipped: _skipped,
  editing,
  editCode,
  showVisitPoster = false,
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
  gemCollected?: boolean;
  onToggleGem?: () => void;
  onToggleEdit?: () => void;
  admin?: boolean;
  nightPassesEnabled?: boolean;
  /** Owner/admin — view and move the house gem hiding spot. */
  onPlaceGem?: () => void;
  onShowOnMap?: () => void;
  onShowInList?: () => void;
  onSkip?: () => void;
  onRestoreRoute?: () => void;
  skipped?: boolean;
  editing?: boolean;
  /** Shown to owners/admins in the ⋮ menu — copy or share the 6-digit edit code. */
  editCode?: string;
  /** Owners/admins — printable visit page with the public visit QR (never the edit code). */
  showVisitPoster?: boolean;
  navOnly?: boolean;
  showNav?: boolean;
  /** Preferred menu direction; flips automatically if there is not enough room. */
  menuPlacement?: "top" | "bottom";
  className?: string;
}) {
  const { t, dir } = useLocale();
  const addressReveal = useAddressReveal();
  const mapsUrl = useHouseMapsUrl(house);
  const [open, setOpen] = useState(false);
  const [editCodeOpen, setEditCodeOpen] = useState(false);
  const [visitPosterOpen, setVisitPosterOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({ visibility: "hidden" });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // Use click (not pointerdown): pointerdown ran before the menu item's click and, while the
    // panel was still visibility:hidden for layout, the event hit the map and closed the menu.
    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("click", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("click", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const items: MenuItem[] = [];

  if (showNav && addressReveal.mapsAllowed(house.id) && houseServerDetailReady(house)) {
    items.push({
      id: "nav",
      label: t("houseActions.nav"),
      icon: <Navigation className={MENU_ICON_CLASS} strokeWidth={2.2} />,
      href: mapsUrl,
      external: true,
    });
  }
  if (!navOnly && onShowOnMap) {
    items.push({
      id: "map",
      label: t("houseActions.showOnMap"),
      icon: <MapPinned className={MENU_ICON_CLASS} strokeWidth={2.2} />,
      onClick: onShowOnMap,
    });
  }
  if (!navOnly && onShowInList) {
    items.push({
      id: "list",
      label: t("houseActions.showInList"),
      icon: <List className={MENU_ICON_CLASS} strokeWidth={2.2} />,
      onClick: onShowInList,
    });
  }

  if (!navOnly) {
    items.push({
      id: "share",
      label: t("houseActions.share"),
      icon: <Share2 className={MENU_ICON_CLASS} strokeWidth={2.2} />,
      onClick: () => {
        void shareHouse(house, {
          includeLocationDetails:
            addressReveal.canViewDetails(house.id) && houseServerDetailReady(house),
          displayAddress: addressReveal.formatDisplayAddress(house),
        }).then((result) => {
          if (result === "copied") toast.success(t("houseActions.linkCopied"));
          if (result === "failed") toast.error(t("houseActions.shareFailed"));
        });
      },
    });
    if (onToggleEdit) {
      items.push({
        id: "edit",
        label: editing ? t("houseActions.closeEdit") : t("houseActions.editHouse"),
        icon: <Pencil className={MENU_ICON_CLASS} strokeWidth={2.2} />,
        onClick: onToggleEdit,
        active: editing,
      });
    }
    if (editCode || nightPassesEnabled) {
      items.push({
        id: "edit-code",
        label: t("houseActions.editCodeDevices"),
        icon: <KeyRound className={MENU_ICON_CLASS} strokeWidth={2.2} />,
        onClick: () => setEditCodeOpen(true),
      });
    }
    if (onPlaceGem) {
      items.push({
        id: "gem-place",
        label: t("gem.placeAction"),
        icon: <ImpOutlineIcon className={MENU_ICON_CLASS} />,
        onClick: onPlaceGem,
      });
    }
    if (showVisitPoster) {
      items.push({
        id: "visit-poster",
        label: t("houseActions.visitPoster"),
        icon: <QrCode className={MENU_ICON_CLASS} strokeWidth={2.2} />,
        onClick: () => {
          queueMicrotask(() => setVisitPosterOpen(true));
        },
      });
    }
  }

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      const panel = panelRef.current;
      if (!trigger || !panel) {
        setPanelStyle((prev) => ({
          ...prev,
          position: "fixed",
          zIndex: HOUSE_ACTION_MENU_Z_INDEX,
          visibility: "visible",
        }));
        return;
      }

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
        zIndex: HOUSE_ACTION_MENU_Z_INDEX,
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

  function runItem(item: MenuItem) {
    setOpen(false);
    // Defer map/list jumps so Leaflet map dismiss does not run in the same click turn.
    if (item.id === "map" || item.id === "list") {
      queueMicrotask(() => item.onClick?.());
      return;
    }
    item.onClick?.();
  }

  function menuItemClass(item: MenuItem) {
    return cn(
      "house-action-menu-item",
      item.active && "is-active",
      item.active && item.id === "like" && "is-active-saved",
      item.active && item.id === "visited" && "is-active-visited",
      item.active && item.id === "gem" && "is-active-gem",
      item.active && item.id === "skip" && "is-active-skipped",
    );
  }

  const panel = open
    ? createPortal(
        <div
          ref={panelRef}
          className="house-action-menu-panel house-action-menu-panel--floating"
          style={open ? { ...panelStyle, visibility: "visible", pointerEvents: "auto" } : panelStyle}
          role="menu"
          dir={dir}
        >
          {items.map((item) =>
            item.href ? (
              <a
                key={item.id}
                role="menuitem"
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noreferrer" : undefined}
                className={menuItemClass(item)}
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
                className={menuItemClass(item)}
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
    <div ref={rootRef} className={cn("house-action-menu", className)} dir={dir}>
      {editCode || nightPassesEnabled ? (
        <EditCodeDialog
          open={editCodeOpen}
          house={house}
          editCode={editCode}
          admin={admin}
          nightPassesEnabled={nightPassesEnabled}
          onClose={() => setEditCodeOpen(false)}
        />
      ) : null}
      {showVisitPoster ? (
        <VisitPosterDialog open={visitPosterOpen} house={house} onClose={() => setVisitPosterOpen(false)} />
      ) : null}
      <button
        ref={triggerRef}
        type="button"
        className="house-action-menu-trigger"
        aria-label={t("houseActions.menuAria")}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => {
            const next = !value;
            if (next && triggerRef.current) {
              const triggerRect = triggerRef.current.getBoundingClientRect();
              setPanelStyle({
                position: "fixed",
                top: triggerRect.bottom + 8,
                left: Math.max(10, triggerRect.right - 220),
                zIndex: HOUSE_ACTION_MENU_Z_INDEX,
                visibility: "visible",
              });
            }
            return next;
          });
        }}
      >
        <MoreVertical className="size-7" strokeWidth={2.2} />
      </button>
      {panel}
    </div>
  );
}

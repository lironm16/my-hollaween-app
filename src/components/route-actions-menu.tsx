"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Download, MoreVertical, Share2 } from "lucide-react";
import { toast } from "sonner";
import { HouseExportDialog } from "@/components/csv-export-button";
import { sharePlainTextFile } from "@/lib/house-csv";
import {
  buildRouteShareUrl,
  routeSharePlainText,
  shareRouteUrl,
  sharedRoutePayloadFromRoute,
} from "@/lib/route-share";
import type { WalkingRoute } from "@/lib/route";
import type { PublicHouse } from "@/lib/types";
import { appHeaderBottom, safeAreaInsetBottom } from "@/lib/viewport";
import { cn } from "@/lib/utils";

const MENU_ICON_CLASS = "size-5 shrink-0";

export function RouteActionsMenu({
  routeMode,
  activeRoute,
  houses,
  totalInSet,
  activeFilterCount = 0,
  kind = "list",
}: {
  routeMode: boolean;
  activeRoute: WalkingRoute | null;
  houses: PublicHouse[];
  totalInSet: number;
  activeFilterCount?: number;
  kind?: "liked" | "list" | "all";
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({ visibility: "hidden" });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const activeRouteRef = useRef(activeRoute);
  activeRouteRef.current = activeRoute;

  const routeReady = Boolean(activeRoute && activeRoute.stops.length > 0);
  const listExportReady = houses.length > 0;

  useEffect(() => {
    if (!routeMode) {
      setMenuOpen(false);
      setExportOpen(false);
    }
  }, [routeMode]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  useLayoutEffect(() => {
    if (!menuOpen) return;

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

      const spaceAbove = triggerRect.top - minTop;
      const spaceBelow = maxBottom - triggerRect.bottom;
      const placeAbove = spaceBelow < panelHeight + gap && spaceAbove > spaceBelow;

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
  }, [menuOpen]);

  function openExportDialog() {
    if (!listExportReady) {
      toast.error("אין בתים לשמירה — המפה ריקה");
      return;
    }
    setMenuOpen(false);
    setExportOpen(true);
  }

  function shareRoute() {
    const route = activeRouteRef.current;
    if (!route || route.stops.length === 0) {
      toast.error("אין מסלול לשיתוף — הוסיפו עצירות למסלול");
      return;
    }

    const url = buildRouteShareUrl(
      sharedRoutePayloadFromRoute(route),
      window.location.origin,
    );
    const stopCount = route.stops.length;
    const text = routeSharePlainText(url, stopCount);
    const day = new Date().toISOString().slice(0, 10);
    const title = "מסלול HallowHood";

    setMenuOpen(false);

    const runFallback = () => {
      void (async () => {
        const fileShared = await sharePlainTextFile(
          `hallowhood-route-share-${day}.txt`,
          text,
          title,
        );
        if (fileShared) {
          toast.success("שיתוף המסלול נשלח");
          return;
        }

        const outcome = await shareRouteUrl(url, stopCount);
        if (outcome === "shared" || outcome === "copied") {
          toast.success(
            outcome === "shared"
              ? "שיתוף המסלול נשלח"
              : "הקישור הועתק — הדביקו בוואטסאפ / הודעה",
          );
          return;
        }
        if (outcome === "cancelled") return;

        toast.error("לא הצלחנו לשתף — נסו שוב");
        toast.message(url, { closeButton: true, duration: 20_000 });
      })();
    };

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      navigator
        .share({ title, text: text.slice(0, 8000) })
        .then(() => {
          toast.success("שיתוף המסלול נשלח");
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.name === "AbortError") return;
          runFallback();
        });
      return;
    }

    runFallback();
  }

  if (!routeMode) return null;

  const panel = menuOpen
    ? createPortal(
        <div
          ref={panelRef}
          className="house-action-menu-panel house-action-menu-panel--floating toolbar-route-menu-panel"
          style={panelStyle}
          role="menu"
          dir="rtl"
        >
          <button
            type="button"
            role="menuitem"
            className={cn("house-action-menu-item", !listExportReady && "is-disabled")}
            disabled={!listExportReady}
            onClick={openExportDialog}
          >
            <span className="house-action-menu-icon">
              <Download className={MENU_ICON_CLASS} strokeWidth={2.2} />
            </span>
            <span className="house-action-menu-label">הורד מסלול</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className={cn("house-action-menu-item", !routeReady && "is-disabled")}
            disabled={!routeReady}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              shareRoute();
            }}
          >
            <span className="house-action-menu-icon">
              <Share2 className={MENU_ICON_CLASS} strokeWidth={2.2} />
            </span>
            <span className="house-action-menu-label">שתף מסלול</span>
          </button>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <div ref={rootRef} className="relative shrink-0">
        <button
          ref={triggerRef}
          type="button"
          aria-label="מסלול — הורדה ושיתוף"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={(event) => {
            event.stopPropagation();
            setMenuOpen((value) => !value);
          }}
          className="app-toolbar__btn inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#1d1028] text-orange-100 ring-1 ring-orange-500/25"
        >
          <MoreVertical className="size-5" strokeWidth={2.25} />
        </button>
        {panel}
      </div>
      <HouseExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        houses={houses}
        totalInSet={totalInSet}
        activeFilterCount={activeFilterCount}
        kind={kind}
      />
    </>
  );
}

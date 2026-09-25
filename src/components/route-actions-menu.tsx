"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, Save, Share2 } from "lucide-react";
import { toast } from "sonner";
import { downloadOrShareRouteTxt } from "@/lib/house-csv";
import {
  buildRouteShareUrl,
  shareRouteUrl,
  sharedRoutePayloadFromRoute,
} from "@/lib/route-share";
import type { WalkingRoute } from "@/lib/route";
import { appHeaderBottom, safeAreaInsetBottom } from "@/lib/viewport";
import { cn } from "@/lib/utils";

const MENU_ICON_CLASS = "size-5 shrink-0";

export function RouteActionsMenu({
  routeMode,
  activeRoute,
}: {
  routeMode: boolean;
  activeRoute: WalkingRoute | null;
}) {
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({ visibility: "hidden" });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const routeReady = Boolean(routeMode && activeRoute && activeRoute.stops.length > 0);

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
  }, [open]);

  function shareRoute() {
    if (!routeReady || !activeRoute) return;
    setOpen(false);
    const stopCount = activeRoute.stops.length;
    const url = buildRouteShareUrl(
      sharedRoutePayloadFromRoute(activeRoute),
      window.location.origin,
    );
    void shareRouteUrl(url, stopCount)
      .then((outcome) => {
        if (outcome === "shared") toast.success("שיתוף המסלול נשלח");
        else if (outcome === "copied") toast.success("הקישור הועתק — הדביקו בוואטסאפ / הודעה");
        else if (outcome === "cancelled") return;
        else {
          toast.error("לא הצלחנו לשתף — נסו שוב");
          toast.message(url, { closeButton: true, duration: 20_000 });
        }
      })
      .catch(() => toast.error("לא הצלחנו לשתף — נסו שוב"));
  }

  async function downloadRoute() {
    if (!routeReady || !activeRoute) return;
    setOpen(false);
    await downloadOrShareRouteTxt(activeRoute, false);
    toast.success("המסלול הורד");
  }

  const panel = open
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
            className={cn("house-action-menu-item", !routeReady && "is-disabled")}
            disabled={!routeReady}
            onClick={() => void downloadRoute()}
          >
            <span className="house-action-menu-icon">
              <Save className={MENU_ICON_CLASS} strokeWidth={2.2} />
            </span>
            <span className="house-action-menu-label">הורד מסלול</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className={cn("house-action-menu-item", !routeReady && "is-disabled")}
            disabled={!routeReady}
            onClick={shareRoute}
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
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-label="מסלול — הורדה ושיתוף"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className="app-toolbar__btn inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#1d1028] text-orange-100 ring-1 ring-orange-500/25"
      >
        <MoreVertical className="size-5" strokeWidth={2.25} />
      </button>
      {panel}
    </div>
  );
}

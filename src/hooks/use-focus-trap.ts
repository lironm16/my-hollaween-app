"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Trap Tab within container; optionally mark background inert. */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  options?: { inertRootId?: string; initialFocus?: "first" | "container" },
) {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const inertRoot = options?.inertRootId
      ? document.getElementById(options.inertRootId)
      : null;
    if (inertRoot) inertRoot.inert = true;

    const getFocusables = () =>
      [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );

    const focusInitial = () => {
      const items = getFocusables();
      if (options?.initialFocus === "container") {
        container.focus();
        return;
      }
      (items[0] ?? container).focus();
    };

    const raf = window.requestAnimationFrame(focusInitial);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = getFocusables();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    container.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(raf);
      container.removeEventListener("keydown", onKeyDown);
      if (inertRoot) inertRoot.inert = false;
    };
  }, [active, containerRef, options?.inertRootId, options?.initialFocus]);
}

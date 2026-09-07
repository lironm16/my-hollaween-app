"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const THRESHOLD = 56;
const MAX_PULL = 88;
const MAP_EDGE = 56;

export function PullToRefresh({
  onRefresh,
  children,
  className,
  style,
  disabled = false,
  edgeOnly = false,
  "aria-hidden": ariaHidden,
}: {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
  edgeOnly?: boolean;
  "aria-hidden"?: boolean | "true" | "false";
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const onRefreshRef = useRef(onRefresh);
  const startY = useRef(0);
  const armed = useRef(false);
  const pulling = useRef(false);
  const offsetRef = useRef(0);
  const busy = useRef(false);
  const [offset, setOffset] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const edgeOnlyRef = useRef(edgeOnly);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    edgeOnlyRef.current = edgeOnly;
  }, [edgeOnly]);

  useEffect(() => {
    if (disabled) return;
    const el = rootRef.current;
    if (!el) return;
    const node = el;

    function ignoreTarget(target: EventTarget | null) {
      if (!(target instanceof Element)) return false;
      return Boolean(
        target.closest("button, a, input, textarea, select, .leaflet-control, .map-fab-stack"),
      );
    }

    function onStart(event: TouchEvent) {
      if (busy.current || event.touches.length !== 1) return;
      if (ignoreTarget(event.target)) {
        armed.current = false;
        return;
      }
      const atTop = node.scrollTop <= 0;
      if (!atTop) {
        armed.current = false;
        return;
      }
      const scrollable = node.scrollHeight - node.clientHeight > 4;
      const y = event.touches[0]!.clientY;
      if (!scrollable && edgeOnlyRef.current && y - node.getBoundingClientRect().top > MAP_EDGE) {
        armed.current = false;
        return;
      }
      armed.current = true;
      pulling.current = false;
      startY.current = y;
    }

    function onMove(event: TouchEvent) {
      if (!armed.current || busy.current || event.touches.length !== 1) return;
      const dy = event.touches[0]!.clientY - startY.current;
      if (dy < 10) {
        if (pulling.current) {
          pulling.current = false;
          offsetRef.current = 0;
          setOffset(0);
        }
        return;
      }
      pulling.current = true;
      const next = Math.min(MAX_PULL, dy * 0.42);
      offsetRef.current = next;
      setOffset(next);
      if (event.cancelable) event.preventDefault();
    }

    function onEnd() {
      if (!armed.current) return;
      armed.current = false;
      const shouldRefresh = pulling.current && offsetRef.current >= THRESHOLD;
      pulling.current = false;
      if (!shouldRefresh) {
        offsetRef.current = 0;
        setOffset(0);
        return;
      }
      busy.current = true;
      setRefreshing(true);
      setOffset(40);
      offsetRef.current = 40;
      void Promise.resolve(onRefreshRef.current()).finally(() => {
        busy.current = false;
        setRefreshing(false);
        offsetRef.current = 0;
        setOffset(0);
      });
    }

    node.addEventListener("touchstart", onStart, { passive: true });
    node.addEventListener("touchmove", onMove, { passive: false });
    node.addEventListener("touchend", onEnd);
    node.addEventListener("touchcancel", onEnd);
    return () => {
      node.removeEventListener("touchstart", onStart);
      node.removeEventListener("touchmove", onMove);
      node.removeEventListener("touchend", onEnd);
      node.removeEventListener("touchcancel", onEnd);
    };
  }, [disabled]);

  const show = offset > 4 || refreshing;

  return (
    <div ref={rootRef} className={cn("relative", className)} style={style} aria-hidden={ariaHidden}>
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center pt-1",
          !show && "opacity-0",
        )}
        style={{ transform: `translateY(${Math.max(offset - 8, 0)}px)` }}
        aria-hidden={!show}
      >
        <RefreshCw
          className={cn(
            "size-5 text-orange-300",
            (refreshing || offset >= THRESHOLD) && "animate-spin",
          )}
        />
      </div>
      {children}
    </div>
  );
}

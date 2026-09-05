"use client";

import { useEffect, useRef, useState } from "react";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils";

/** One-line neighborhood names: ping-pong scroll when the row is too narrow. */
export function NeighborhoodMarquee({ className }: { className?: string }) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [shift, setShift] = useState(0);

  useEffect(() => {
    const wrap = wrapRef.current;
    const text = textRef.current;
    if (!wrap || !text) return;

    const measure = () => {
      setShift(Math.max(0, Math.ceil(text.scrollWidth - wrap.clientWidth)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    ro.observe(text);
    return () => ro.disconnect();
  }, []);

  return (
    <span
      ref={wrapRef}
      title={config.neighborhood}
      aria-label={config.neighborhood}
      className={cn("neighborhood-marquee mt-0.5 block text-base text-violet-200/80", className)}
    >
      <span
        ref={textRef}
        className={cn("neighborhood-marquee-text", shift > 0 && "is-scroll")}
        style={shift > 0 ? ({ "--marquee-shift": `${shift}px` } as React.CSSProperties) : undefined}
      >
        {config.neighborhood}
      </span>
    </span>
  );
}

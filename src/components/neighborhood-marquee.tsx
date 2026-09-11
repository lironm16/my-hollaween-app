"use client";

import { useEffect, useRef, useState } from "react";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils";

/** One-line ping-pong scroll when the row is too narrow. */
export function PingPongMarquee({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [shift, setShift] = useState(0);

  useEffect(() => {
    const wrap = wrapRef.current;
    const textEl = textRef.current;
    if (!wrap || !textEl) return;

    const measure = () => {
      setShift(Math.max(0, Math.ceil(textEl.scrollWidth - wrap.clientWidth)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    ro.observe(textEl);
    return () => ro.disconnect();
  }, [text]);

  return (
    <span
      ref={wrapRef}
      title={text}
      aria-label={text}
      className={cn(
        "neighborhood-marquee block w-full min-w-0 text-right",
        shift > 0 && "is-overflow",
        className,
      )}
    >
      <span
        ref={textRef}
        className={cn("neighborhood-marquee-text", shift > 0 && "is-scroll")}
        style={shift > 0 ? ({ "--marquee-shift": `${shift}px` } as React.CSSProperties) : undefined}
      >
        {text}
      </span>
    </span>
  );
}

/** Neighborhood names under the brand: ping-pong scroll when the row is too narrow. */
export function NeighborhoodMarquee({ className }: { className?: string }) {
  return (
    <PingPongMarquee
      text={config.neighborhood}
      className={cn("mt-0.5 text-base text-violet-200/80", className)}
    />
  );
}

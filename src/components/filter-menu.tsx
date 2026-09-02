"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function FilterMenu({
  title,
  activeCount = 0,
  children,
}: {
  title: string;
  activeCount?: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent | TouchEvent) {
      const node = rootRef.current;
      if (!node) return;
      if (event.target instanceof Node && !node.contains(event.target)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm",
          activeCount > 0
            ? "bg-orange-500 font-medium text-black"
            : "bg-[#1d1028] text-orange-100 ring-1 ring-orange-500/25",
        )}
      >
        <span>{title}</span>
        {activeCount > 0 ? (
          <span
            className={cn(
              "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold",
              "bg-black/20 text-black",
            )}
          >
            {activeCount}
          </span>
        ) : null}
        <ChevronDown className={cn("size-3.5 transition", open && "rotate-180")} />
      </button>
      {open ? (
        <div
          id={menuId}
          role="group"
          aria-label={title}
          className="absolute top-[calc(100%+6px)] end-0 z-[60] min-w-[13rem] rounded-xl bg-[#1d1028] p-2 shadow-[0_12px_40px_rgba(0,0,0,0.45)] ring-1 ring-orange-500/30"
        >
          <p className="px-2 pb-1.5 text-[11px] font-medium text-violet-300">{title}</p>
          <div className="flex flex-col gap-0.5">{children}</div>
        </div>
      ) : null}
    </div>
  );
}

export function FilterOption({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-orange-50 hover:bg-orange-500/10">
      <input
        type="checkbox"
        className="size-4 accent-orange-500"
        checked={checked}
        onChange={onChange}
      />
      <span className="min-w-0 flex-1">{children}</span>
    </label>
  );
}

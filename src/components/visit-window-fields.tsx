"use client";

import { useRef } from "react";
import { visitWindowIssue } from "@/lib/hours";
import { cn } from "@/lib/utils";

function ClockInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
      } catch {
        /* Safari may reject showPicker without a user gesture */
      }
    }
  }

  return (
    <label className="block min-w-0 flex-1 space-y-1">
      <span className="text-base text-violet-300">{label}</span>
      <div
        className="house-time-wrap relative w-full"
        onClick={openPicker}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") openPicker();
        }}
      >
        <input
          ref={inputRef}
          type="time"
          dir="ltr"
          lang="he-IL"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="house-time-input h-11 w-full min-w-0 rounded-lg border border-input bg-[#1d1028] px-2.5 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <span className="house-time-value" aria-hidden="true">
          {value || "--:--"}
        </span>
      </div>
    </label>
  );
}

export function VisitWindowFields({
  from,
  to,
  onChangeFrom,
  onChangeTo,
  className,
}: {
  from: string;
  to: string;
  onChangeFrom: (value: string) => void;
  onChangeTo: (value: string) => void;
  className?: string;
}) {
  const issue = visitWindowIssue(from, to);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex gap-3">
        <ClockInput label="מ־" value={from} onChange={onChangeFrom} />
        <ClockInput label="עד" value={to} onChange={onChangeTo} />
      </div>
      {issue ? (
        <p className="text-base leading-snug text-red-300" role="alert">{issue}</p>
      ) : null}
    </div>
  );
}

"use client";

import { visitWindowIssue } from "@/lib/hours";
import { cn } from "@/lib/utils";

function ClockInput({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <input
      type="time"
      dir="ltr"
      lang="he-IL"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "filter-time-input h-11 min-w-0 flex-1 rounded-lg border border-input bg-[#1d1028] px-2.5 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        disabled && "opacity-50",
      )}
    />
  );
}

export function CustomVisitWindowFields({
  useFrom,
  useTo,
  from,
  to,
  onToggleFrom,
  onToggleTo,
  onChangeFrom,
  onChangeTo,
  className,
}: {
  useFrom: boolean;
  useTo: boolean;
  from: string;
  to: string;
  onToggleFrom: (next: boolean) => void;
  onToggleTo: (next: boolean) => void;
  onChangeFrom: (value: string) => void;
  onChangeTo: (value: string) => void;
  className?: string;
}) {
  const issue = visitWindowIssue(useFrom ? from : "", useTo ? to : "");

  return (
    <div className={cn("space-y-2", className)}>
      <label
        className={cn(
          "flex items-center gap-3 rounded-lg px-1 py-1",
          useFrom ? "text-orange-50" : "text-violet-300",
        )}
      >
        <input
          type="checkbox"
          className="size-4 shrink-0 accent-orange-500"
          checked={useFrom}
          onChange={() => onToggleFrom(!useFrom)}
        />
        <span className="w-14 shrink-0 text-base">התחלה</span>
        <ClockInput value={from} disabled={!useFrom} onChange={onChangeFrom} />
      </label>
      <label
        className={cn(
          "flex items-center gap-3 rounded-lg px-1 py-1",
          useTo ? "text-orange-50" : "text-violet-300",
        )}
      >
        <input
          type="checkbox"
          className="size-4 shrink-0 accent-orange-500"
          checked={useTo}
          onChange={() => onToggleTo(!useTo)}
        />
        <span className="w-14 shrink-0 text-base">סיום</span>
        <ClockInput value={to} disabled={!useTo} onChange={onChangeTo} />
      </label>
      {issue ? (
        <p className="text-base leading-snug text-red-300" role="alert">{issue}</p>
      ) : null}
    </div>
  );
}

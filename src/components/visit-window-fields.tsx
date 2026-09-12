"use client";

import { visitWindowIssue } from "@/lib/hours";
import { cn } from "@/lib/utils";

function ClockInput({
  id,
  value,
  onChange,
  disabled = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <input
      id={id}
      type="time"
      dir="ltr"
      lang="he-IL"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "filter-time-input h-11 min-w-0 min-h-11 flex-1 rounded-lg border border-input bg-[#1d1028] px-2.5 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        disabled && "pointer-events-none opacity-50",
      )}
    />
  );
}

function VisitWindowRow({
  checked,
  onToggle,
  label,
  timeId,
  timeValue,
  onTimeChange,
}: {
  checked: boolean;
  onToggle: (next: boolean) => void;
  label: string;
  timeId: string;
  timeValue: string;
  onTimeChange: (value: string) => void;
}) {
  const checkboxId = `${timeId}-enabled`;

  return (
    <div
      className={cn(
        "grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-3 rounded-lg px-1 py-1",
        checked ? "text-orange-50" : "text-violet-300",
      )}
    >
      <input
        id={checkboxId}
        type="checkbox"
        className="size-4 shrink-0 accent-orange-500"
        checked={checked}
        onChange={() => onToggle(!checked)}
      />
      <label htmlFor={checkboxId} className="w-14 shrink-0 cursor-pointer self-center text-base leading-none">
        {label}
      </label>
      <ClockInput
        id={timeId}
        value={timeValue}
        disabled={!checked}
        onChange={onTimeChange}
      />
    </div>
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
      <VisitWindowRow
        checked={useFrom}
        onToggle={onToggleFrom}
        label="התחלה"
        timeId="visit-window-from"
        timeValue={from}
        onTimeChange={onChangeFrom}
      />
      <VisitWindowRow
        checked={useTo}
        onToggle={onToggleTo}
        label="סיום"
        timeId="visit-window-to"
        timeValue={to}
        onTimeChange={onChangeTo}
      />
      {issue ? (
        <p className="text-base leading-snug text-red-300" role="alert">{issue}</p>
      ) : null}
    </div>
  );
}

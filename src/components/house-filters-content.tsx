"use client";

import type { ReactNode } from "react";
import { AccessibleMark } from "@/components/symbols";
import { SensitivityMark } from "@/components/sensitivity-glyphs";
import { FilterOption, FilterSection } from "@/components/filter-menu";
import { VisitWindowFields } from "@/components/visit-window-fields";
import { NEIGHBORHOODS } from "@/lib/config";
import {
  isKidsFriendlyFilter,
  isWithCandyFilter,
  kidsFriendlyPatch,
  withCandyPatch,
} from "@/lib/filter-presets";
import { visitWindowIssue } from "@/lib/hours";
import type { HouseFiltersState } from "@/lib/offline-db";
import {
  defaultVisitWindowEnd,
  effectiveVisitWindowMode,
  formatClockFromDate,
  type VisitWindowMode,
} from "@/lib/visit-window";
import { SENSITIVITY_OPTIONS } from "@/lib/types";
import { cn } from "@/lib/utils";

function FilterToggle({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-base transition",
        checked ? "bg-orange-500/15 text-orange-50" : "text-orange-50 hover:bg-orange-500/10",
      )}
    >
      <input
        type="checkbox"
        className="size-4 accent-orange-500"
        checked={checked}
        onChange={onChange}
      />
      <span className="min-w-0 flex-1 text-start">{children}</span>
    </label>
  );
}

function VisitWindowRadio({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-base transition",
        checked ? "bg-orange-500/15 text-orange-50" : "text-orange-50 hover:bg-orange-500/10",
      )}
    >
      <input
        type="radio"
        name="visit-window-mode"
        className="size-4 accent-orange-500"
        checked={checked}
        onChange={onChange}
      />
      <span>{label}</span>
    </label>
  );
}

export function HouseFiltersContent({
  filters,
  now,
  onPatch,
}: {
  filters: HouseFiltersState;
  now: Date;
  onPatch: (
    patch: Partial<HouseFiltersState> | ((current: HouseFiltersState) => HouseFiltersState),
  ) => void;
}) {
  const visitMode = effectiveVisitWindowMode(filters);
  const withCandy = isWithCandyFilter(filters);
  const kidsFriendly = isKidsFriendlyFilter(filters);
  const customFrom =
    filters.visitWindowFrom || formatClockFromDate(now);
  const customTo = filters.visitWindowTo || defaultVisitWindowEnd(now);
  const customInvalid =
    visitMode === "custom" ? visitWindowIssue(customFrom, customTo) : null;

  function setVisitMode(mode: VisitWindowMode) {
    if (mode === "now") {
      onPatch({
        visitWindowMode: "now",
        visitWindowFrom: "",
        visitWindowTo: "",
      });
      return;
    }
    onPatch({
      visitWindowMode: "custom",
      visitWindowFrom: customFrom,
      visitWindowTo: customTo,
    });
  }

  function setWithCandy(on: boolean) {
    onPatch((current) => ({
      ...current,
      ...withCandyPatch(on),
    }));
  }

  return (
    <>
      <FilterSection title="שעת התחלה">
        <VisitWindowRadio
          checked={visitMode === "now"}
          onChange={() => setVisitMode("now")}
          label="עכשיו"
        />
        <VisitWindowRadio
          checked={visitMode === "custom"}
          onChange={() => setVisitMode("custom")}
          label="מותאם אישית"
        />
        {visitMode === "custom" ? (
          <div className="px-3 py-2">
            <VisitWindowFields
              from={customFrom}
              to={customTo}
              onChangeFrom={(value) => onPatch({ visitWindowFrom: value })}
              onChangeTo={(value) => onPatch({ visitWindowTo: value })}
            />
            {customInvalid ? (
              <p className="mt-2 text-base text-red-300" role="alert">{customInvalid}</p>
            ) : null}
          </div>
        ) : null}
      </FilterSection>

      <FilterSection title="מה חשוב">
        <FilterToggle checked={withCandy} onChange={() => setWithCandy(!withCandy)}>
          <span className="inline-flex items-center gap-2">עם ממתקים</span>
        </FilterToggle>
        <FilterToggle
          checked={kidsFriendly}
          onChange={() => onPatch((current) => ({ ...current, ...kidsFriendlyPatch(!kidsFriendly) }))}
        >
          מתאים לילדים
        </FilterToggle>
        <FilterToggle
          checked={filters.accessibleOnly}
          onChange={() => onPatch({ accessibleOnly: !filters.accessibleOnly })}
        >
          <AccessibleMark labeled />
        </FilterToggle>
      </FilterSection>

      <FilterSection title="רגישויות">
        <p className="px-3 pb-1 text-sm text-violet-400">
          {withCandy ? "בתים עם ממתקים שמתאימים לרגישות שבחרתם" : "סמנו «עם ממתקים» כדי לסנן רגישויות"}
        </p>
        {SENSITIVITY_OPTIONS.map((id) => (
          <FilterOption
            key={id}
            checked={filters.sensitivityFilters.includes(id)}
            disabled={!withCandy}
            onChange={() =>
              onPatch((current) => ({
                ...current,
                sensitivityFilters: current.sensitivityFilters.includes(id)
                  ? current.sensitivityFilters.filter((item) => item !== id)
                  : [...current.sensitivityFilters, id],
              }))
            }
          >
            <SensitivityMark labeled kind={id} />
          </FilterOption>
        ))}
      </FilterSection>

      <FilterSection title="שכונה">
        {NEIGHBORHOODS.map((area) => (
          <FilterOption
            key={area}
            checked={filters.neighborhoodFilters.includes(area)}
            onChange={() =>
              onPatch((current) => ({
                ...current,
                neighborhoodFilters: current.neighborhoodFilters.includes(area)
                  ? current.neighborhoodFilters.filter((item) => item !== area)
                  : [...current.neighborhoodFilters, area],
              }))
            }
          >
            {area}
          </FilterOption>
        ))}
      </FilterSection>
    </>
  );
}

export function houseFiltersDraftInvalid(filters: HouseFiltersState, now: Date) {
  if (effectiveVisitWindowMode(filters) !== "custom") return false;
  const from = filters.visitWindowFrom || formatClockFromDate(now);
  const to = filters.visitWindowTo || defaultVisitWindowEnd(now);
  return Boolean(visitWindowIssue(from, to));
}

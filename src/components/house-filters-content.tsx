"use client";

import type { ReactNode } from "react";
import { Home, SlidersHorizontal } from "lucide-react";
import { AccessibleMark } from "@/components/symbols";
import { CandySign } from "@/components/candy-glyphs";
import { SensitivityMark } from "@/components/sensitivity-glyphs";
import { FilterOption, FilterSection } from "@/components/filter-menu";
import { CustomVisitWindowFields } from "@/components/visit-window-fields";
import { OpenNowSign } from "@/components/open-now-mark";
import { NEIGHBORHOODS } from "@/lib/config";
import {
  hasStockCandySelection,
  isKidsFriendlyFilter,
  kidsFriendlyPatch,
} from "@/lib/filter-presets";
import { visitWindowIssue } from "@/lib/hours";
import type { HouseFiltersState } from "@/lib/offline-db";
import {
  defaultVisitWindowEndFromStart,
  effectiveVisitWindowMode,
  formatClockFromDate,
  type VisitWindowMode,
} from "@/lib/visit-window";
import { SENSITIVITY_OPTIONS, type CandyTone } from "@/lib/types";
import { cn } from "@/lib/utils";

const STOCK_CANDY_TONES: CandyTone[] = ["plenty", "low"];

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
        type="radio"
        name="visit-window-mode"
        className="size-4 accent-orange-500"
        checked={checked}
        onChange={onChange}
      />
      <span className="inline-flex min-w-0 flex-1 items-center gap-2">{children}</span>
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
  const kidsFriendly = isKidsFriendlyFilter(filters);
  const stockCandy = hasStockCandySelection(filters);
  const useFrom = filters.visitWindowUseFrom ?? true;
  const useTo = filters.visitWindowUseTo ?? false;
  const customFrom = filters.visitWindowFrom || formatClockFromDate(now);
  const customTo =
    filters.visitWindowTo || defaultVisitWindowEndFromStart(customFrom);
  function setVisitMode(mode: VisitWindowMode) {
    if (mode === "now") {
      onPatch({
        visitWindowMode: "now",
        visitWindowFrom: "",
        visitWindowTo: "",
        visitWindowUseFrom: true,
        visitWindowUseTo: false,
      });
      return;
    }
    if (mode === "all") {
      onPatch({
        visitWindowMode: "all",
        visitWindowFrom: "",
        visitWindowTo: "",
        visitWindowUseFrom: false,
        visitWindowUseTo: false,
      });
      return;
    }
    const from = filters.visitWindowFrom || formatClockFromDate(now);
    onPatch({
      visitWindowMode: "custom",
      visitWindowUseFrom: true,
      visitWindowUseTo: filters.visitWindowUseTo ?? false,
      visitWindowFrom: from,
      visitWindowTo: filters.visitWindowTo || defaultVisitWindowEndFromStart(from),
    });
  }

  function toggleCandyTone(tone: CandyTone) {
    onPatch((current) => {
      const nextTones = current.candyFilters.includes(tone)
        ? current.candyFilters.filter((item) => item !== tone)
        : [...current.candyFilters, tone];
      const stillStock = STOCK_CANDY_TONES.some((item) => nextTones.includes(item));
      return {
        ...current,
        candyFilters: nextTones,
        sensitivityFilters: stillStock ? current.sensitivityFilters : [],
      };
    });
  }

  return (
    <>
      <FilterSection title="שעת התחלה">
        <VisitWindowRadio checked={visitMode === "now"} onChange={() => setVisitMode("now")}>
          <OpenNowSign className="size-7" />
          <span>עכשיו</span>
        </VisitWindowRadio>
        <VisitWindowRadio checked={visitMode === "all"} onChange={() => setVisitMode("all")}>
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-violet-500/25 text-violet-100 ring-1 ring-violet-400/30">
            <Home className="size-4" aria-hidden="true" />
          </span>
          <span>כל הבתים</span>
        </VisitWindowRadio>
        <VisitWindowRadio checked={visitMode === "custom"} onChange={() => setVisitMode("custom")}>
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-orange-100 ring-1 ring-orange-400/30">
            <SlidersHorizontal className="size-4" aria-hidden="true" />
          </span>
          <span>מותאם אישית</span>
        </VisitWindowRadio>
        {visitMode === "custom" ? (
          <div className="px-3 py-2">
            <CustomVisitWindowFields
              useFrom={useFrom}
              useTo={useTo}
              from={customFrom}
              to={customTo}
              onToggleFrom={(next) =>
                onPatch({
                  visitWindowUseFrom: next,
                  visitWindowFrom: next ? customFrom : "",
                })
              }
              onToggleTo={(next) =>
                onPatch({
                  visitWindowUseTo: next,
                  visitWindowTo: next
                    ? filters.visitWindowTo || defaultVisitWindowEndFromStart(customFrom)
                    : "",
                })
              }
              onChangeFrom={(value) => onPatch({ visitWindowFrom: value, visitWindowUseFrom: true })}
              onChangeTo={(value) => onPatch({ visitWindowTo: value, visitWindowUseTo: true })}
            />
          </div>
        ) : null}
      </FilterSection>

      <FilterSection title="מה חשוב">
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

      <FilterSection title="ממתקים">
        {STOCK_CANDY_TONES.map((tone) => (
          <FilterOption
            key={tone}
            checked={filters.candyFilters.includes(tone)}
            onChange={() => toggleCandyTone(tone)}
          >
            <span className="inline-flex items-center gap-2">
              <CandySign tone={tone} className="size-7" />
              <span>{tone === "plenty" ? "יש ממתקים" : "מעט ממתקים"}</span>
            </span>
          </FilterOption>
        ))}
      </FilterSection>

      <FilterSection title="רגישויות">
        <p className="px-3 pb-1 text-sm text-violet-400">
          {stockCandy
            ? "בתים עם ממתקים שמתאימים לרגישות שבחרתם"
            : "סמנו ירוק או צהוב בממתקים כדי לסנן רגישויות"}
        </p>
        {SENSITIVITY_OPTIONS.map((id) => (
          <FilterOption
            key={id}
            checked={filters.sensitivityFilters.includes(id)}
            disabled={!stockCandy}
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
  const useFrom = filters.visitWindowUseFrom ?? true;
  const useTo = filters.visitWindowUseTo ?? false;
  if (!useFrom && !useTo) return false;
  const from = useFrom ? filters.visitWindowFrom || formatClockFromDate(now) : "";
  const to = useTo
    ? filters.visitWindowTo || defaultVisitWindowEndFromStart(from || formatClockFromDate(now))
    : "";
  return Boolean(visitWindowIssue(from, to));
}

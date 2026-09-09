"use client";

import type { ReactNode } from "react";
import { CANDY_TONES, CandySign } from "@/components/candy-glyphs";
import { AccessibleMark } from "@/components/symbols";
import { SensitivityMark } from "@/components/sensitivity-glyphs";
import { ScareSign } from "@/components/scare-glyphs";
import { FilterOption, FilterSection } from "@/components/filter-menu";
import { VisitWindowFields } from "@/components/visit-window-fields";
import { NEIGHBORHOODS } from "@/lib/config";
import { visitWindowIssue } from "@/lib/hours";
import { decorShort, scareShort } from "@/lib/labels";
import type { HouseFiltersState } from "@/lib/offline-db";
import {
  defaultVisitWindowEnd,
  effectiveVisitWindowMode,
  type VisitWindowMode,
} from "@/lib/visit-window";
import { LikedMark, UnvisitedMark } from "@/components/visit-marks";
import { SCARE_LEVELS, SENSITIVITY_OPTIONS, type ScareLevel } from "@/lib/types";
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
  const candySensitivityEnabled = filters.candyFilters.some((tone) => tone !== "none");
  const customFrom = filters.visitWindowFrom;
  const customTo = filters.visitWindowTo;

  function toggleCandyTone(tone: (typeof CANDY_TONES)[number]["id"]) {
    onPatch((current) => {
      const nextCandy = current.candyFilters.includes(tone)
        ? current.candyFilters.filter((item) => item !== tone)
        : [...current.candyFilters, tone];
      const hasCandyStock = nextCandy.some((item) => item !== "none");
      return {
        ...current,
        candyFilters: nextCandy,
        sensitivityFilters: hasCandyStock ? current.sensitivityFilters : [],
      };
    });
  }

  function toggleScareLevel(level: ScareLevel) {
    onPatch((current) => ({
      ...current,
      scareFilters: current.scareFilters.includes(level)
        ? current.scareFilters.filter((item) => item !== level)
        : [...current.scareFilters, level],
    }));
  }

  function setVisitMode(mode: VisitWindowMode) {
    if (mode === "all") {
      onPatch({
        visitWindowMode: "all",
        visitWindowFrom: "",
        visitWindowTo: "",
      });
      return;
    }
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
      visitWindowFrom: filters.visitWindowFrom,
      visitWindowTo: filters.visitWindowTo,
    });
  }

  return (
    <>
      <FilterSection title="בתים">
        <VisitWindowRadio
          checked={visitMode === "all"}
          onChange={() => setVisitMode("all")}
          label="הכל"
        />
        <VisitWindowRadio
          checked={visitMode === "now"}
          onChange={() => setVisitMode("now")}
          label="פתוחים עכשיו"
        />
        <VisitWindowRadio
          checked={visitMode === "custom"}
          onChange={() => setVisitMode("custom")}
          label="מותאם אישית"
        />
        {visitMode === "now" ? (
          <p className="px-3 pb-2 text-sm text-violet-400">
            מציגים בתים שפתוחים בין עכשיו ל־{defaultVisitWindowEnd(now)}.
          </p>
        ) : null}
        {visitMode === "custom" ? (
          <div className="px-3 py-2">
            <VisitWindowFields
              from={customFrom}
              to={customTo}
              onChangeFrom={(value) => onPatch({ visitWindowFrom: value })}
              onChangeTo={(value) => onPatch({ visitWindowTo: value })}
            />
          </div>
        ) : null}
        <FilterToggle
          checked={filters.likedOnly}
          onChange={() => onPatch({ likedOnly: !filters.likedOnly })}
        >
          <LikedMark labeled />
        </FilterToggle>
        <FilterToggle
          checked={filters.unvisitedOnly}
          onChange={() => onPatch({ unvisitedOnly: !filters.unvisitedOnly })}
        >
          <UnvisitedMark labeled />
        </FilterToggle>
      </FilterSection>

      <FilterSection title="ממתקים">
        {CANDY_TONES.map(({ id, label }) => (
          <FilterOption
            key={id}
            checked={filters.candyFilters.includes(id)}
            onChange={() => toggleCandyTone(id)}
          >
            <span className="inline-flex items-center gap-2">
              <CandySign tone={id} />
              <span>{label}</span>
            </span>
          </FilterOption>
        ))}
      </FilterSection>

      <FilterSection title="רמת פחד">
        <FilterOption
          checked={filters.includeUndecorated}
          onChange={() => onPatch({ includeUndecorated: !filters.includeUndecorated })}
        >
          <span className="inline-flex items-center gap-2">
            <ScareSign level="none" />
            <span>{decorShort.none}</span>
          </span>
        </FilterOption>
        {SCARE_LEVELS.map((level) => (
          <FilterOption
            key={level}
            checked={filters.scareFilters.includes(level)}
            onChange={() => toggleScareLevel(level)}
          >
            <span className="inline-flex items-center gap-2">
              <ScareSign level={level} />
              <span>{scareShort[level]}</span>
            </span>
          </FilterOption>
        ))}
      </FilterSection>

      <FilterSection title="מה חשוב">
        <FilterToggle
          checked={filters.accessibleOnly}
          onChange={() => onPatch({ accessibleOnly: !filters.accessibleOnly })}
        >
          <AccessibleMark labeled />
        </FilterToggle>
      </FilterSection>

      <FilterSection title="רגישויות">
        <p className="px-3 pb-1 text-sm text-violet-400">
          {candySensitivityEnabled
            ? "בתים עם ממתקים שמתאימים לרגישות שבחרתם"
            : "סמנו לפחות אחת מקטגוריות הממתקים (לא «בלי ממתקים») כדי לסנן רגישויות"}
        </p>
        {SENSITIVITY_OPTIONS.map((id) => (
          <FilterOption
            key={id}
            checked={filters.sensitivityFilters.includes(id)}
            disabled={!candySensitivityEnabled}
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

export function houseFiltersDraftInvalid(filters: HouseFiltersState) {
  if (effectiveVisitWindowMode(filters) !== "custom") return false;
  return Boolean(visitWindowIssue(filters.visitWindowFrom, filters.visitWindowTo));
}

"use client";

import { useMemo, useState } from "react";
import { useShallow } from "zustand/shallow";
import { FilterToolbar } from "@/components/filter-toolbar";
import { HouseCard } from "@/components/house-card";
import { HouseMap } from "@/components/house-map";
import { MapFallback } from "@/components/map-fallback";
import type { House } from "@/lib/types";
import { useMapUIStore } from "@/stores/map-ui-store";
import { filterHouses } from "@/lib/filtering";
import { cn } from "@/lib/utils";
import { BellRing, Download, Navigation, Route as RouteIcon } from "lucide-react";
import { useMapAvailability } from "@/hooks/use-map-availability";

type HomeExperienceProps = {
  initialHouses: House[];
};

export function HomeExperience({ initialHouses }: HomeExperienceProps) {
  const { filters, viewMode } = useMapUIStore(
    useShallow((state) => ({
      filters: state.filters,
      viewMode: state.viewMode,
    })),
  );

  const [selectedHouseId, setSelectedHouseId] = useState<string>();
  const [routeHouseIds, setRouteHouseIds] = useState<string[]>([]);

  const houses = useMemo(
    () => filterHouses(initialHouses, filters),
    [initialHouses, filters],
  );

  const selectedHouse = houses.find((house) => house.id === selectedHouseId);
  const {
    data: availability,
    isLoading: isCheckingAvailability,
    refetch: retryAvailability,
    isFetching: isRefetchingAvailability,
  } = useMapAvailability(viewMode === "map");

  function handleAddToRoute(house: House) {
    setRouteHouseIds((prev) =>
      prev.includes(house.id) ? prev : [...prev, house.id],
    );
  }

  function handleRemoveFromRoute(id: string) {
    setRouteHouseIds((prev) => prev.filter((houseId) => houseId !== id));
  }

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 py-6 md:px-8">
      <FilterToolbar />

      <section className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
        <div
          className={cn(
            "flex h-[70vh] min-h-[480px] flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl",
          )}
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-white/10 bg-black/30 px-4 py-1 text-sm text-white/80">
              נמצאו {houses.length} בתים תואמי סינון
            </div>
            {routeHouseIds.length > 0 && (
              <div className="rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent-muted)] px-4 py-1 text-sm text-white">
                במסלול: {routeHouseIds.length}
              </div>
            )}
          </div>

          <div className="relative flex-1 overflow-hidden">
            {viewMode === "map" ? (
              isCheckingAvailability ? (
                <div className="flex h-full items-center justify-center rounded-3xl border border-white/10 bg-white/5">
                  <div className="flex flex-col items-center gap-3 text-sm text-slate-200/80">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-transparent" />
                    בודקים זמינות מפה בזמן אמת...
                  </div>
                </div>
              ) : availability?.allowed ? (
                <HouseMap
                  houses={houses}
                  selectedId={selectedHouseId}
                  onSelect={(house) => {
                    setSelectedHouseId(house.id);
                  }}
                />
              ) : (
                <MapFallback
                  fallbackUrl={availability?.fallbackUrl ?? "/cached-map-fallback.svg"}
                  onRetry={() => retryAvailability()}
                  isRetrying={isRefetchingAvailability}
                  usageInfo={
                    availability
                      ? {
                          usage: availability.usage,
                          limit: availability.limit,
                          remaining: availability.remaining,
                        }
                      : undefined
                  }
                />
              )
            ) : (
              <div className="grid h-full grid-cols-1 gap-4 overflow-y-auto pr-2 md:grid-cols-2 xl:grid-cols-3">
                {houses.map((house) => (
                  <HouseCard
                    key={house.id}
                    house={house}
                    onAddToRoute={handleAddToRoute}
                    onNavigate={() =>
                      window.open(
                        `https://www.waze.com/ul?ll=${house.latitude}%2C${house.longitude}&navigate=yes`,
                        "_blank",
                      )
                    }
                    onCheckIn={() => {
                      window.alert(
                        "הסימון נשמר! בגירסה מלאה הפעולה תסתנכרן מול השרת.",
                      );
                    }}
                  />
                ))}
              </div>
            )}
            {viewMode === "map" && selectedHouse && (
              <div className="pointer-events-none absolute bottom-4 left-4 w-full max-w-md bg-transparent">
                <div className="pointer-events-auto">
                  <HouseCard
                    house={selectedHouse}
                    onAddToRoute={handleAddToRoute}
                    onNavigate={() =>
                      window.open(
                        `https://maps.google.com/?q=${selectedHouse.latitude},${selectedHouse.longitude}`,
                        "_blank",
                      )
                    }
                    onCheckIn={() =>
                      window.alert("סימון ביקור נשמר (הדמיה בסביבת פיתוח).")
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <RoutePlannerPanel
          houses={initialHouses}
          selectedHouse={selectedHouse}
          routeHouseIds={routeHouseIds}
          onRemove={handleRemoveFromRoute}
        />
      </section>
    </div>
  );
}

type RoutePlannerPanelProps = {
  houses: House[];
  selectedHouse?: House;
  routeHouseIds: string[];
  onRemove: (id: string) => void;
};

function RoutePlannerPanel({
  houses,
  selectedHouse,
  routeHouseIds,
  onRemove,
}: RoutePlannerPanelProps) {
  const routeHouses = routeHouseIds
    .map((id) => houses.find((house) => house.id === id))
    .filter(Boolean) as House[];

  return (
    <aside className="flex h-[70vh] min-h-[480px] flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <RouteIcon className="h-5 w-5 text-[var(--color-accent)]" />
            המסלול שלי
          </h2>
          <p className="text-xs text-slate-200/80">
            שמרו את המסלול להמשך, הורידו למצב לא מקוון וקבלו התראות.
          </p>
        </div>
        <button
          type="button"
          className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/80 transition-all hover:bg-white/20"
        >
          התחברות מהירה
        </button>
      </header>

      <div className="space-y-4 rounded-2xl border border-[var(--color-card-border)] bg-black/20 p-4 text-sm text-slate-200/80">
        <div className="flex items-center gap-2">
          <BellRing className="h-4 w-4 text-pink-200" />
          <div>
            <p className="font-semibold text-white">פעיל מצב התראות</p>
            <p className="text-xs text-slate-300">
              קבלו פוש על סוכריות, עומסים ודיווחי חירום.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs">
          <span>מצב חיבור איטי</span>
          <span className="text-emerald-200">זמין</span>
        </div>
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-l from-[var(--color-accent)] to-[var(--color-accent-strong)] px-4 py-2 text-sm font-medium text-black shadow-lg"
        >
          <Download className="h-4 w-4" />
          הורידו למצב לא מקוון
        </button>
      </div>

      <section className="flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-3">
        {routeHouses.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-slate-200/70">
            <Navigation className="h-8 w-8 text-[var(--color-accent)]" />
            <p>בחרו בתים מהמפה או מהרשימה כדי לבנות מסלול מותאם.</p>
            {selectedHouse && (
              <p className="text-xs text-slate-300">
                {selectedHouse.title} מוכן להוספה — לחצו &quot;הוספה למסלול&quot;.
              </p>
            )}
          </div>
        ) : (
          <ol className="space-y-3 text-sm">
            {routeHouses.map((house, index) => (
              <li
                key={house.id}
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{house.title}</p>
                  <p className="text-xs text-slate-300">{house.address}</p>
                  <div className="mt-2 flex flex-wrap gap-1 text-[11px] text-slate-200/80">
                    <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-emerald-200">
                      {house.candyLevel === "green"
                        ? "הרבה סוכריות"
                        : house.candyLevel === "yellow"
                        ? "סוכריות בדרך להיגמר"
                        : "חסר סוכריות"}
                    </span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5">
                      צ&apos;ק-אין {house.checkIns}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(house.id)}
                  className="text-xs text-slate-200/70 transition-colors hover:text-rose-200"
                >
                  הסרה
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>
    </aside>
  );
}

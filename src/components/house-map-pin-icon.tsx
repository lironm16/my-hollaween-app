"use client";

import { useCatalog } from "@/hooks/use-catalog";
import { clusterPinStatus } from "@/lib/cluster-pin-status";
import { pinHoursRingKind } from "@/lib/map-gem-pin-ring";
import { pinScareSrc } from "@/lib/pin-faces";
import { pinBackgroundFill } from "@/lib/pin-colors";
import { isDecorated } from "@/lib/house-state";
import type { PublicHouse } from "@/lib/types";
import { isPoiHouse } from "@/lib/house-kind";
import { PinHoursStatusBadge } from "@/components/pin-hours-status-badge";
import { SkipIcon } from "@/components/skip-icon";
import { useLocale } from "@/hooks/use-locale";
import { cn } from "@/lib/utils";

export function HouseMapPinIcon({
  house,
  now,
  skipped = false,
  filteredOut = false,
  visited = false,
  className,
}: {
  house: PublicHouse;
  now: Date;
  skipped?: boolean;
  filteredOut?: boolean;
  visited?: boolean;
  className?: string;
}) {
  const { catalog } = useCatalog();
  const { t } = useLocale();
  const addressReveal = catalog?.eventSettings?.addressReveal;
  const decorated = isDecorated(house);
  const status = clusterPinStatus(house, now, { skipped, addressReveal });
  const hoursKind = pinHoursRingKind(house, now, addressReveal);
  const scare = house.scareLevel ?? "mild";

  const hoursLabel =
    hoursKind === "closing"
      ? t("mapPin.closingSoon")
      : hoursKind === "opening"
        ? t("mapPin.openingSoon")
        : "";

  return (
    <div
      className={cn(
        "house-pin cluster-list-pin relative shrink-0",
        isPoiHouse(house) && "is-poi",
        !decorated && "is-undecorated",
        hoursKind === "closing" && "is-closing-soon",
        hoursKind === "opening" && "is-opening-soon",
        visited && !skipped && "is-visited",
        skipped && "is-skipped",
        filteredOut && "is-filtered-out",
        className,
      )}
      style={{ background: pinBackgroundFill(house, decorated) }}
      aria-hidden
    >
      {hoursKind ? (
        <PinHoursStatusBadge kind={hoursKind} label={hoursLabel} />
      ) : (
        <>
          {status === "closed" ? <b className="pin-status is-closed" /> : null}
          {status === "break" ? <b className="pin-status is-break" /> : null}
          {status === "plenty" || status === "low" || status === "out" ? (
            <b className={`pin-status is-${status}`} />
          ) : null}
          {skipped ? (
            <b className="pin-status is-skipped" aria-hidden>
              <SkipIcon className="pin-skip-icon" />
            </b>
          ) : null}
        </>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="pin-scare" src={pinScareSrc(house, decorated ? scare : "mild")} alt="" />
    </div>
  );
}

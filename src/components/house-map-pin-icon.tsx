"use client";

import { useCatalog } from "@/hooks/use-catalog";
import { clusterPinStatus } from "@/lib/cluster-pin-status";
import { pinScareSrc } from "@/lib/pin-faces";
import { pinBackgroundFill } from "@/lib/pin-colors";
import { isDecorated } from "@/lib/house-state";
import type { PublicHouse } from "@/lib/types";
import { isPoiHouse } from "@/lib/house-kind";
import { SkipIcon } from "@/components/skip-icon";
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
  const addressReveal = catalog?.eventSettings?.addressReveal;
  const decorated = isDecorated(house);
  const status = clusterPinStatus(house, now, { skipped, addressReveal });
  const scare = house.scareLevel ?? "mild";

  return (
    <div
      className={cn(
        "house-pin cluster-list-pin relative shrink-0",
        isPoiHouse(house) && "is-poi",
        !decorated && "is-undecorated",
        visited && !skipped && "is-visited",
        skipped && "is-skipped",
        filteredOut && "is-filtered-out",
        className,
      )}
      style={{ background: pinBackgroundFill(house, decorated) }}
      aria-hidden
    >
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="pin-scare" src={pinScareSrc(house, decorated ? scare : "mild")} alt="" />
    </div>
  );
}

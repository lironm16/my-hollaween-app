"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { reportHouseTraffic } from "@/hooks/use-house-traffic";
import type { useLikedHouses } from "@/hooks/use-liked-houses";
import type { useVisitedHouses } from "@/hooks/use-visited-houses";

export function useHouseActions(
  likes: ReturnType<typeof useLikedHouses>,
  visits: ReturnType<typeof useVisitedHouses>,
) {
  const cheerTimer = useRef(0);
  const [visitCheer, setVisitCheer] = useState(false);

  useEffect(
    () => () => {
      window.clearTimeout(cheerTimer.current);
    },
    [],
  );

  const onToggleLike = useCallback(
    (id: string) => {
      const nextOn = !likes.liked(id);
      reportHouseTraffic(id, "saved", nextOn);
      likes.toggle(id);
    },
    [likes],
  );

  const onToggleVisited = useCallback(
    (id: string) => {
      const nextOn = !visits.visited(id);
      reportHouseTraffic(id, "visited", nextOn);
      const ids = visits.toggle(id);
      const marking = ids.includes(id);
      if (!marking) return;
      setVisitCheer(false);
      window.clearTimeout(cheerTimer.current);
      window.requestAnimationFrame(() => {
        setVisitCheer(true);
        cheerTimer.current = window.setTimeout(() => setVisitCheer(false), 1600);
      });
    },
    [visits],
  );

  return { onToggleLike, onToggleVisited, visitCheer };
}

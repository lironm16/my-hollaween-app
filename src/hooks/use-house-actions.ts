"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { useLikedHouses } from "@/hooks/use-liked-houses";
import type { useVisitedHouses } from "@/hooks/use-visited-houses";

export type VisitCelebration = "visit" | "route-complete" | "none";

export function useHouseActions(
  likes: ReturnType<typeof useLikedHouses>,
  visits: ReturnType<typeof useVisitedHouses>,
  options?: {
    visitCelebration?: (id: string, nextVisitedIds: string[]) => VisitCelebration;
  },
) {
  const cheerTimer = useRef(0);
  const routeCheerTimer = useRef(0);
  const likeCheerTimer = useRef(0);
  const [visitCheer, setVisitCheer] = useState(false);
  const [routeCompleteCheer, setRouteCompleteCheer] = useState(false);
  const [likeCheer, setLikeCheer] = useState(false);

  useEffect(
    () => () => {
      window.clearTimeout(cheerTimer.current);
      window.clearTimeout(routeCheerTimer.current);
      window.clearTimeout(likeCheerTimer.current);
    },
    [],
  );

  const onToggleLike = useCallback(
    (id: string) => {
      const nextOn = !likes.liked(id);
      likes.toggle(id);
      if (!nextOn) return;
      setLikeCheer(false);
      window.clearTimeout(likeCheerTimer.current);
      window.requestAnimationFrame(() => {
        setLikeCheer(true);
        likeCheerTimer.current = window.setTimeout(() => setLikeCheer(false), 1600);
      });
    },
    [likes],
  );

  const onToggleVisited = useCallback(
    (id: string) => {
      const nextOn = !visits.visited(id);
      const ids = visits.toggle(id);
      const marking = ids.includes(id);
      if (!marking) return;
      const celebration = options?.visitCelebration?.(id, ids) ?? "visit";
      if (celebration === "none") return;
      setVisitCheer(false);
      setRouteCompleteCheer(false);
      window.clearTimeout(cheerTimer.current);
      window.clearTimeout(routeCheerTimer.current);
      window.requestAnimationFrame(() => {
        if (celebration === "route-complete") {
          setRouteCompleteCheer(true);
          routeCheerTimer.current = window.setTimeout(() => setRouteCompleteCheer(false), 2400);
          return;
        }
        setVisitCheer(true);
        cheerTimer.current = window.setTimeout(() => setVisitCheer(false), 1600);
      });
    },
    [options, visits],
  );

  return { onToggleLike, onToggleVisited, visitCheer, routeCompleteCheer, likeCheer };
}

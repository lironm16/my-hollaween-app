"use client";

import { useMemo, useSyncExternalStore } from "react";
import { parseVisitFromSearchParams } from "@/lib/house-visit-qr";
import { ROUTE_SHARE_QUERY } from "@/lib/route-share";

export type HomeUrlParams = {
  focusId: string | null;
  routeShareParam: string | null;
  gemHuntFromUrl: boolean;
  visitFromUrl: boolean;
};

export function parseHomeUrlParams(search: string): HomeUrlParams {
  const params = new URLSearchParams(search);
  return {
    focusId: params.get("focus"),
    routeShareParam: params.get(ROUTE_SHARE_QUERY),
    gemHuntFromUrl: params.get("gemHunt") === "1",
    visitFromUrl: parseVisitFromSearchParams(params),
  };
}

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener("pageshow", onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener("pageshow", onChange);
  };
}

const getSnapshot = () => window.location.search;
const getServerSnapshot = () => null;

/**
 * The service worker may answer `/?focus=…&visit=1` with cached `/` HTML whose server props
 * carry no query, so after hydration the real address bar wins over the server props.
 */
export function useHomeUrlParams(fromServer: HomeUrlParams): HomeUrlParams {
  const search = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { focusId, routeShareParam, gemHuntFromUrl, visitFromUrl } = fromServer;
  return useMemo(
    () =>
      search === null
        ? { focusId, routeShareParam, gemHuntFromUrl, visitFromUrl }
        : parseHomeUrlParams(search),
    [search, focusId, routeShareParam, gemHuntFromUrl, visitFromUrl],
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { reversePin } from "@/components/address-field";
import { config, inNeighborhood } from "@/lib/config";
import { writeHomeView, type HomeView } from "@/lib/home-view";
import type { DistanceOriginChoice, ResolvedOrigin } from "@/lib/distance-origin";

type GeoState = {
  status: string;
  location: { lat: number; lng: number } | null;
  refresh: () => void;
};

export function useOriginPick({
  view,
  origin,
  originChoice,
  setOriginChoice,
  gps,
  gpsAllowed,
  geo,
  askedLocation,
  setAskedLocation,
  pendingRouteGps,
  pinCurrentRoute,
  onBeforePick,
}: {
  view: HomeView;
  origin: ResolvedOrigin;
  originChoice: DistanceOriginChoice;
  setOriginChoice: (choice: DistanceOriginChoice) => void;
  gps: { lat: number; lng: number } | null;
  gpsAllowed: boolean;
  geo: GeoState;
  askedLocation: boolean;
  setAskedLocation: (value: boolean) => void;
  pendingRouteGps: React.MutableRefObject<boolean>;
  pinCurrentRoute: (skipGps?: boolean) => void;
  onBeforePick: () => void;
}) {
  const originPickResumeView = useRef<HomeView | null>(null);
  const geoErrorToasted = useRef(false);
  const outsideBannerTimer = useRef(0);
  const outsideBannerFor = useRef(0);

  const [originPickerOpen, setOriginPickerOpen] = useState(false);
  const [originPickActive, setOriginPickActive] = useState(false);
  const [originDraft, setOriginDraft] = useState<{ lat: number; lng: number } | null>(null);
  const [originDraftLabel, setOriginDraftLabel] = useState("נקודה במפה");
  const [panTo, setPanTo] = useState<{ lat: number; lng: number } | null>(null);
  const [panTick, setPanTick] = useState(0);
  const [outsideBanner, setOutsideBanner] = useState(false);

  const geoError =
    askedLocation &&
    (geo.status === "denied" || geo.status === "error" || geo.status === "unavailable");

  const outsideNeighborhood = Boolean(
    gps && askedLocation && panTick > 0 && !inNeighborhood(gps.lat, gps.lng),
  );

  const routeTicker = originPickActive ? "לחצו על המפה כדי לקבוע נקודת התחלה" : null;

  useEffect(
    () => () => {
      window.clearTimeout(outsideBannerTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!originPickActive || !originDraft) return;
    let cancelled = false;
    void reversePin(originDraft.lat, originDraft.lng).then((hit) => {
      if (!cancelled && hit?.label) setOriginDraftLabel(hit.label);
    });
    return () => {
      cancelled = true;
    };
  }, [originPickActive, originDraft]);

  useEffect(() => {
    if (!outsideNeighborhood) {
      setOutsideBanner(false);
      return;
    }
    if (outsideBannerFor.current === panTick) return;
    outsideBannerFor.current = panTick;
    setOutsideBanner(true);
    window.clearTimeout(outsideBannerTimer.current);
    outsideBannerTimer.current = window.setTimeout(() => setOutsideBanner(false), 4000);
    return () => window.clearTimeout(outsideBannerTimer.current);
  }, [outsideNeighborhood, panTick]);

  useEffect(() => {
    if (!geoError) {
      geoErrorToasted.current = false;
      return;
    }
    if (pendingRouteGps.current) {
      pendingRouteGps.current = false;
      pinCurrentRoute(true);
    }
    if (geoErrorToasted.current) return;
    geoErrorToasted.current = true;
    toast.warning("לא הצלחנו לקרוא מיקום. אשרו גישה למיקום בהגדרות.");
  }, [geoError, pinCurrentRoute, pendingRouteGps]);

  const panMapTo = useCallback((point: { lat: number; lng: number }) => {
    setPanTo(point);
    setPanTick((n) => n + 1);
  }, []);

  const exitOriginPick = useCallback(() => {
    setOriginPickActive(false);
    setOriginDraft(null);
    const resume = originPickResumeView.current;
    originPickResumeView.current = null;
    if (resume === "list") writeHomeView("list");
  }, []);

  const goToMyLocation = useCallback(() => {
    setAskedLocation(true);
    geo.refresh();
    if (originPickActive) {
      if (gps) {
        setOriginDraft({ lat: gps.lat, lng: gps.lng });
        setOriginDraftLabel("המיקום שלכם");
      }
      return;
    }
    if (gps) panMapTo(gps);
  }, [originPickActive, gps, geo, setAskedLocation, panMapTo]);

  const chooseGpsOrigin = useCallback(() => {
    setOriginPickerOpen(false);
    exitOriginPick();
    setOriginChoice({ kind: "gps" });
    setAskedLocation(true);
    geo.refresh();
    if (gps) panMapTo(gps);
  }, [exitOriginPick, setOriginChoice, setAskedLocation, geo, gps, panMapTo]);

  const chooseNeighborhoodOrigin = useCallback(() => {
    setOriginPickerOpen(false);
    exitOriginPick();
    setOriginChoice({ kind: "neighborhood" });
    if (view === "map") {
      panMapTo({ lat: config.map.center.lat, lng: config.map.center.lng });
    }
  }, [exitOriginPick, setOriginChoice, view, panMapTo]);

  const chooseCustomOrigin = useCallback(
    (lat: number, lng: number, label: string) => {
      setOriginPickerOpen(false);
      exitOriginPick();
      setOriginChoice({ kind: "custom", lat, lng, label });
      if (view === "map") panMapTo({ lat, lng });
    },
    [exitOriginPick, setOriginChoice, view, panMapTo],
  );

  const startOriginPick = useCallback(() => {
    setOriginPickerOpen(false);
    originPickResumeView.current = view;
    writeHomeView("map");
    onBeforePick();
    setOriginDraft({ lat: origin.lat, lng: origin.lng });
    setOriginDraftLabel(origin.kind === "custom" ? origin.label : "נקודה במפה");
    setOriginPickActive(true);
  }, [view, onBeforePick, origin]);

  const saveOriginPick = useCallback(async () => {
    if (!originDraft) return;
    let label = originDraftLabel;
    try {
      const hit = await reversePin(originDraft.lat, originDraft.lng);
      if (hit?.label) label = hit.label;
    } catch {
      /* keep draft label */
    }
    setOriginChoice({ kind: "custom", lat: originDraft.lat, lng: originDraft.lng, label });
    exitOriginPick();
  }, [originDraft, originDraftLabel, setOriginChoice, exitOriginPick]);

  const onOriginMapPick = useCallback((lat: number, lng: number) => {
    setOriginDraft({ lat, lng });
    setOriginDraftLabel("נקודה במפה");
  }, []);

  return {
    originPickerOpen,
    setOriginPickerOpen,
    originPickActive,
    originDraft,
    originDraftLabel,
    panTo,
    panTick,
    outsideBanner,
    geoError,
    routeTicker,
    panMapTo,
    goToMyLocation,
    exitOriginPick,
    chooseGpsOrigin,
    chooseNeighborhoodOrigin,
    chooseCustomOrigin,
    startOriginPick,
    saveOriginPick,
    onOriginMapPick,
  };
}

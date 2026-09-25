"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { HouseCard } from "@/components/house-card";
import { houseCardPropsFor, type HouseCardActionContext } from "@/components/house-card-actions";
import { HouseMapDynamic } from "@/components/house-map-dynamic";
import { HouseEditFlowPanels, useHouseEditFlow } from "@/components/house-edit-flow";
import { buttonVariants } from "@/components/ui/button";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useCatalog } from "@/hooks/use-catalog";
import { useLikedHouses } from "@/hooks/use-liked-houses";
import { useOwnedHouses } from "@/hooks/use-owned-houses";
import { useSkippedHouses } from "@/hooks/use-skipped-houses";
import { useVisitedHouses } from "@/hooks/use-visited-houses";
import { useGemProgress } from "@/hooks/use-gem-progress";
import { writeHomeView } from "@/lib/home-view";
import { useUserLocation } from "@/hooks/use-user-location";
import { GemHuntPanelLazy } from "@/components/gem-hunt/gem-hunt-lazy";
import { useAppNow } from "@/hooks/use-app-clock";
import { gemHuntFabVisible, gemHuntVisible } from "@/lib/gem-hunt-enabled";
import { notifyCatalogChanged, saveOwnedHouse } from "@/lib/offline-db";
import { resolveHouseIdFromPath, toPublicHouse } from "@/lib/ids";
import type { House, PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function HousePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = resolveHouseIdFromPath(params.id);
  const { catalog, loading, error, source, refresh } = useCatalog();
  const owned = useOwnedHouses();
  const likes = useLikedHouses();
  const visits = useVisitedHouses();
  const skips = useSkippedHouses();
  const gems = useGemProgress();
  const { admin } = useAdminSession();
  const now = useAppNow();
  const geo = useUserLocation({ watch: gemHuntVisible(admin) });
  const { setWatchEnabled } = geo;
  const editFlow = useHouseEditFlow();
  const [adminHouses, setAdminHouses] = useState<House[]>([]);

  useEffect(() => {
    if (!admin) {
      setAdminHouses([]);
      return;
    }
    let cancelled = false;
    void fetch("/api/admin/houses", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { houses?: House[] }) => {
        if (!cancelled) setAdminHouses(data.houses ?? []);
      })
      .catch(() => {
        if (!cancelled) setAdminHouses([]);
      });
    return () => {
      cancelled = true;
    };
  }, [admin]);

  const ownedItem = owned.find((item) => item.id === id);
  const adminHouse = adminHouses.find((item) => item.id === id);
  const house: PublicHouse | undefined =
    catalog?.houses.find((h) => h.id === id) ??
    (adminHouse ? (toPublicHouse(adminHouse) as PublicHouse) : undefined) ??
    ownedItem?.preview;
  const canEdit = Boolean(admin || ownedItem);
  const editCode = admin ? adminHouse?.editCode : ownedItem?.editCode;
  const missing = !loading && Boolean(catalog) && !house;
  const gemUi = gemHuntFabVisible(admin, now);

  const actionContext = useMemo((): HouseCardActionContext => {
    return {
      admin,
      catalogSource: source,
      liked: likes.liked,
      visited: visits.visited,
      skipped: skips.skipped,
      gemCollected: gemUi ? gems.collected : undefined,
      onToggleLike: (hid) => likes.toggle(hid),
      onToggleVisited: (hid) => visits.toggle(hid),
      onSkip: (hid) => skips.toggle(hid),
      onRestore: (hid) => skips.unskip(hid),
      canEdit: () => canEdit,
      editCodeFor: () => editCode,
      onEdit: (h) =>
        editFlow.openEdit(h, {
          editCode,
          admin,
        }),
      skipMetaFor: (hid) => skips.meta(hid),
      editingId: editFlow.flow?.house.id ?? null,
      onShowOnMap: (hid) => {
        writeHomeView("map");
        router.push(`/?focus=${encodeURIComponent(hid)}`);
      },
    };
  }, [
    admin,
    source,
    likes,
    visits,
    skips,
    gemUi,
    gems,
    canEdit,
    editCode,
    editFlow,
  ]);

  return (
    <div className="relative flex min-h-dvh flex-col">
      <AppHeader />
      <main className="relative z-10 mx-auto w-full max-w-lg flex-1 px-4 py-5">
        {house ? (
          <div className="space-y-4">
            <div className="relative z-0 isolate h-56 overflow-hidden rounded-2xl ring-1 ring-orange-500/30">
              <HouseMapDynamic houses={[house]} selectedId={house.id} embed />
            </div>
            <HouseCard
              {...houseCardPropsFor(house, actionContext, {
                extra:
                  gemUi ? (
                    <GemHuntPanelLazy
                      house={house}
                      userLocation={geo.location}
                      isAdmin={admin}
                      onOpenHunt={async () => {
                        setWatchEnabled(true);
                        return (await geo.refresh()) ?? geo.location;
                      }}
                    />
                  ) : undefined,
              })}
            />
          </div>
        ) : loading ? (
          <p className="text-orange-200">טוענים בית…</p>
        ) : (
          <div className="space-y-3">
            <p className="text-violet-100">
              {error ??
                (missing
                  ? "הבית לא במפה הציבורית. אולי נגמר הערב, או שהקישור ישן."
                  : "לא נמצא.")}
            </p>
            <Link href="/" className={cn(buttonVariants())}>
              חזרה למפה
            </Link>
          </div>
        )}
      </main>
      {house ? (
        <HouseEditFlowPanels
          flow={editFlow.flow}
          setFlow={editFlow.setFlow}
          onClose={editFlow.close}
          onUpdated={(next) => {
            editFlow.setFlow((current) =>
              current?.house.id === next.id ? { ...current, house: next } : current,
            );
            if (!admin && editCode) {
              saveOwnedHouse({
                id: next.id,
                name: next.name,
                editCode,
                preview: next,
              });
            }
            notifyCatalogChanged();
            void refresh(true);
          }}
        />
      ) : null}
    </div>
  );
}

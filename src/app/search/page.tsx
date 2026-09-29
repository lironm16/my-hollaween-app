"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { HouseCard } from "@/components/house-card";
import { houseCardPropsFor, type HouseCardActionContext } from "@/components/house-card-actions";
import { HousePicker } from "@/components/house-picker";
import { HouseEditFlowPanels, useHouseEditFlow } from "@/components/house-edit-flow";
import { Label } from "@/components/ui/label";
import { useAdminHouses } from "@/hooks/use-admin-houses";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useAppNow } from "@/hooks/use-app-clock";
import { useCatalog } from "@/hooks/use-catalog";
import { useHouseSet } from "@/hooks/use-house-set";
import { useMergedHouses } from "@/hooks/use-merged-houses";
import { isPreviewDeploymentClient } from "@/lib/deployment-env";
import { activeHouseSetForSession, houseMatchesSet } from "@/lib/house-set";
import { useGemProgress } from "@/hooks/use-gem-progress";
import { useLikedHouses } from "@/hooks/use-liked-houses";
import { useOwnedHouses } from "@/hooks/use-owned-houses";
import { useSkippedHouses } from "@/hooks/use-skipped-houses";
import { useVisitedHouses } from "@/hooks/use-visited-houses";
import { gemHuntFabVisible } from "@/lib/gem-hunt-enabled";
import { notifyCatalogChanged, removeOwnedHouse, saveOwnedHouse } from "@/lib/offline-db";
import type { PublicHouse } from "@/lib/types";

export default function SearchPage() {
  const router = useRouter();
  const owned = useOwnedHouses();
  const { catalog, loading: catalogLoading, source, refresh } = useCatalog();
  const { admin, ready: adminReady } = useAdminSession();
  const { houseSet } = useHouseSet();
  const likes = useLikedHouses();
  const visits = useVisitedHouses();
  const skips = useSkippedHouses();
  const gems = useGemProgress();
  const now = useAppNow();
  const [picked, setPicked] = useState<PublicHouse | null>(null);
  const editFlow = useHouseEditFlow();
  const { adminHouses } = useAdminHouses({
    admin,
    refresh,
    catalogUpdatedAt: catalog?.updatedAt,
  });
  const activeHouseSet = activeHouseSetForSession(admin, houseSet, catalog, {
    previewDeployment: isPreviewDeploymentClient(),
  });
  const merged = useMergedHouses({
    catalogHouses: catalog?.houses ?? [],
    owned,
    admin,
    adminHouses,
    includeCatalogWhenAdmin: true,
  });
  const houses = useMemo(
    () => merged.filter((house) => houseMatchesSet(house, activeHouseSet)),
    [merged, activeHouseSet],
  );

  useEffect(() => {
    if (!picked || houseMatchesSet(picked, activeHouseSet)) return;
    setPicked(null);
    editFlow.close();
  }, [activeHouseSet, picked, editFlow.close]);

  const gemUi = gemHuntFabVisible(admin, now);
  const actionContext = useMemo((): HouseCardActionContext => {
    return {
      admin,
      catalogSource: source,
      liked: likes.liked,
      visited: visits.visited,
      skipped: skips.skipped,
      gemCollected: gemUi ? gems.collected : undefined,
      onToggleLike: (id) => likes.toggle(id),
      onToggleVisited: (id) => visits.toggle(id),
      onSkip: (id) => skips.toggle(id),
      onRestore: (id) => skips.unskip(id),
      canEdit: (id) => Boolean(admin || owned.some((item) => item.id === id)),
      editCodeFor: (id) =>
        admin
          ? adminHouses.find((item) => item.id === id)?.editCode
          : owned.find((item) => item.id === id)?.editCode,
      onEdit: (house) => {
        const editCode = admin
          ? adminHouses.find((item) => item.id === house.id)?.editCode
          : owned.find((item) => item.id === house.id)?.editCode;
        editFlow.openEdit(house, { editCode, admin, allowDelete: true });
      },
      skipMetaFor: (id) => skips.meta(id),
      editingId: editFlow.flow?.house.id ?? null,
    };
  }, [
    admin,
    source,
    likes,
    visits,
    skips,
    gemUi,
    gems,
    owned,
    adminHouses,
    editFlow.flow?.house.id,
    router,
  ]);

  function selectHouse(next: PublicHouse | null) {
    setPicked(next);
    editFlow.close();
  }

  return (
    <div className="relative flex h-dvh min-h-dvh flex-col overflow-hidden">
      <AppHeader />
      <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto w-full max-w-lg pb-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/banner.jpg"
            alt=""
            className="mb-4 h-28 w-full rounded-2xl object-cover ring-1 ring-orange-500/30"
          />
          <h1 className="font-display mb-1 text-2xl text-orange-300">חיפוש בית</h1>
          <p className="mb-4 text-base text-violet-200">
            בחרו בית מהרשימה — הפרטים יופיעו כאן בכרטיס, כמו ברשימה הראשית.
          </p>
          <div className="mb-4 space-y-1.5 rounded-xl bg-[#1d1028] p-3 ring-1 ring-orange-500/20">
            <Label htmlFor="house-pick">בית</Label>
            <HousePicker
              houses={houses}
              selected={picked}
              onSelect={selectHouse}
              ownedIds={owned.map((item) => item.id)}
              loading={catalogLoading || (admin && !adminReady)}
            />
          </div>
          {!picked ? (
            <p className="text-base text-violet-300">הקלידו שם משפחה או כתובת ובחרו בית.</p>
          ) : (
            <HouseCard {...houseCardPropsFor(picked, actionContext)} />
          )}
        </div>
      </main>
      {picked ? (
        <HouseEditFlowPanels
          flow={editFlow.flow}
          setFlow={editFlow.setFlow}
          onClose={editFlow.close}
          onUpdated={(next) => {
            setPicked(next);
            editFlow.setFlow((current) =>
              current?.house.id === next.id ? { ...current, house: next } : current,
            );
            const editCode = admin
              ? adminHouses.find((item) => item.id === next.id)?.editCode
              : owned.find((item) => item.id === next.id)?.editCode;
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
          onDeleted={(id) => {
            removeOwnedHouse(id);
            selectHouse(null);
            notifyCatalogChanged();
            void refresh(true);
            editFlow.close();
          }}
        />
      ) : null}
    </div>
  );
}

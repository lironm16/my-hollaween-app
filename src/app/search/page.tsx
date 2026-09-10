"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { HouseActionBar } from "@/components/house-action-bar";
import { HouseDetails } from "@/components/house-details";
import { HousePicker } from "@/components/house-picker";
import { HouseEditFlowPanels, useHouseEditFlow } from "@/components/house-edit-flow";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useCatalog } from "@/hooks/use-catalog";
import { useLikedHouses } from "@/hooks/use-liked-houses";
import { useOwnedHouses } from "@/hooks/use-owned-houses";
import { useVisitedHouses } from "@/hooks/use-visited-houses";
import { reportHouseTraffic } from "@/hooks/use-house-traffic";
import { notifyCatalogChanged, removeOwnedHouse, saveOwnedHouse } from "@/lib/offline-db";
import { toPublicHouse } from "@/lib/ids";
import { writeHomeView } from "@/lib/home-view";
import type { House, PublicHouse } from "@/lib/types";

export default function SearchPage() {
  const router = useRouter();
  const owned = useOwnedHouses();
  const { catalog, loading: catalogLoading, source, refresh } = useCatalog();
  const { admin, ready: adminReady } = useAdminSession();
  const likes = useLikedHouses();
  const visits = useVisitedHouses();
  const [adminHouses, setAdminHouses] = useState<House[]>([]);
  const [picked, setPicked] = useState<PublicHouse | null>(null);
  const editFlow = useHouseEditFlow();

  useEffect(() => {
    if (!admin) return;
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

  const houses = useMemo(() => {
    const byId = new Map<string, PublicHouse>();
    for (const item of catalog?.houses ?? []) byId.set(item.id, item);
    for (const item of owned) {
      if (item.preview) byId.set(item.id, item.preview);
    }
    if (admin) {
      for (const item of adminHouses) {
        if (item.status === "rejected") continue;
        byId.set(item.id, toPublicHouse(item) as PublicHouse);
      }
    }
    return [...byId.values()];
  }, [admin, adminHouses, catalog?.houses, owned]);

  const canEdit = Boolean(picked && (admin || owned.some((item) => item.id === picked.id)));
  const editCode = picked
    ? admin
      ? adminHouses.find((item) => item.id === picked.id)?.editCode
      : owned.find((item) => item.id === picked.id)?.editCode
    : undefined;

  function selectHouse(next: PublicHouse | null) {
    setPicked(next);
    editFlow.close();
  }

  return (
    <div className="relative flex min-h-dvh flex-col">
      <AppHeader />
      <main className="relative z-10 mx-auto w-full max-w-lg flex-1 px-4 py-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/banner.jpg"
          alt=""
          className="mb-4 h-28 w-full rounded-2xl object-cover ring-1 ring-orange-500/30"
        />
        <h1 className="font-display mb-1 text-2xl text-orange-300">חיפוש בית</h1>
        <p className="mb-4 text-base text-violet-200">
          בחרו בית מהרשימה. נפתח כרטיס הפרטים, כמו בלחיצה במפה או ברשימה.
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
        {picked ? (
          <Card
            size="sm"
            className="overflow-visible border-orange-500/15 bg-[#1d1028]/90 text-base"
          >
            <div className="house-list-card-chrome">
              <HouseActionBar
                house={picked}
                liked={likes.liked(picked.id)}
                visited={visits.visited(picked.id)}
                onToggleLike={() => {
                  const nextOn = !likes.liked(picked.id);
                  reportHouseTraffic(picked.id, "saved", nextOn);
                  likes.toggle(picked.id);
                }}
                onToggleVisited={() => {
                  const nextOn = !visits.visited(picked.id);
                  reportHouseTraffic(picked.id, "visited", nextOn);
                  visits.toggle(picked.id);
                }}
                onToggleEdit={
                  canEdit && picked
                    ? () =>
                        editFlow.openEdit(picked, {
                          editCode,
                          admin,
                          allowDelete: true,
                        })
                    : undefined
                }
                onShowOnMap={() => {
                  writeHomeView("map");
                  router.push(`/?focus=${encodeURIComponent(picked.id)}`);
                }}
                editing={false}
              />
            </div>
            <div className="px-3 pb-3">
              {picked.status === "pending" ? (
                <p className="mb-3 rounded-lg bg-violet-950/70 px-3 py-2 text-base text-violet-100">
                  {admin
                    ? "בית ממתין לאישור — עדיין לא במפה הציבורית."
                    : "הבית הזה עדיין לא במפה הציבורית. אם זה הבית שלכם, מנהל יכול לאשר אותו."}
                </p>
              ) : null}
              <HouseDetails
                  house={picked}
                  catalogSource={source}
                  liked={likes.liked(picked.id)}
                  onToggleLike={() => {
                    const nextOn = !likes.liked(picked.id);
                    reportHouseTraffic(picked.id, "saved", nextOn);
                    likes.toggle(picked.id);
                  }}
                  visited={visits.visited(picked.id)}
                  onToggleVisited={() => {
                    const nextOn = !visits.visited(picked.id);
                    reportHouseTraffic(picked.id, "visited", nextOn);
                    visits.toggle(picked.id);
                  }}
                  chrome="sheet"
                />
            </div>
          </Card>
        ) : (
          <p className="text-base text-violet-300">הקלידו שם משפחה או כתובת ובחרו בית.</p>
        )}
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

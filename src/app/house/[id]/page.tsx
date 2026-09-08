"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { HouseDetails } from "@/components/house-details";
import { HouseMapDynamic } from "@/components/house-map-dynamic";
import { NightDesk } from "@/components/night-desk";
import { buttonVariants } from "@/components/ui/button";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useCatalog } from "@/hooks/use-catalog";
import { useLikedHouses } from "@/hooks/use-liked-houses";
import { useOwnedHouses } from "@/hooks/use-owned-houses";
import { useVisitedHouses } from "@/hooks/use-visited-houses";
import { notifyCatalogChanged, saveOwnedHouse } from "@/lib/offline-db";
import { reportHouseTraffic } from "@/hooks/use-house-traffic";
import { toPublicHouse } from "@/lib/ids";
import type { House, PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function HousePage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);
  const { catalog, loading, error, source, refresh } = useCatalog();
  const owned = useOwnedHouses();
  const likes = useLikedHouses();
  const visits = useVisitedHouses();
  const { admin } = useAdminSession();
  const [editing, setEditing] = useState(false);
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

  const extra = useMemo(() => {
    if (!house || !editing || !canEdit) return undefined;
    return (
      <NightDesk
        house={house}
        admin={admin}
        editCode={editCode}
        onUpdated={(next) => {
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
    );
  }, [admin, canEdit, editCode, editing, house, refresh]);

  return (
    <div className="relative flex min-h-dvh flex-col">
      <AppHeader />
      <main className="relative z-10 mx-auto w-full max-w-lg flex-1 px-4 py-5">
        {house ? (
          <div className="space-y-4">
            <div className="relative z-0 isolate h-56 overflow-hidden rounded-2xl ring-1 ring-orange-500/30">
              <HouseMapDynamic houses={[house]} selectedId={house.id} />
            </div>
            <HouseDetails
              house={house}
              catalogSource={source}
              liked={likes.liked(house.id)}
              onToggleLike={() => {
                const nextOn = !likes.liked(house.id);
                reportHouseTraffic(house.id, "saved", nextOn);
                likes.toggle(house.id);
              }}
              visited={visits.visited(house.id)}
              onToggleVisited={() => {
                const nextOn = !visits.visited(house.id);
                reportHouseTraffic(house.id, "visited", nextOn);
                visits.toggle(house.id);
              }}
              canEdit={canEdit}
              editing={editing}
              onToggleEdit={() => setEditing((v) => !v)}
              extra={extra}
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
    </div>
  );
}

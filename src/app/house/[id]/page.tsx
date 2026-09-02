"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { HouseDetails } from "@/components/house-details";
import { HouseMapDynamic } from "@/components/house-map-dynamic";
import { buttonVariants } from "@/components/ui/button";
import { useCatalog } from "@/hooks/use-catalog";
import { cn } from "@/lib/utils";

export default function HousePage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);
  const { catalog, loading, error } = useCatalog();
  const house = catalog?.houses.find((h) => h.id === id);
  const missing = !loading && Boolean(catalog) && !house;

  return (
    <div className="relative flex min-h-dvh flex-col">
      <AppHeader />
      <main className="relative z-10 mx-auto w-full max-w-lg flex-1 px-4 py-5">
        {house ? (
          <div className="space-y-4">
            <div className="relative z-0 isolate h-56 overflow-hidden rounded-2xl ring-1 ring-orange-500/30">
              <HouseMapDynamic houses={[house]} selectedId={house.id} />
            </div>
            <HouseDetails house={house} />
          </div>
        ) : loading ? (
          <p className="text-orange-200">טוענים בית…</p>
        ) : (
          <div className="space-y-3">
            <p className="text-violet-100">
              {error ?? (missing ? "הבית לא נמצא במפה. אולי הוא עדיין ממתין לאישור." : "לא נמצא.")}
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

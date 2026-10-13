"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { VisitPosterPanel } from "@/components/visit-poster-panel";
import { useCatalog } from "@/hooks/use-catalog";
import { useOwnedHouses } from "@/hooks/use-owned-houses";
import { resolveHouseIdFromPath } from "@/lib/ids";

export default function VisitPosterPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = resolveHouseIdFromPath(params.id);
  const { catalog, loading } = useCatalog();
  const owned = useOwnedHouses();
  const house = catalog?.houses.find((h) => h.id === id) ?? owned.find((item) => item.id === id)?.preview;

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(`/?focus=${encodeURIComponent(house?.id ?? id)}`);
    }
  };

  return (
    <div className="relative flex h-dvh min-h-dvh flex-col overflow-hidden">
      <AppHeader />
      <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-10">
        <div className="mx-auto w-full max-w-xl">
          {house ? (
            <VisitPosterPanel
              house={house}
              actions={
                <Button type="button" variant="outline" className="gap-1.5 text-lg" onClick={handleBack}>
                  <ArrowRight className="size-5 shrink-0" aria-hidden />
                  חזרה
                </Button>
              }
            />
          ) : (
            <p className="text-orange-200">{loading ? "טוענים…" : "הבית לא נמצא."}</p>
          )}
        </div>
      </main>
    </div>
  );
}

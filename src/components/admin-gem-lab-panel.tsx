"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { HouseMapDynamic } from "@/components/house-map-dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCatalog } from "@/hooks/use-catalog";
import { useGemLabStubs } from "@/hooks/use-gem-lab-stubs";
import { useGemProgress } from "@/hooks/use-gem-progress";
import { useHouseSet } from "@/hooks/use-house-set";
import {
  addGemLabStub,
  gemLabDefaultCenter,
  removeGemLabStub,
} from "@/lib/gem-lab-stubs";
import { gemMonsterForHouse, gemLabelHe } from "@/lib/gem-monsters";
import { notifyCatalogChanged } from "@/lib/offline-db";
import { writeHouseSet } from "@/lib/house-set";
import { cn } from "@/lib/utils";

export function AdminGemLabPanel() {
  const router = useRouter();
  const { catalog } = useCatalog();
  const labStubs = useGemLabStubs();
  const gems = useGemProgress();
  const { houseSet, setHouseSet } = useHouseSet();
  const defaultCenter = gemLabDefaultCenter();
  const [lat, setLat] = useState(defaultCenter.lat);
  const [lng, setLng] = useState(defaultCenter.lng);
  const [name, setName] = useState("");
  const [locating, setLocating] = useState(false);

  const catalogIds = useMemo(
    () => (catalog?.houses ?? []).map((h) => h.id),
    [catalog?.houses],
  );

  const onPick = useCallback((pickLat: number, pickLng: number) => {
    setLat(pickLat);
    setLng(pickLng);
  }, []);

  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("אין GPS במכשיר");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocating(false);
        toast.success("מיקום עודכן");
      },
      () => {
        setLocating(false);
        toast.error("לא הצלחנו לקרוא GPS");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }, []);

  function createStub() {
    const created = addGemLabStub(
      { lat, lng },
      { name: name.trim() || undefined, existingHouseIds: catalogIds },
    );
    if (!created) {
      toast.error("אין מספרי סטאב פנויים — מחקו סטאב ישן");
      return;
    }
    if (houseSet !== "stubs" && houseSet !== "all") {
      writeHouseSet("stubs");
      setHouseSet("stubs");
    }
    notifyCatalogChanged();
    toast.success(`נוסף ${created.name}`);
    setName("");
    router.push(`/house/${encodeURIComponent(created.id)}?gemHunt=1`);
  }

  function deleteStub(id: string) {
    removeGemLabStub(id);
    notifyCatalogChanged();
    toast.message("סטאב הוסר מהמכשיר");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <p className="text-sm text-violet-200">
        סיכה על המפה (או GPS) → שמירה יוצרת <strong className="font-semibold text-orange-100">בית סטאב עם יהלום</strong>{" "}
        רק בטלפון הזה. במפה: סט «סטאבים» או «הכל».
      </p>

      <div className="relative z-0 h-56 shrink-0 overflow-hidden rounded-xl ring-1 ring-violet-400/35 sm:h-64">
        <HouseMapDynamic pickMode pick={{ lat, lng }} onPick={onPick} />
      </div>

      <p className="text-xs text-violet-300" dir="ltr">
        {lat.toFixed(5)}, {lng.toFixed(5)}
      </p>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={useMyLocation} disabled={locating}>
          <MapPin className="size-3.5" aria-hidden />
          {locating ? "מאתרים…" : "המיקום שלי"}
        </Button>
        <Button type="button" size="sm" className="bg-violet-600 text-white hover:bg-violet-500" onClick={createStub}>
          שמור סטאב + יהלום כאן
        </Button>
      </div>

      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="שם (אופציונלי)"
        className="border-violet-500/30 bg-[#12081a]"
      />

      {labStubs.length > 0 ? (
        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-xl bg-black/20 p-2 ring-1 ring-orange-500/15">
          {labStubs.map((house) => {
            const monster = gemMonsterForHouse(house);
            const collected = gems.collected(house.id);
            return (
              <li
                key={house.id}
                className="flex items-center gap-2 rounded-lg bg-[#1a0d24] px-2 py-2 text-sm ring-1 ring-orange-500/10"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-orange-50">{house.name}</p>
                  <p className="truncate text-xs text-violet-300">
                    {house.id} · {gemLabelHe(monster)}
                    {collected ? " · נאסף" : null}
                  </p>
                </div>
                {collected ? (
                  <button
                    type="button"
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                      "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/35",
                    )}
                    onClick={() => {
                      gems.resetHouse(house.id);
                      toast.message("איסוף היהלום בוטל");
                    }}
                  >
                    בטל איסוף
                  </button>
                ) : (
                  <button
                    type="button"
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                      "bg-violet-500/25 text-violet-100 ring-1 ring-violet-400/40",
                    )}
                    onClick={() => {
                      gems.collect(house.id, monster);
                      toast.success("יהלום נאסף (מעבדה)");
                    }}
                  >
                    אסוף יהלום
                  </button>
                )}
                <Link
                  href={`/house/${encodeURIComponent(house.id)}?gemHunt=1`}
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                    "bg-amber-500/20 text-amber-100 ring-1 ring-amber-400/40",
                  )}
                >
                  צוד
                </Link>
                <button
                  type="button"
                  aria-label="מחק סטאב"
                  className="shrink-0 rounded-lg p-2 text-rose-300 hover:bg-rose-950/40"
                  onClick={() => deleteStub(house.id)}
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-violet-400">עדיין אין סטאבי מעבדה במכשיר — גם יש סטאבים בזרע (נק-9313…).</p>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminAddHouseCutoffSettings } from "@/components/admin-add-house-cutoff-settings";
import { AdminAddressRevealSettings } from "@/components/admin-address-reveal-settings";
import { AdminGemOpsPanel } from "@/components/admin-gem-ops-panel";
import { AdminGemHuntPublicSettings } from "@/components/admin-gem-hunt-public-settings";
import { AdminCountdownBannerSettings } from "@/components/admin-countdown-banner-settings";
import { AdminNightPassesSettings } from "@/components/admin-night-passes-settings";
import { AdminHelpDetails, AdminSection } from "@/components/admin-section";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useRehearsalScene, useServerSim } from "@/hooks/use-app-clock";
import { useHouseSet } from "@/hooks/use-house-set";
import { gemHuntVisible } from "@/lib/gem-hunt-enabled";
import {
  CLOCK_EVENT,
  REHEARSAL_LABELS,
  REHEARSAL_SCENES,
  formatCustomRehearsalClock,
  readCustomRehearsalClock,
  readLastRehearsalScene,
  writeCustomRehearsalClock,
  type RehearsalScene,
} from "@/lib/app-clock";
import {
  MAP_LAYER_LABELS,
  type MapDisplayLayer,
} from "@/lib/map-display-layers";
import { Button } from "@/components/ui/button";
import { useCatalog } from "@/hooks/use-catalog";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

const SCENES: RehearsalScene[] = REHEARSAL_SCENES.filter((scene) => scene !== "off");

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <span className={cn("text-sm", on ? "text-orange-200" : "text-violet-400")}>
        {on ? "פועל" : "כבוי"}
      </span>
      <button
        type="button"
        dir="ltr"
        role="switch"
        aria-checked={on}
        onClick={onClick}
        className={cn(
          "flex h-6 w-11 items-center rounded-full p-0.5 transition",
          on ? "justify-end bg-orange-500" : "justify-start bg-violet-900 ring-1 ring-orange-500/20",
        )}
      >
        <span className="size-5 rounded-full bg-white shadow" />
      </button>
    </span>
  );
}

function layerSummary(layers: Record<MapDisplayLayer, boolean>) {
  const active = (["real", "stubs"] as MapDisplayLayer[])
    .filter((id) => layers[id])
    .map((id) => MAP_LAYER_LABELS[id]);
  return active.length ? active.join(" · ") : "לא נבחרה שכבה";
}

export function AdminDryRunPanel() {
  const { admin } = useAdminSession();
  const { catalog } = useCatalog();
  const { scene, setScene } = useRehearsalScene();
  const { down, setDown } = useServerSim();
  const { layers, toggleLayer } = useHouseSet();
  const gemsOnScreen = admin && gemHuntVisible(admin);
  const catalogHouses = useMemo(
    () => (catalog?.houses ?? []) as PublicHouse[],
    [catalog?.houses],
  );
  const [lastScene, setLastScene] = useState<RehearsalScene>("open");
  const [customClock, setCustomClock] = useState("18:00");
  const active = scene !== "off";
  const selectedScene = active ? scene : lastScene;

  useEffect(() => {
    const sync = () => {
      setLastScene(readLastRehearsalScene());
      setCustomClock(formatCustomRehearsalClock(readCustomRehearsalClock()));
    };
    sync();
    window.addEventListener(CLOCK_EVENT, sync);
    return () => window.removeEventListener(CLOCK_EVENT, sync);
  }, []);

  function onToggle(next: boolean) {
    setScene(next ? lastScene : "off");
  }

  const rehearsalSummary = active
    ? REHEARSAL_LABELS[selectedScene]
    : "כבוי — שעון אמיתי";

  return (
    <div className="space-y-2" dir="rtl">
      <AdminSection title="שכבות במפה" summary={layerSummary(layers)}>
        <div className="flex flex-wrap gap-1.5">
          {(["real", "stubs"] as MapDisplayLayer[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => toggleLayer(id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium",
                layers[id]
                  ? "bg-orange-500 text-black"
                  : "bg-[#14081c] text-orange-100 ring-1 ring-orange-500/20",
              )}
            >
              {MAP_LAYER_LABELS[id]}
            </button>
          ))}
        </div>
        <AdminHelpDetails label="מה זה?">
          אפשר לבחור כמה שכבות יחד. ההגדרה נשמרת במכשיר הזה בלבד; הסטטוס מופיע במפה.
        </AdminHelpDetails>
      </AdminSection>

      <AdminSection title="לוח זמנים לאירוע" summary="ספירה לאחור · חיתוך הוספה · חשיפת כתובות · קודי כניסה">
        <div className="space-y-2">
          <AdminCountdownBannerSettings embedded />
          <AdminAddHouseCutoffSettings embedded />
          <AdminAddressRevealSettings embedded />
          <AdminNightPassesSettings embedded />
        </div>
      </AdminSection>

      <AdminSection title="בדיקות במכשיר" summary={`${rehearsalSummary}${down ? " · שרת לא עונה" : ""}`}>
        <div className="flex items-center justify-between gap-3 rounded-lg bg-[#14081c] px-2.5 py-2 ring-1 ring-orange-500/15">
          <p className="text-sm font-medium text-orange-100">שעון בדיקות</p>
          <Toggle on={active} onClick={() => onToggle(!active)} />
        </div>
        <label className={cn("block space-y-1", !active && "opacity-50")}>
          <span className="text-sm text-violet-300">רגע בלילה</span>
          <select
            value={selectedScene}
            disabled={!active}
            onChange={(event) => setScene(event.target.value as RehearsalScene)}
            className="h-9 w-full rounded-md bg-[#14081c] px-2 text-sm text-orange-50 ring-1 ring-orange-500/20 disabled:cursor-not-allowed"
          >
            {SCENES.map((id) => (
              <option key={id} value={id}>
                {REHEARSAL_LABELS[id]}
              </option>
            ))}
          </select>
        </label>
        {selectedScene === "custom" ? (
          <label className={cn("block space-y-1", !active && "opacity-50")}>
            <span className="text-sm text-violet-300">שעה · 31 באוקטובר</span>
            <input
              type="time"
              value={customClock}
              disabled={!active}
              onChange={(event) => {
                const value = event.target.value;
                if (!value) return;
                setCustomClock(value);
                const [hours, minutes] = value.split(":").map(Number);
                writeCustomRehearsalClock({ hours: hours ?? 18, minutes: minutes ?? 0 });
                if (scene !== "custom") setScene("custom");
              }}
              className="filter-time-input h-9 w-full min-h-9 rounded-md bg-[#14081c] px-2 text-sm text-orange-50 ring-1 ring-orange-500/20 disabled:cursor-not-allowed"
            />
          </label>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={down ? "default" : "outline"}
            className={down ? "bg-amber-500 text-black hover:bg-amber-400" : undefined}
            onClick={() => setDown(!down)}
          >
            {down ? "מפסיקים סימולציית שרת" : "השרת לא עונה"}
          </Button>
        </div>
        <AdminHelpDetails label="פרטים">
          <p>
            שעון הבדיקות משפיע רק על המכשיר הזה (באנרים, **נפתח/נסגר בקרוב**, טופס הפסקה). לא משנה את
            חשיפת הכתובות בשרת.
          </p>
          <p className="mt-1">
            קישור מהיר:{" "}
            <span className="text-orange-100" dir="ltr">
              /?rehearsal=open
            </span>
          </p>
          <p className="mt-1">
            **השרת לא עונה** מציג את הבאנר עם הרשימה ששמורה במכשיר — כדאי לפתוח את המפה ברשת פעם אחת לפני
            הבדיקה.
          </p>
        </AdminHelpDetails>
      </AdminSection>

      {gemsOnScreen ? (
        <AdminSection title="שדונים במפה" summary="משחק לאפליקציה · בחירה לפי מפלצת · מפת ניהול">
          <div className="space-y-2">
            <AdminGemHuntPublicSettings embedded />
            {catalogHouses.length > 0 ? <AdminGemOpsPanel houses={catalogHouses} /> : null}
          </div>
        </AdminSection>
      ) : null}
    </div>
  );
}

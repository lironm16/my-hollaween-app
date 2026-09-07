"use client";

import { useEffect, useState } from "react";
import { useRehearsalScene, useServerSim } from "@/hooks/use-app-clock";
import { useHouseSet } from "@/hooks/use-house-set";
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
import { HOUSE_SETS, HOUSE_SET_LABELS, type HouseSet } from "@/lib/house-set";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SCENES: RehearsalScene[] = REHEARSAL_SCENES.filter((scene) => scene !== "off");

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <span className={cn("text-base", on ? "text-orange-200" : "text-violet-400")}>
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

export function AdminDryRunPanel() {
  const { scene, setScene } = useRehearsalScene();
  const { down, setDown } = useServerSim();
  const { houseSet, setHouseSet } = useHouseSet();
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

  return (
    <div className="space-y-3 rounded-xl bg-black/25 p-3">
      <p className="text-base font-medium text-amber-100">בדיקות</p>
      <p className="text-base text-violet-300">
        בלי לחכות ל־31 באוקטובר: בחרו רגע בלילה כדי לראות באנרים, סיכות «נפתח/נסגר בקרוב», ואת כפתורי
        ההפסקה בטופס. נשמר בטלפון הזה בלבד.
      </p>
      <div className="flex items-center justify-between gap-3 rounded-xl bg-[#12081a] px-3 py-2.5 ring-1 ring-orange-500/20">
        <div className="min-w-0">
          <p className="text-base font-medium text-orange-100">שעון בדיקות</p>
          <p className="text-base text-violet-300">מציג את ליל האירוע במכשיר הזה</p>
        </div>
        <Toggle on={active} onClick={() => onToggle(!active)} />
      </div>
      <label className={cn("block space-y-1.5", !active && "opacity-50")}>
        <span className="text-base text-violet-200">רגע בלילה</span>
        <select
          value={selectedScene}
          disabled={!active}
          onChange={(event) => setScene(event.target.value as RehearsalScene)}
          className="h-10 w-full rounded-md bg-[#12081a] px-2 text-base text-orange-50 ring-1 ring-orange-500/20 disabled:cursor-not-allowed"
        >
          {SCENES.map((id) => (
            <option key={id} value={id}>
              {REHEARSAL_LABELS[id]}
            </option>
          ))}
        </select>
      </label>
      {selectedScene === "custom" ? (
        <label className={cn("block space-y-1.5", !active && "opacity-50")}>
          <span className="text-base text-violet-200">שעה מותאמת · 31 באוקטובר</span>
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
            className="h-10 w-full rounded-md bg-[#12081a] px-2 text-base text-orange-50 ring-1 ring-orange-500/20 disabled:cursor-not-allowed"
          />
        </label>
      ) : null}
      <p className="text-base text-violet-300">
        קישור ישיר:{" "}
        <span className="text-orange-100" dir="ltr">
          /?rehearsal=open
        </span>
      </p>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          variant={down ? "default" : "outline"}
          className={down ? "bg-amber-500 text-black hover:bg-amber-400" : undefined}
          onClick={() => setDown(!down)}
        >
          {down ? "מפסיקים את סימולציית השרת" : "השרת לא עונה"}
        </Button>
        <p className="text-base text-violet-300">
          מציג את הבאנר «השרת לא עונה» עם הרשימה ששמורה בטלפון. פתחו את המפה פעם אחת ברשת לפני כן.
        </p>
      </div>
      <div className="space-y-2 border-t border-orange-500/15 pt-3">
        <p className="text-base font-medium text-amber-100">איזה בתים להציג</p>
        <p className="text-base text-violet-300">
          סטאבים לחזרה או בתים אמיתיים. הבחירה נשמרת בטלפון הזה, והסטטוס מופיע במפה וברשימה.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {HOUSE_SETS.map((id: HouseSet) => (
            <button
              key={id}
              type="button"
              onClick={() => setHouseSet(id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-base",
                houseSet === id
                  ? "bg-orange-500 text-black"
                  : "bg-[#12081a] text-orange-100 ring-1 ring-orange-500/20",
              )}
            >
              {HOUSE_SET_LABELS[id]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

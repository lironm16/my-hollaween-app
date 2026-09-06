"use client";

import { useRehearsalScene, useServerSim } from "@/hooks/use-app-clock";
import { REHEARSAL_LABELS, REHEARSAL_SCENES, type RehearsalScene } from "@/lib/app-clock";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SCENES: RehearsalScene[] = REHEARSAL_SCENES.filter((scene) => scene !== "off");

export function AdminDryRunPanel() {
  const { scene, setScene } = useRehearsalScene();
  const { down, setDown } = useServerSim();

  return (
    <div className="space-y-3 rounded-xl bg-black/25 p-3">
      <p className="text-base font-medium text-amber-100">בדיקות</p>
      <p className="text-base text-violet-300">
        בלי לחכות ל־31 באוקטובר: בחרו רגע בלילה כדי לראות באנרים, סיכות «נפתח/נסגר בקרוב», ואת כפתורי
        ההפסקה בטופס. נשמר בטלפון הזה בלבד.
      </p>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setScene("off")}
          className={cn(
            "rounded-full px-3 py-1.5 text-base",
            scene === "off"
              ? "bg-orange-500 text-black"
              : "bg-[#12081a] text-orange-100 ring-1 ring-orange-500/20",
          )}
        >
          שעון אמיתי
        </button>
        {SCENES.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setScene(id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-base",
              scene === id
                ? "bg-orange-500 text-black"
                : "bg-[#12081a] text-orange-100 ring-1 ring-orange-500/20",
            )}
          >
            {REHEARSAL_LABELS[id]}
          </button>
        ))}
      </div>
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
    </div>
  );
}

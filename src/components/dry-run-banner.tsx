"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRehearsalScene, useServerSim } from "@/hooks/use-app-clock";
import { REHEARSAL_LABELS } from "@/lib/app-clock";
import { cn } from "@/lib/utils";

export function DryRunBanner() {
  const pathname = usePathname();
  const { scene, setScene } = useRehearsalScene();
  const { down, setDown } = useServerSim();
  if (pathname?.startsWith("/admin")) return null;
  if (scene === "off" && !down) return null;

  return (
    <div
      className={cn(
        "relative z-40 px-3 py-2 text-center text-base",
        down ? "bg-amber-950 text-amber-50" : "bg-cyan-950 text-cyan-50",
      )}
    >
      <p>
        {down ? "חזרה כללית: השרת לא עונה" : `חזרה כללית: ${REHEARSAL_LABELS[scene]}`}
        {" · "}
        <Link href="/admin/rehearsal" className="underline underline-offset-2">
          הגדרות
        </Link>
        {" · "}
        <button
          type="button"
          className="underline underline-offset-2"
          onClick={() => {
            setScene("off");
            setDown(false);
          }}
        >
          יציאה
        </button>
      </p>
    </div>
  );
}

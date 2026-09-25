"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { gemMonsterMeta, type GemMonsterId } from "@/lib/gem-monsters";
import { cn } from "@/lib/utils";

/** Lands a new sticker on the real album page (after /gem-bag?fly=). */
export function GemStickerFlyFromCollect({ monsterId }: { monsterId: GemMonsterId }) {
  const [phase, setPhase] = useState<"fly" | "done">("fly");
  const meta = gemMonsterMeta(monsterId);

  useEffect(() => {
    const slot = document.querySelector<HTMLElement>(
      `[data-gem-sticker-slot="${monsterId}"]`,
    );
    if (!slot) {
      setPhase("done");
      return;
    }
    slot.scrollIntoView({ block: "center", behavior: "auto" });
    const frame = slot.querySelector<HTMLElement>(".gem-sticker-slot__frame");
    const target = frame ?? slot;
    const rect = target.getBoundingClientRect();
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight * 0.38;
    const tx = rect.left + rect.width / 2;
    const ty = rect.top + rect.height / 2;
    const root = document.documentElement;
    root.style.setProperty("--gem-fly-dx", `${tx - cx}px`);
    root.style.setProperty("--gem-fly-dy", `${ty - cy}px`);
    root.style.setProperty("--gem-fly-scale", `${Math.min(rect.width / 220, 0.72)}`);
    const done = window.setTimeout(() => {
      setPhase("done");
      root.style.removeProperty("--gem-fly-dx");
      root.style.removeProperty("--gem-fly-dy");
      root.style.removeProperty("--gem-fly-scale");
      slot.classList.add("is-just-placed");
    }, 1100);
    return () => window.clearTimeout(done);
  }, [monsterId]);

  if (phase === "done") return null;

  return (
    <div className="gem-sticker-fly-from-collect" aria-hidden>
      <Image
        src={meta.posterPath}
        alt=""
        width={220}
        height={220}
        className={cn("gem-sticker-fly-from-collect__art", phase === "fly" && "is-flying")}
        priority
      />
    </div>
  );
}

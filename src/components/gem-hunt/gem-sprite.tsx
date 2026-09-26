"use client";

import Image from "next/image";
import { GemModel3D } from "@/components/gem-hunt/gem-model-3d";
import { gemMonsterForHouse, gemMonsterMeta, type GemMonsterId } from "@/lib/gem-monsters";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

export function GemSprite({
  variantId,
  houseId,
  house,
  collected = false,
  className,
  size = "lg",
  mode = "auto",
  /** Center «גלה לי» — no spin/drag; parent button handles tap to collect. */
  tapCollect = false,
  spinWhileCollect = true,
  motion = "idle",
  celebrateVariant = 1,
  /** Square poster frame (map collect cheer). */
  posterFill = false,
}: {
  /** @deprecated use house + monster id */
  variantId?: string;
  houseId?: string;
  house?: Pick<PublicHouse, "id" | "theme" | "kind">;
  collected?: boolean;
  className?: string;
  size?: "sm" | "lg";
  /** bag rows use poster; hunt uses 3d; orbit is for gem-bag studio only */
  mode?: "auto" | "3d" | "poster" | "orbit";
  tapCollect?: boolean;
  spinWhileCollect?: boolean;
  motion?: "idle" | "celebrate";
  celebrateVariant?: number;
  posterFill?: boolean;
}) {
  const id = house?.id ?? houseId ?? "default";
  const monsterId = (house ? gemMonsterForHouse(house) : "dragon") as GemMonsterId;
  const meta = gemMonsterMeta(monsterId);
  const use3d = mode === "3d" || mode === "orbit" || (mode === "auto" && size === "lg");

  if (!use3d) {
    return (
      <div
        className={cn(
          "gem-sprite gem-sprite--poster",
          size === "sm" && "gem-sprite--sm",
          posterFill && "gem-sprite--poster-fill",
          collected && "is-collected",
          className,
        )}
      >
        {posterFill ? (
          <Image
            src={meta.posterPath}
            alt=""
            fill
            sizes="(max-width: 480px) 88vw, 21rem"
            className="gem-sprite__poster"
          />
        ) : (
          <Image
            src={meta.posterPath}
            alt=""
            width={size === "sm" ? 52 : 96}
            height={size === "sm" ? 52 : 96}
            className="gem-sprite__poster"
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "gem-sprite",
        size === "sm" && "gem-sprite--sm",
        mode === "3d" && "gem-sprite--hunt",
        collected && "is-collected",
        motion === "celebrate" && "is-celebrating",
        className,
      )}
    >
      <span className="gem-sprite__glow" aria-hidden />
      <GemModel3D
        monsterId={monsterId}
        houseId={id}
        size={mode === "orbit" ? "fill" : size}
        collected={collected}
        interactive={!tapCollect}
        spin={spinWhileCollect || motion === "celebrate"}
        spinRate={tapCollect && motion !== "celebrate" ? 0.35 : undefined}
        controls={mode === "orbit" ? "orbit" : "turntable"}
        motion={motion}
        celebrateVariant={celebrateVariant}
      />
    </div>
  );
}

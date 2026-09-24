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
          collected && "is-collected",
          className,
        )}
      >
        <Image
          src={meta.posterPath}
          alt=""
          width={size === "sm" ? 52 : 96}
          height={size === "sm" ? 52 : 96}
          className="gem-sprite__poster"
        />
      </div>
    );
  }

  return (
    <GemModel3D
      monsterId={monsterId}
      houseId={id}
      size={mode === "orbit" ? "fill" : size}
      collected={collected}
      className={className}
      interactive
      controls={mode === "orbit" ? "orbit" : "turntable"}
    />
  );
}

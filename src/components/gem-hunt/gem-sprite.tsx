"use client";

import Image from "next/image";
import { GemModel3D } from "@/components/gem-hunt/gem-model-3d";
import { gemMonsterForHouse, gemMonsterMeta, type GemMonsterId } from "@/lib/gem-monsters";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

export function GemSprite({
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
  worldYawRad = null,
  onInspectTap,
}: {
  /** @deprecated use house + monster id */
  variantId?: string;
  houseId?: string;
  house?: Pick<PublicHouse, "id" | "theme" | "kind">;
  collected?: boolean;
  className?: string;
  size?: "sm" | "lg" | "fill";
  /** bag rows use poster; hunt uses 3d; orbit is for gem-bag studio only */
  mode?: "auto" | "3d" | "poster" | "orbit" | "walkaround" | "inspect360";
  tapCollect?: boolean;
  spinWhileCollect?: boolean;
  motion?: "idle" | "celebrate";
  celebrateVariant?: number;
  posterFill?: boolean;
  /** World-locked yaw (radians) — walk around anchor to see different sides. */
  worldYawRad?: number | null;
  onInspectTap?: () => void;
}) {
  const id = house?.id ?? houseId ?? "default";
  const monsterId = (house ? gemMonsterForHouse(house) : "dragon") as GemMonsterId;
  const meta = gemMonsterMeta(monsterId);
  const use3d =
    mode === "3d" ||
    mode === "orbit" ||
    mode === "walkaround" ||
    mode === "inspect360" ||
    (mode === "auto" && size === "lg");
  const modelControls =
    mode === "orbit"
      ? "orbit"
      : mode === "walkaround"
        ? "walkaround"
        : mode === "inspect360"
          ? "inspect360"
          : "turntable";
  const modelSpin =
    mode === "walkaround" || mode === "inspect360"
      ? false
      : spinWhileCollect || motion === "celebrate";

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
        mode === "inspect360" && "gem-sprite--inspect360",
        size === "fill" && "gem-sprite--fill",
        collected && "is-collected",
        motion === "celebrate" && "is-celebrating",
        className,
      )}
    >
      <span className="gem-sprite__glow" aria-hidden />
      <GemModel3D
        monsterId={monsterId}
        houseId={id}
        size={mode === "orbit" || mode === "inspect360" ? "fill" : size === "fill" ? "fill" : size}
        collected={collected}
        interactive={mode === "inspect360" ? true : !tapCollect}
        spin={modelSpin}
        spinRate={tapCollect && motion !== "celebrate" ? 0.35 : undefined}
        controls={modelControls}
        motion={motion}
        celebrateVariant={celebrateVariant}
        worldYawRad={worldYawRad}
        onInspectTap={mode === "inspect360" ? onInspectTap : undefined}
      />
    </div>
  );
}

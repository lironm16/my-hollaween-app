"use client";

import { useSearchParams } from "next/navigation";
import { GemStickerFlyFromCollect } from "@/components/gem-hunt/gem-sticker-fly-from-collect";
import { gemAlbumStickerPool, type GemMonsterId } from "@/lib/gem-monsters";

export function GemBagCollectFlyGate() {
  const searchParams = useSearchParams();
  const raw = searchParams.get("fly");
  const pool = gemAlbumStickerPool();
  const monsterId = pool.find((entry) => entry.id === raw)?.id as GemMonsterId | undefined;
  if (!monsterId) return null;
  return <GemStickerFlyFromCollect monsterId={monsterId} />;
}

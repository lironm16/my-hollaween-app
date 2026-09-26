"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GemStickerFlyFromCollect } from "@/components/gem-hunt/gem-sticker-fly-from-collect";
import { GemBagMilestoneCelebration } from "@/components/gem-hunt/gem-bag-milestone-celebration";
import { parseGemBagCelebrate, type GemBagCelebrateKind } from "@/lib/gem-bag-celebrate";
import { gemAlbumStickerPool, type GemMonsterId } from "@/lib/gem-monsters";

export function GemBagCollectFlyGate() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const raw = searchParams.get("fly");
  const pool = gemAlbumStickerPool();
  const monsterId = pool.find((entry) => entry.id === raw)?.id as GemMonsterId | undefined;
  const celebrateKind = parseGemBagCelebrate(searchParams.get("celebrate"));
  const [flyDone, setFlyDone] = useState(false);
  const [milestoneDone, setMilestoneDone] = useState(!celebrateKind);

  const clearCelebrateFromUrl = useCallback(() => {
    if (!monsterId) return;
    router.replace(`/gem-bag?fly=${monsterId}`, { scroll: false });
  }, [monsterId, router]);

  const onMilestoneDone = useCallback(() => {
    setMilestoneDone(true);
    clearCelebrateFromUrl();
  }, [clearCelebrateFromUrl]);

  if (!monsterId) return null;

  return (
    <>
      {!flyDone ? (
        <GemStickerFlyFromCollect monsterId={monsterId} onComplete={() => setFlyDone(true)} />
      ) : null}
      {flyDone && celebrateKind && !milestoneDone ? (
        <GemBagMilestoneCelebration kind={celebrateKind} onDone={onMilestoneDone} />
      ) : null}
    </>
  );
}

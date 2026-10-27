"use client";

import { useLocale } from "@/hooks/use-locale";

export function NeighborhoodStatusBanners({
  outsideBanner,
  offline,
  unreachable,
  error,
  hasCachedHouses,
}: {
  outsideBanner: boolean;
  offline: boolean;
  unreachable: boolean;
  error: string | null;
  hasCachedHouses: boolean;
}) {
  const { t } = useLocale();

  return (
    <>
      {outsideBanner ? (
        <div
          role="status"
          className="relative z-30 bg-amber-950 px-3 py-2 text-center text-base text-amber-50"
        >
          {t("banners.outsideNeighborhood")}
        </div>
      ) : null}
      {offline || unreachable ? (
        <div className="relative z-30 bg-[#2a1638] px-3 py-2 text-center text-base text-amber-100 ring-1 ring-inset ring-amber-500/20">
          {offline
            ? hasCachedHouses
              ? t("banners.offlineCached")
              : t("banners.offlineNoCache")
            : hasCachedHouses
              ? t("banners.serverCached")
              : t("banners.serverNoCache")}
        </div>
      ) : error ? (
        <div className="relative z-30 bg-red-950/70 px-3 py-2 text-center text-base text-red-100">
          {error}
        </div>
      ) : null}
    </>
  );
}

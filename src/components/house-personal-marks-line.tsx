"use client";

/** Compact «אהבתי» / «יהלום» line under house title (list + sheet). */
export function HousePersonalMarksLine({
  liked,
  gemCollected,
}: {
  liked?: boolean;
  gemCollected?: boolean;
}) {
  if (!liked && !gemCollected) return null;
  return (
    <p className="text-sm font-semibold leading-snug text-violet-200">
      {liked ? <span className="text-rose-300">אהבתי</span> : null}
      {liked && gemCollected ? <span aria-hidden> · </span> : null}
      {gemCollected ? <span className="text-amber-300">יהלום נאסף</span> : null}
    </p>
  );
}

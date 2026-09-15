import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterSign, SkipSign } from "@/components/visit-marks";
import { skipMetaSummary } from "@/lib/skip-reasons";
import type { SkippedHouseMeta } from "@/lib/offline-db";

export function HouseSkippedBanner({
  meta,
  onRestore,
}: {
  meta?: SkippedHouseMeta;
  onRestore?: () => void;
}) {
  const summary = meta ? skipMetaSummary(meta) : "דילגתם על הבית";
  return (
    <div className="route-skipped-row house-skipped-banner" role="status">
      <div className="route-skipped-main">
        <SkipSign />
        <span className="route-skipped-name">{summary}</span>
      </div>
      {onRestore ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="route-skipped-restore shrink-0"
          onClick={onRestore}
        >
          <Undo2 className="size-3.5" />
          החזרה
        </Button>
      ) : null}
    </div>
  );
}

export function FilterMismatchNotice({
  reasons,
  skipMeta,
  onRestoreRoute,
}: {
  reasons?: string[];
  skipMeta?: SkippedHouseMeta;
  onRestoreRoute?: () => void;
}) {
  if (!reasons?.length && !skipMeta) return null;
  const skipped = reasons?.includes("דילגתם על הבית") || Boolean(skipMeta);
  const other = (reasons ?? []).filter((reason) => reason !== "דילגתם על הבית");
  return (
    <>
      {skipped ? <HouseSkippedBanner meta={skipMeta} onRestore={onRestoreRoute} /> : null}
      {other.length > 0 ? (
        <p className="filter-mismatch-banner" role="status">
          <FilterSign />
          <span className="filter-mismatch-banner-text">
            מסונן: {other.join(" · ")}
          </span>
        </p>
      ) : null}
    </>
  );
}

import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterSign, SkipSign, VisitedSign } from "@/components/visit-marks";
import { skipMetaSummary } from "@/lib/skip-reasons";
import type { SkippedHouseMeta } from "@/lib/offline-db";

export function HouseSkippedBanner({
  meta,
  onRestore,
  onMainClick,
  mainAriaLabel,
}: {
  meta?: SkippedHouseMeta;
  onRestore?: () => void;
  onMainClick?: () => void;
  mainAriaLabel?: string;
}) {
  const summary = meta ? skipMetaSummary(meta) : "דילגתם על הבית";
  const mainContent = (
    <>
      <SkipSign />
      <span className="route-skipped-name">{summary}</span>
    </>
  );
  return (
    <div className="route-skipped-row house-skipped-banner" role="status">
      {onMainClick ? (
        <button
          type="button"
          className="route-skipped-main"
          onClick={onMainClick}
          aria-label={mainAriaLabel ?? summary}
        >
          {mainContent}
        </button>
      ) : (
        <div className="route-skipped-main">{mainContent}</div>
      )}
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

/** Visited / skipped status row — show on every house card surface. */
export function HouseCardBanners({
  skipped,
  skipMeta,
  visited,
  onRestoreRoute,
  onToggleVisited,
}: {
  skipped?: boolean;
  skipMeta?: SkippedHouseMeta;
  visited?: boolean;
  onRestoreRoute?: () => void;
  onToggleVisited?: () => void;
}) {
  return (
    <>
      {skipped ? <HouseSkippedBanner meta={skipMeta} onRestore={onRestoreRoute} /> : null}
      {visited && !skipped ? <HouseVisitedBanner onRestore={onToggleVisited} /> : null}
    </>
  );
}

export function HouseVisitedBanner({
  onRestore,
}: {
  onRestore?: () => void;
}) {
  return (
    <div className="route-skipped-row house-skipped-banner" role="status">
      <div className="route-skipped-main">
        <VisitedSign />
        <span className="route-skipped-name">ביקרתם</span>
      </div>
      {onRestore ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="route-skipped-restore shrink-0"
          onClick={(event) => {
            event.stopPropagation();
            onRestore();
          }}
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
  hideSkipBanner = false,
}: {
  reasons?: string[];
  skipMeta?: SkippedHouseMeta;
  onRestoreRoute?: () => void;
  /** When house skip/visit banners render separately via HouseCardBanners. */
  hideSkipBanner?: boolean;
}) {
  if (!reasons?.length && !skipMeta) return null;
  const skipped = reasons?.includes("דילגתם על הבית") || Boolean(skipMeta);
  const other = (reasons ?? []).filter((reason) => reason !== "דילגתם על הבית");
  return (
    <>
      {skipped && !hideSkipBanner ? (
        <HouseSkippedBanner meta={skipMeta} onRestore={onRestoreRoute} />
      ) : null}
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

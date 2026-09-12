import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SkipSign } from "@/components/visit-marks";

export function HouseSkippedBanner({ onRestore }: { onRestore?: () => void }) {
  return (
    <div className="route-skipped-row house-skipped-banner" role="status">
      <div className="route-skipped-main">
        <SkipSign />
        <span className="route-skipped-name">דילגתם על הבית</span>
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
  onRestoreRoute,
}: {
  reasons?: string[];
  onRestoreRoute?: () => void;
}) {
  if (!reasons?.length) return null;
  const skipped = reasons.includes("דילגתם על הבית");
  const other = reasons.filter((reason) => reason !== "דילגתם על הבית");
  return (
    <>
      {skipped ? <HouseSkippedBanner onRestore={onRestoreRoute} /> : null}
      {other.length > 0 ? (
        <p className="filter-mismatch-banner" role="status">
          מסונן: {other.join(" · ")}
        </p>
      ) : null}
    </>
  );
}

"use client";

export function VisitCheer({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="visit-cheer" role="status" aria-live="polite">
      <div className="visit-cheer-card">
        <span className="visit-cheer-burst" aria-hidden="true">
          <i /><i /><i /><i /><i /><i />
        </span>
        <span className="visit-cheer-check" aria-hidden="true" />
        כל הכבוד!
      </div>
    </div>
  );
}
